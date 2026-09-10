import { ASSET_MANIFEST } from "./asset-manifest.js";

export const wideChapterDir = (name) => {
  const chapter = ASSET_MANIFEST.chapters.find((entry) => entry.file === name);
  return chapter?.wide?.split("/")[0] || "chapters-wide-hd";
};
