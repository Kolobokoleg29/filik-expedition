const int=(value,fallback,min,max)=>{const n=Math.floor(Number(value));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
const bool=(value,fallback)=>typeof value==='boolean'?value:typeof value==='string'?value==='true'?true:value==='false'?false:fallback:fallback;
const text=(value,fallback,max=80)=>typeof value==='string'&&value.length<=max?value:fallback;
const costs=(value,fallback)=>{const raw=Array.isArray(value)?value:typeof value==='string'?value.split(','):[];if(raw.length!==4)return [...fallback];const parsed=raw.map((v,i)=>int(v,fallback[i],1,500));return parsed;};

export const DEFAULT_CONFIG={
 version:2,
 weekly:{steps:7,coins:90,hearts:3},
 ads:{interstitialCooldownMs:180000,earlyLevelSkip:2},
 rewarded:{coins:30,coinDailyCap:2,hintDailyCap:3,doubleDailyCap:1},
 economy:{
  campaignLevelCoins:12,campaignChapterCoins:24,campaignLevelHearts:1,campaignChapterHearts:2,
  dailyCoins:50,dailyHearts:3,bonusWordCoins:2,bonusChestEvery:5,bonusChestCoins:10,
  bonusRadarCost:30,letterHintCost:25,wordHintCost:60,
  endlessDailyRewardedStages:5,endlessCoins:12,endlessHeartsEvery:10
 },
 companions:{upgradeCosts:[10,20,30,50]},
 leaderboards:{endless:'expeditionEndless'},
 catalog:{no_ads:'expedition_no_ads',starter_explorer:'expedition_starter',coins_handful:'expedition_coins_500',coins_pouch:'expedition_coins_1200',coins_satchel:'expedition_coins_3000',coins_chest:'expedition_coins_7500',coins_expedition:'expedition_coins_18000'},
 commerceEnabled:true,commerceClientMode:'client-v1'
};

export function normalizeConfig(raw={}){
 const d=DEFAULT_CONFIG,r=raw&&typeof raw==='object'?raw:{};
 return {
  version:2,
  weekly:{steps:int(r.weekly?.steps,d.weekly.steps,3,20),coins:int(r.weekly?.coins,d.weekly.coins,0,1000),hearts:int(r.weekly?.hearts,d.weekly.hearts,0,50)},
  ads:{interstitialCooldownMs:int(r.ads?.interstitialCooldownMs,d.ads.interstitialCooldownMs,60000,900000),earlyLevelSkip:int(r.ads?.earlyLevelSkip,d.ads.earlyLevelSkip,0,20)},
  rewarded:{coins:int(r.rewarded?.coins,d.rewarded.coins,1,200),coinDailyCap:int(r.rewarded?.coinDailyCap,d.rewarded.coinDailyCap,0,10),hintDailyCap:int(r.rewarded?.hintDailyCap,d.rewarded.hintDailyCap,0,10),doubleDailyCap:int(r.rewarded?.doubleDailyCap,d.rewarded.doubleDailyCap,0,10)},
  economy:{
   campaignLevelCoins:int(r.economy?.campaignLevelCoins,d.economy.campaignLevelCoins,0,100),campaignChapterCoins:int(r.economy?.campaignChapterCoins,d.economy.campaignChapterCoins,0,500),
   campaignLevelHearts:int(r.economy?.campaignLevelHearts,d.economy.campaignLevelHearts,0,10),campaignChapterHearts:int(r.economy?.campaignChapterHearts,d.economy.campaignChapterHearts,0,20),
   dailyCoins:int(r.economy?.dailyCoins,d.economy.dailyCoins,0,500),dailyHearts:int(r.economy?.dailyHearts,d.economy.dailyHearts,0,20),
   bonusWordCoins:int(r.economy?.bonusWordCoins,d.economy.bonusWordCoins,0,50),bonusChestEvery:int(r.economy?.bonusChestEvery,d.economy.bonusChestEvery,2,20),bonusChestCoins:int(r.economy?.bonusChestCoins,d.economy.bonusChestCoins,0,200),
   bonusRadarCost:int(r.economy?.bonusRadarCost,d.economy.bonusRadarCost,1,200),letterHintCost:int(r.economy?.letterHintCost,d.economy.letterHintCost,1,200),wordHintCost:int(r.economy?.wordHintCost,d.economy.wordHintCost,1,500),
   endlessDailyRewardedStages:int(r.economy?.endlessDailyRewardedStages,d.economy.endlessDailyRewardedStages,0,30),endlessCoins:int(r.economy?.endlessCoins,d.economy.endlessCoins,0,100),endlessHeartsEvery:int(r.economy?.endlessHeartsEvery,d.economy.endlessHeartsEvery,0,100)
  },
  companions:{upgradeCosts:costs(r.companions?.upgradeCosts,d.companions.upgradeCosts)},
  leaderboards:{endless:text(r.leaderboards?.endless,d.leaderboards.endless)},
  catalog:{no_ads:text(r.catalog?.no_ads,d.catalog.no_ads),starter_explorer:text(r.catalog?.starter_explorer,d.catalog.starter_explorer),coins_handful:text(r.catalog?.coins_handful,d.catalog.coins_handful),coins_pouch:text(r.catalog?.coins_pouch,d.catalog.coins_pouch),coins_satchel:text(r.catalog?.coins_satchel,d.catalog.coins_satchel),coins_chest:text(r.catalog?.coins_chest,d.catalog.coins_chest),coins_expedition:text(r.catalog?.coins_expedition,d.catalog.coins_expedition)},
  commerceEnabled:bool(r.commerceEnabled,d.commerceEnabled),commerceClientMode:text(r.commerceClientMode,d.commerceClientMode,32)
 };
}

const FLAG_MAP={
 weekly_steps:['weekly','steps','int'],weekly_coins:['weekly','coins','int'],weekly_hearts:['weekly','hearts','int'],
 ads_interstitial_cooldown_ms:['ads','interstitialCooldownMs','int'],ads_early_level_skip:['ads','earlyLevelSkip','int'],
 rewarded_coins:['rewarded','coins','int'],rewarded_coin_daily_cap:['rewarded','coinDailyCap','int'],rewarded_hint_daily_cap:['rewarded','hintDailyCap','int'],rewarded_double_daily_cap:['rewarded','doubleDailyCap','int'],
 economy_campaign_level_coins:['economy','campaignLevelCoins','int'],economy_campaign_chapter_coins:['economy','campaignChapterCoins','int'],economy_campaign_level_hearts:['economy','campaignLevelHearts','int'],economy_campaign_chapter_hearts:['economy','campaignChapterHearts','int'],
 economy_daily_coins:['economy','dailyCoins','int'],economy_daily_hearts:['economy','dailyHearts','int'],economy_bonus_word_coins:['economy','bonusWordCoins','int'],economy_bonus_chest_every:['economy','bonusChestEvery','int'],economy_bonus_chest_coins:['economy','bonusChestCoins','int'],economy_bonus_radar_cost:['economy','bonusRadarCost','int'],economy_letter_hint_cost:['economy','letterHintCost','int'],economy_word_hint_cost:['economy','wordHintCost','int'],economy_endless_daily_rewarded_stages:['economy','endlessDailyRewardedStages','int'],economy_endless_coins:['economy','endlessCoins','int'],economy_endless_hearts_every:['economy','endlessHeartsEvery','int'],
 companion_upgrade_costs:['companions','upgradeCosts','costs'],leaderboard_endless:['leaderboards','endless','text'],catalog_no_ads:['catalog','no_ads','text'],catalog_starter_explorer:['catalog','starter_explorer','text'],catalog_coins_handful:['catalog','coins_handful','text'],catalog_coins_pouch:['catalog','coins_pouch','text'],catalog_coins_satchel:['catalog','coins_satchel','text'],catalog_coins_chest:['catalog','coins_chest','text'],catalog_coins_expedition:['catalog','coins_expedition','text'],commerce_enabled:['commerceEnabled',null,'bool'],commerce_client_mode:['commerceClientMode',null,'text']
};

const get=(obj,a,b)=>b==null?obj[a]:obj[a]?.[b];
export function configDefaultFlags(config=DEFAULT_CONFIG){const c=normalizeConfig(config),out={};for(const [flag,[a,b,type]] of Object.entries(FLAG_MAP)){const value=get(c,a,b);out[flag]=type==='costs'?value.join(','):String(value);}return out;}
export function applyRemoteFlags(localConfig,flags={}){const base=normalizeConfig(localConfig),raw=structuredClone(base);for(const [flag,[a,b,type]] of Object.entries(FLAG_MAP)){if(flags[flag]==null)continue;let value=flags[flag];if(type==='int')value=Number(value);else if(type==='bool')value=String(value)==='true';else if(type==='costs')value=String(value).split(',');if(b==null)raw[a]=value;else raw[a][b]=value;}return normalizeConfig(raw);}
