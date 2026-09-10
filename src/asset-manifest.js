import { CHAPTER_IMAGES } from "./chapter-images.js";
import { ARTIFACT_IMAGES } from "./artifact-images.js";

const chapter = (id, file) => Object.freeze({
  id,
  file,
  portrait: "chapters/" + file,
  wide: "wide-ai/" + file
});

export const ASSET_MANIFEST = Object.freeze({
  ui: Object.freeze({
    icons: Object.freeze({
      owlPortrait: "companions/owl-calm",
      foxPortrait: "companions/fox-calm",
      captainPortrait: "captain_portrait",
      rewardCoin: "reward_coin",
      rewardHeart: "reward_heart",
      rewardStar: "reward_star",
      artifact: "reward_artifact",
      compass: "meta/route_compass_styled",
      locked: "meta/route_locked_styled",
      mapRouteCompass: "meta/route_compass_styled",
      mapNodeCurrent: "map_node_current",
      mapNodeComplete: "map_node_complete",
      mapNodeLocked: "map_node_locked",
      chest: "bonus_chest_closed",
      chestOpen: "bonus_chest_open",
      lantern: "camp_lantern",
      routeCompass: "meta/route_compass_styled",
      tutorialHand: "meta/tutorial_hand_styled",
      routeMap: "meta/route_map_styled",
      routeCampfire: "meta/route_campfire_styled",
      routeComplete: "meta/route_complete",
      routeLocked: "meta/route_locked_styled",
      goalSeal: "meta/goal_seal",
      expeditionCoin: "meta/expedition_coin",
      calendar: "feature_daily",
      daily: "feature_daily",
      weekly: "feature_weekly",
      book: "feature_journal",
      journal: "feature_journal",
      goals: "feature_goals",
      paw: "feature_companions",
      companions: "feature_companions",
      shop: "feature_shop",
      journey: "feature_journey",
      endless: "feature_endless",
      artifacts: "feature_artifacts",
      leaderboard: "feature_leaderboard",
      achievement: "feature_achievement",
      collection: "feature_collection",
      perfect: "badge_perfect",
      lockedBadge: "badge_locked",
      claimed: "badge_claimed",
      streak: "badge_streak",
      rare: "badge_rare",
      complete: "badge_complete",
      special: "badge_special"
    }),
    shop: Object.freeze({
      coins_handful: "shop/coins_handful",
      coins_pouch: "shop/coins_pouch",
      coins_satchel: "shop/coins_satchel",
      coins_chest: "shop/coins_chest",
      coins_expedition: "shop/coins_expedition",
      starter_explorer: "shop/starter_explorer",
      no_ads: "shop/no_ads",
      "portrait-owl": "companions/owl-calm",
      "portrait-fox": "companions/fox-calm",
      "captain-lighthouse": "captains/captain-lighthouse",
      "captain-north": "captains/captain-north",
      "frame-sunset": "badge_special",
      "frame-patina": "badge_rare",
      "title-pathfinder": "feature_journey",
      "title-keeper": "feature_journal",
      "portrait-cartographer": "captains/captain-cartographer",
      "camp-lantern": "camp_lantern",
      "letters-seaglass": "feature_endless",
      "hint-supply": "reward_star",
      "heart-supply": "reward_heart"
    })
  }),
  backgrounds: Object.freeze({
    cover: "expedition-cover.webp",
    campPortrait: "chapters/camp_intro.webp",
    campWide: "wide-ai/camp_intro.webp"
  }),
  chapters: Object.freeze(CHAPTER_IMAGES.map((file, index) => chapter(index + 1, file))),
  artifacts: Object.freeze({
    root: "artifacts",
    files: Object.freeze({ ...ARTIFACT_IMAGES })
  }),
  captains: Object.freeze({
    files: Object.freeze({
      "captain-default": "captain_portrait.png",
      "captain-pathfinder": "captains/captain-pathfinder.png",
      "captain-cartographer": "captains/captain-cartographer.png",
      "captain-keeper": "captains/captain-keeper.png",
      "captain-master": "captains/captain-master.png",
      "captain-lighthouse": "captains/captain-lighthouse.png",
      "captain-north": "captains/captain-north.png",
      "captain-eternal": "captains/captain-eternal.png"
    })
  }),
  companions: Object.freeze({
    root: "companions",
    poses: Object.freeze(["calm", "expedition", "happy", "support", "surprise", "victory"])
  })
});

export const assetUrl = (relative) => "./assets/" + relative;
export const uiAsset = (file) => assetUrl("UI/" + file);
export const backgroundAsset = (key) => {
  const file = ASSET_MANIFEST.backgrounds[key];
  return file ? uiAsset(file) : null;
};
export const chapterAsset = (index, variant = "portrait") => {
  const entry = ASSET_MANIFEST.chapters[index];
  return entry?.[variant] ? uiAsset(entry[variant]) : null;
};
export const artifactAsset = (id) => {
  const file = ASSET_MANIFEST.artifacts.files[id];
  return file ? uiAsset(ASSET_MANIFEST.artifacts.root + "/" + file) : null;
};
export const captainAsset = (id) => {
  const file = ASSET_MANIFEST.captains.files[id];
  return file ? uiAsset(file) : null;
};
export const companionAsset = (id, pose = "calm") => uiAsset(ASSET_MANIFEST.companions.root + "/" + id + "-" + pose + ".png");