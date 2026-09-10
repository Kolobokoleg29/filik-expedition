const paths={
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.7 5.3L8 16l2.7-5.3Z"/>',hand:'<path d="M9 13V5.5a1.5 1.5 0 0 1 3 0v4.2V4.5a1.5 1.5 0 0 1 3 0v5.2V6a1.5 1.5 0 0 1 3 0v6.7l1.2-.9a1.8 1.8 0 0 1 2.3 2.7l-4.3 4.2A4.5 4.5 0 0 1 14 20h-2.5a4.5 4.5 0 0 1-3.7-1.9L5.4 14.5a1.7 1.7 0 1 1 2.6-2.1L9 13Z"/>',
 arrow:'<path d="m9 5 7 7-7 7"/>',back:'<path d="m15 5-7 7 7 7"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M14.5 8.5c-3-2-6 0-6 3.5s3 5.5 6 3.5M7 11h7M7 13h6"/>',
 hint:'<path d="M8 15c0-2-3-3-3-7a7 7 0 0 1 14 0c0 4-3 5-3 7M8 16h8M9 19h6M10 22h4"/>',
 wordHint:'<path d="M6 19 10.5 5h3L18 19M8 14h8"/><path d="m18 3 .8 1.8 1.9.8-1.9.8L18 9.2l-.8-1.8-1.9-.8 1.9-.8Z"/>',
 shuffle:'<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
 gift:'<path d="M3 9h18v4H3ZM5 13v8h14v-8M12 9v12"/><path d="M12 9C4 9 4 3 7 3c3 0 5 6 5 6s2-6 5-6c3 0 3 6-5 6Z"/>',
 check:'<path d="m5 12 4 4L19 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
 sound:'<path d="M3 9h4l5-4v14l-5-4H3ZM16 8c3 2 3 6 0 8M19 5c5 4 5 10 0 14"/>',
 settings:'<path d="m10 3-1 3-3 1-3-1-1 4 3 2-1 3-2 2 3 3 3-1 2 3h4l1-3 3-1 3 1 1-4-3-2 1-3 2-2-3-3-3 1-2-3Z" transform="translate(1 0) scale(.9)"/><circle cx="12" cy="12" r="3"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18m-14 5 3 3 6-5"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c3-2 7-1 10 1 3-2 7-3 10-1V4c-2-1-6-2-10 1v16"/>',
 heart:'<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 4 12 8 16 4-4 13-11 8-16Z"/>',
 trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0ZM7 5H3v3c0 3 2 5 5 5M17 5h4v3c0 3-2 5-5 5M12 14v6M7 21h10"/>',
 play:'<path d="m8 4 12 8-12 8Z"/>',spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 5 3c-2 1-2 1-2 3M12 17v.1"/>',
 paw:'<ellipse cx="12" cy="16" rx="6" ry="5"/><ellipse cx="4" cy="10" rx="2" ry="3"/><ellipse cx="9" cy="5" rx="2" ry="3"/><ellipse cx="15" cy="5" rx="2" ry="3"/><ellipse cx="20" cy="10" rx="2" ry="3"/>',
 video:'<rect x="2" y="4" width="20" height="16" rx="4"/><path d="m10 8 6 4-6 4Z"/>',user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21c.8-4 3-6 7-6s6.2 2 7 6"/>',shield:'<path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',cloud:'<path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.4 9 4.5 4.5 0 0 0 7 18Z"/><path d="M12 11v7m-3-3 3 3 3-3"/>'
};
const assets={
 owlPortrait:'companions/owl-calm',foxPortrait:'companions/fox-calm',captainPortrait:'captain_portrait',
 rewardCoin:'reward_coin',rewardHeart:'reward_heart',rewardStar:'reward_star',artifact:'reward_artifact',chest:'bonus_chest_closed',chestOpen:'bonus_chest_open',
 lantern:'camp_lantern',routeCompass:'meta/route_compass',routeComplete:'meta/route_complete',goalSeal:'meta/goal_seal',expeditionCoin:'meta/expedition_coin',
 calendar:'feature_daily',daily:'feature_daily',weekly:'feature_weekly',book:'feature_journal',journal:'feature_journal',goals:'feature_goals',
 paw:'feature_companions',companions:'feature_companions',shop:'feature_shop',journey:'feature_journey',endless:'feature_endless',artifacts:'feature_artifacts',
 leaderboard:'feature_leaderboard',achievement:'feature_achievement',collection:'feature_collection',
 perfect:'badge_perfect',lockedBadge:'badge_locked',claimed:'badge_claimed',streak:'badge_streak',rare:'badge_rare',complete:'badge_complete',special:'badge_special'
};
export const icon=(name,cls='')=>assets[name]&&!cls.includes('empty')?`<img class="icon asset-icon ${cls}" src="./assets/UI/${assets[name]}.png" alt="" aria-hidden="true" decoding="async">`:`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.compass}</svg>`;
const shopAssets=Object.freeze({
 coins_handful:'shop/coins_handful',coins_pouch:'shop/coins_pouch',coins_satchel:'shop/coins_satchel',coins_chest:'shop/coins_chest',coins_expedition:'shop/coins_expedition',starter_explorer:'shop/starter_explorer',no_ads:'shop/no_ads',
 'portrait-owl':'companions/owl-calm','portrait-fox':'companions/fox-calm','captain-lighthouse':'captains/captain-lighthouse','captain-north':'captains/captain-north',
 'frame-sunset':'badge_special','frame-patina':'badge_rare','title-pathfinder':'feature_journey','title-keeper':'feature_journal','portrait-cartographer':'captains/captain-cartographer','camp-lantern':'camp_lantern','letters-seaglass':'feature_endless','hint-supply':'reward_star','heart-supply':'reward_heart'
});
export const shopIcon=(id,cls='')=>{const path=shopAssets[id];return path?`<img class="icon asset-icon shop-asset-icon ${cls}" src="./assets/UI/${path}.png" alt="" aria-hidden="true" decoding="async">`:icon('shop',cls);};
