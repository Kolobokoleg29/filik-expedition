import assert from "node:assert/strict";
import test from "node:test";
import {
  ASSET_MANIFEST,
  artifactAsset,
  backgroundAsset,
  captainAsset,
  chapterAsset,
  companionAsset,
  uiAsset
} from "../../src/asset-manifest.js";

test("resolves canonical asset manifest categories", () => {
  assert.equal(ASSET_MANIFEST.chapters.length, 38);
  assert.equal(Object.keys(ASSET_MANIFEST.artifacts.files).length, 38);
  assert.equal(Object.keys(ASSET_MANIFEST.captains.files).length, 8);
  assert.deepEqual([...ASSET_MANIFEST.companions.poses], ["calm", "expedition", "happy", "support", "surprise", "victory"]);
  assert.equal(backgroundAsset("campWide"), "./assets/UI/wide-ai/camp_intro.webp");
  assert.equal(chapterAsset(27, "wide"), "./assets/UI/wide-ai/lost_express.webp");
  assert.equal(artifactAsset(1), "./assets/UI/artifacts/old_journal.png");
  assert.equal(captainAsset("captain-eternal"), "./assets/UI/captains/captain-eternal.png");
  assert.equal(companionAsset("owl", "victory"), "./assets/UI/companions/owl-victory.png");
  assert.equal(uiAsset("reward_artifact.png"), "./assets/UI/reward_artifact.png");
});