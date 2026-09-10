import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const dist = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
const required = [
  "index.html",
  "levels.json",
  "endless-levels.json",
  "build.json",
  "live-config.json",
  "assets/UI/app_icon.png"
];
const errors = [];

function walk(directory, base = directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      errors.push("Symlink is not allowed in dist: " + path.relative(base, full));
    } else if (entry.isDirectory()) {
      files.push(...walk(full, base));
    } else if (entry.isFile()) {
      files.push({ full, relative: path.relative(base, full).replaceAll(path.sep, "/") });
    } else {
      errors.push("Unsupported filesystem entry in dist: " + path.relative(base, full));
    }
  }
  return files;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: 0, date: 0 };
  const year = Math.max(1980, Math.min(2107, date.getUTCFullYear()));
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate()
  };
}

function localHeader(name, method, crc, compressedSize, size, stamp) {
  const encodedName = Buffer.from(name, "utf8");
  const header = Buffer.alloc(30 + encodedName.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x800, 6);
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(stamp.time, 10);
  header.writeUInt16LE(stamp.date, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(encodedName.length, 26);
  header.writeUInt16LE(0, 28);
  encodedName.copy(header, 30);
  return header;
}

function centralHeader(entry) {
  const encodedName = Buffer.from(entry.name, "utf8");
  const header = Buffer.alloc(46 + encodedName.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x800, 8);
  header.writeUInt16LE(entry.method, 10);
  header.writeUInt16LE(entry.stamp.time, 12);
  header.writeUInt16LE(entry.stamp.date, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.compressedSize, 20);
  header.writeUInt32LE(entry.size, 24);
  header.writeUInt16LE(encodedName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(entry.offset, 42);
  encodedName.copy(header, 46);
  return header;
}

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  errors.push("dist does not exist. Run npm run build first.");
} else {
  for (const file of required) {
    const full = path.join(dist, file);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile() || fs.statSync(full).size === 0) {
      errors.push("Missing or empty release output: " + file);
    }
  }
}

if (errors.length) {
  console.error("Release packaging failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  const files = walk(dist);
  if (errors.length) {
    console.error("Release packaging failed:");
    for (const error of errors) console.error("- " + error);
    process.exitCode = 1;
  } else {
    const build = JSON.parse(fs.readFileSync(path.join(dist, "build.json"), "utf8"));
    const stamp = dosDateTime(build.buildDate);
    const chunks = [];
    const entries = [];
    let offset = 0;

    for (const file of files) {
      const data = fs.readFileSync(file.full);
      const compressed = zlib.deflateRawSync(data, { level: 9 });
      const method = compressed.length < data.length ? 8 : 0;
      const payload = method === 8 ? compressed : data;
      const crc = crc32(data);
      const header = localHeader(file.relative, method, crc, payload.length, data.length, stamp);
      chunks.push(header, payload);
      entries.push({
        name: file.relative,
        method,
        crc,
        compressedSize: payload.length,
        size: data.length,
        stamp,
        offset
      });
      offset += header.length + payload.length;
    }

    const centralOffset = offset;
    const central = entries.map(centralHeader);
    const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
    const footer = Buffer.alloc(22);
    footer.writeUInt32LE(0x06054b50, 0);
    footer.writeUInt16LE(0, 4);
    footer.writeUInt16LE(0, 6);
    footer.writeUInt16LE(entries.length, 8);
    footer.writeUInt16LE(entries.length, 10);
    footer.writeUInt32LE(centralSize, 12);
    footer.writeUInt32LE(centralOffset, 16);
    footer.writeUInt16LE(0, 20);

    fs.mkdirSync(artifacts, { recursive: true });
    const output = path.join(artifacts, "filik-expedition-v" + build.version + ".zip");
    const temporary = output + "." + process.pid + ".tmp";
    try {
      fs.writeFileSync(temporary, Buffer.concat([...chunks, ...central, footer]));
      if (fs.existsSync(output)) fs.unlinkSync(output);
      fs.renameSync(temporary, output);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }

    const size = fs.statSync(output).size;
    console.log("Release package created: " + path.relative(root, output).replaceAll(path.sep, "/") + " (" + entries.length + " files, " + size + " bytes).");
  }
}
