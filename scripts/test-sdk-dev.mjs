import { spawn } from "node:child_process";
import https from "node:https";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const proxyUrl = "https://127.0.0.1:8080/";
const sdkUrl = "https://127.0.0.1:8080/sdk.js";
const timeoutMs = 120000;

function spawnCommand(command, args, options = {}) {
  if (process.platform !== "win32") return spawn(command, args, options);
  const shellCommand = [command, ...args].join(" ");
  return spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", shellCommand], {
    ...options,
    windowsHide: true
  });
}

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      env: { ...process.env, ...env },
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

function probe(url) {
  return new Promise((resolve) => {
    const request = https.get(url, { rejectUnauthorized: false }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(1000, () => request.destroy());
    request.on("error", () => resolve(false));
  });
}

async function waitForProxy() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await probe(proxyUrl) && await probe(sdkUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the Yandex SDK dev proxy at " + sdkUrl);
}

function stopTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}

const proxy = spawnCommand(npm, ["run", "sdk:dev"], {
  env: { ...process.env },
  stdio: "inherit"
});

try {
  await waitForProxy();
  const result = await run(npm, ["exec", "--", "playwright", "test", "--config=playwright.sdk.config.mjs"], {
    PLAYWRIGHT_BASE_URL: "https://127.0.0.1:8080"
  });
  if (result.code !== 0) process.exitCode = result.code || 1;
} finally {
  stopTree(proxy);
}
