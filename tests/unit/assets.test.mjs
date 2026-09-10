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

test("resolves authored decorative illustration assets", () => {
  assert.equal(ASSET_MANIFEST.ui.icons.routeCompass, "meta/route_compass_styled");
  assert.equal(ASSET_MANIFEST.ui.icons.routeMap, "meta/route_map_styled");
  assert.equal(ASSET_MANIFEST.ui.icons.routeCampfire, "meta/route_campfire_styled");
  assert.equal(ASSET_MANIFEST.ui.icons.routeLocked, "meta/route_locked_styled");
  assert.equal(ASSET_MANIFEST.ui.icons.tutorialHand, "meta/tutorial_hand_styled");
});
