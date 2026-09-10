import {clampInt} from './core.js';
export const SAVE_KEY='expedition_rebus_v5';
// Receipts are an append-only safety ledger. A generous bound protects local
// storage from abuse without reintroducing the old 100-token replay window.
const MAX_PURCHASE_RECEIPTS=5000;
const ownObject=v=>v && typeof v==='object'&&!Array.isArray(v)?v:{};
const ids=v=>Array.isArray(v)?[...new Set(v.filter(x=>Number.isInteger(x)&&x>=1&&x<=304))]:[];
export function freshState(){return {version:5,updatedAt:0,revision:0,economyRevision:0,coins:120,completed:[],stars:{},progress:{},lastLevel:1,bonusTotal:0,wordsTotal:0,bonusBank:0,hearts:0,pets:[],activePet:null,petLevels:{},companionBondXp:{},companionMemories:[],inventory:[],activeCaptain:'captain-default',profile:{portrait:'portrait-default',frame:'frame-default',title:'title-default'},captains:['captain-default'],discoverySeen:false,companionUsage:{day:'',rewards:0,hints:0},onboardingSeen:false,endless:{best:0,rewardDay:'',rewardedStages:0,milestones:[]},weekly:{key:'',steps:0,claimed:false},settings:{sound:true,music:false,motion:true,companionReactions:true},daily:{day:'',step:0,claimed:false},gift:{day:'',streak:0},goals:[],freeHints:1,rewarded:{day:'',coins:0,hints:0,doubles:0},processedPurchases:[],purchaseGrants:{},purchaseLedger:{},adsRemoved:false,starterClaimed:false};}
export function sanitizeState(raw){
  const s=freshState();if(!raw||raw.version!==5)return s;
  for(const k of ['updatedAt','revision','economyRevision','coins','bonusTotal','wordsTotal','bonusBank','hearts','freeHints'])s[k]=clampInt(raw[k],0,k==='updatedAt'?9e15:1e8);
  s.lastLevel=clampInt(raw.lastLevel,1,304);s.completed=ids(raw.completed);s.stars={};
  for(const [k,v] of Object.entries(ownObject(raw.stars)))if(+k>=1&&+k<=304)s.stars[k]=clampInt(v,0,3);
  for(const [k,v] of Object.entries(ownObject(raw.progress)).slice(-10))if(/^(c:\d{1,3}|d:\d{4}-\d{2}-\d{2}:\d|e:\d{1,8})$/.test(k))s.progress[k]=ownObject(v);
  for(const k of ['sound','music','motion','companionReactions'])if(typeof raw.settings?.[k]==='boolean')s.settings[k]=raw.settings[k];
  s.pets=Array.isArray(raw.pets)?[...new Set(raw.pets.filter(v=>typeof v==='string').slice(0,20))]:[];
  s.activePet=s.pets.includes(raw.activePet)?raw.activePet:null;
  for(const [k,v] of Object.entries(ownObject(raw.petLevels)))s.petLevels[k]=clampInt(v,1,5);
  for(const [k,v] of Object.entries(ownObject(raw.companionBondXp)))if(s.pets.includes(k))s.companionBondXp[k]=clampInt(v,0,999);
  s.companionMemories=Array.isArray(raw.companionMemories)?[...new Set(raw.companionMemories.filter(v=>typeof v==='string'&&v.length<=120))].slice(-60):[];
  s.inventory=Array.isArray(raw.inventory)?[...new Set(raw.inventory.filter(v=>typeof v==='string').slice(0,100))]:[];
  const legacyCaptain={ 'portrait-default':'captain-default','portrait-owl':'captain-pathfinder','portrait-fox':'captain-lighthouse','portrait-cartographer':'captain-cartographer' }[raw.profile?.portrait]||'captain-default';
  s.activeCaptain=typeof raw.activeCaptain==='string'?raw.activeCaptain:legacyCaptain;
  s.captains=Array.isArray(raw.captains)?[...new Set(raw.captains.filter(v=>typeof v==='string').slice(0,30))]:['captain-default'];
  if(!s.captains.includes('captain-default'))s.captains.unshift('captain-default');
  if(raw.profile?.portrait&&legacyCaptain!=='captain-default'&&!s.captains.includes(legacyCaptain))s.captains.push(legacyCaptain);
  if(!s.captains.includes(s.activeCaptain))s.activeCaptain=legacyCaptain;
  s.profile={portrait:['portrait-cartographer','portrait-owl','portrait-fox'].includes(raw.profile?.portrait)&&s.inventory.includes(raw.profile.portrait)?raw.profile.portrait:'portrait-default',frame:['frame-patina','frame-sunset'].includes(raw.profile?.frame)&&s.inventory.includes(raw.profile.frame)?raw.profile.frame:'frame-default',title:['title-pathfinder','title-keeper'].includes(raw.profile?.title)&&s.inventory.includes(raw.profile.title)?raw.profile.title:'title-default'};
  s.onboardingSeen=raw.onboardingSeen===true;
  s.discoverySeen=raw.discoverySeen===true;
  s.companionUsage={day:typeof raw.companionUsage?.day==='string'?raw.companionUsage.day:'',rewards:clampInt(raw.companionUsage?.rewards,0,3),hints:clampInt(raw.companionUsage?.hints,0,1)};
  s.endless.milestones=Array.isArray(raw.endless?.milestones)?[...new Set(raw.endless.milestones.filter(v=>Number.isInteger(v)&&v>=200&&v<=100000))]:[];
  s.endless={best:clampInt(raw.endless?.best,0,1e8),rewardDay:typeof raw.endless?.rewardDay==='string'?raw.endless.rewardDay:'',rewardedStages:clampInt(raw.endless?.rewardedStages,0,100),milestones:Array.isArray(raw.endless?.milestones)?[...new Set(raw.endless.milestones.filter(v=>Number.isInteger(v)&&v>=200&&v<=100000))]:[]};
  s.weekly={key:typeof raw.weekly?.key==='string'?raw.weekly.key:'',steps:clampInt(raw.weekly?.steps,0,20),claimed:raw.weekly?.claimed===true};
  s.daily={day:typeof raw.daily?.day==='string'?raw.daily.day:'',step:clampInt(raw.daily?.step,0,3),claimed:raw.daily?.claimed===true};
  s.gift={day:typeof raw.gift?.day==='string'?raw.gift.day:'',streak:clampInt(raw.gift?.streak,0,1e6)};
  s.goals=Array.isArray(raw.goals)?[...new Set(raw.goals.filter(v=>typeof v==='string').slice(0,100))]:[];
  s.rewarded={day:typeof raw.rewarded?.day==='string'?raw.rewarded.day:'',coins:clampInt(raw.rewarded?.coins,0,20),hints:clampInt(raw.rewarded?.hints,0,20),doubles:clampInt(raw.rewarded?.doubles,0,20)};
  s.processedPurchases=Array.isArray(raw.processedPurchases)?[...new Set(raw.processedPurchases.filter(v=>typeof v==='string'&&v.length<=256))].slice(-MAX_PURCHASE_RECEIPTS):[];
  s.purchaseGrants={};for(const [token,amount] of Object.entries(ownObject(raw.purchaseGrants)).slice(-MAX_PURCHASE_RECEIPTS))if(typeof token==='string'&&token.length<=256)s.purchaseGrants[token]=clampInt(amount,0,1e7);
  s.purchaseLedger={};for(const [token,entry] of Object.entries(ownObject(raw.purchaseLedger)).slice(-MAX_PURCHASE_RECEIPTS))if(typeof token==='string'&&token.length<=256&&entry&&typeof entry==='object'){const productId=typeof entry.productId==='string'?entry.productId:'',status=entry.status==='consumed'?'consumed':'pending',amount=clampInt(entry.amount,0,1e7);if(productId)s.purchaseLedger[token]={productId,amount,status,updatedAt:clampInt(entry.updatedAt,0,9e15)};}
  s.adsRemoved=raw.adsRemoved===true;s.starterClaimed=raw.starterClaimed===true;return s;
}
export function mergeStates(a,b){
  if(a?.version!==5)return sanitizeState(b);
  if(b?.version!==5)return sanitizeState(a);
  a=sanitizeState(a);b=sanitizeState(b);
  const newer=b.updatedAt>a.updatedAt||(b.updatedAt===a.updatedAt&&(b.revision>a.revision||(b.revision===a.revision&&b.completed.length>a.completed.length)))?b:a;
  const economyNewer=b.economyRevision>a.economyRevision?b:a.economyRevision>b.economyRevision?a:newer;
  const s=structuredClone(newer);
  // Economy has its own revision. A stale offline device may save later, but it
  // must not resurrect an older balance merely because its wall-clock timestamp is newer.
  for(const key of ['coins','hearts','freeHints','bonusBank','pets','activePet','petLevels','companionBondXp','companionMemories','inventory','profile','activeCaptain','captains','companionUsage','daily','gift','goals','weekly','rewarded','processedPurchases','purchaseGrants','purchaseLedger','starterClaimed'])s[key]=structuredClone(economyNewer[key]);
  s.endless={...structuredClone(economyNewer.endless),best:Math.max(a.endless.best,b.endless.best)};
  s.economyRevision=Math.max(a.economyRevision,b.economyRevision);
  s.completed=ids([...a.completed,...b.completed]).sort((x,y)=>x-y);
  s.lastLevel=Math.max(a.lastLevel,b.lastLevel);
  s.wordsTotal=Math.max(a.wordsTotal,b.wordsTotal);
  s.bonusTotal=Math.max(a.bonusTotal,b.bonusTotal);
  for(const key of new Set([...Object.keys(a.stars),...Object.keys(b.stars)]))s.stars[key]=Math.max(a.stars[key]||0,b.stars[key]||0);
  s.adsRemoved=a.adsRemoved||b.adsRemoved;s.starterClaimed=a.starterClaimed||b.starterClaimed;
  s.processedPurchases=[...new Set([...a.processedPurchases,...b.processedPurchases])].slice(-MAX_PURCHASE_RECEIPTS);
  // Purchase grants are an append-only receipt ledger. If a newer offline
  // snapshot did not yet contain a receipt, preserve its value when merging
  // instead of silently losing paid currency. This does not pretend to solve
  // arbitrary offline spending conflicts; a server ledger is still the robust
  // solution for that case.
  const grants={...a.purchaseGrants,...b.purchaseGrants};
  const selectedTokens=new Set(economyNewer.processedPurchases);
  for(const [token,amount] of Object.entries(grants)){
    if(!selectedTokens.has(token))s.coins+=amount;
  }
  s.purchaseGrants=grants;
  const ledger={...a.purchaseLedger,...b.purchaseLedger};
  for(const token of new Set([...Object.keys(a.purchaseLedger),...Object.keys(b.purchaseLedger)])){
    const left=a.purchaseLedger[token],right=b.purchaseLedger[token];
    if(left&&right)ledger[token]={...left,...right,status:left.status==='consumed'||right.status==='consumed'?'consumed':'pending',updatedAt:Math.max(left.updatedAt||0,right.updatedAt||0)};
  }
  s.purchaseLedger=ledger;
  s.processedPurchases=[...new Set([...s.processedPurchases,...Object.keys(grants),...Object.keys(ledger)])].slice(-MAX_PURCHASE_RECEIPTS);
  return s;
}
function parse(storage,key){try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}}
export function migrateLegacy(data={}){
  const s=freshState(),p=ownObject(data.game_progress||data.progress||data),e=ownObject(data.game_economy||data.economy||data),pets=ownObject(data.game_companions||data.companions),settings=ownObject(data.game_settings||data.settings||data);
  const current=clampInt(p.currentLevel||data.currentLevel,1,305);
  s.completed=Array.from({length:current-1},(_,i)=>i+1);s.lastLevel=Math.min(current,304);
  if(e.coins!=null)s.coins=clampInt(e.coins);s.freeHints=clampInt(p.freeHintCharges??1)+clampInt(p.freeOpenWordCharges)*3;
  for(const [k,v] of Object.entries(ownObject(p.stars)))if(+k>=0&&+k<304)s.stars[+k+1]=clampInt(v,0,3);
  s.hearts=clampInt(pets.hearts);s.pets=Array.isArray(pets.unlocked)?pets.unlocked:[];s.activePet=pets.activeId||null;s.petLevels=ownObject(pets.levels);
  s.adsRemoved=!!(data.game_purchases?.adsRemoved||data.purchases?.adsRemoved||data.adsRemoved);
  if(settings.isMuted!==undefined||settings.isSfxMuted!==undefined)s.settings.sound=!(settings.isMuted||settings.isSfxMuted);if(settings.isMusicMuted!==undefined)s.settings.music=!(settings.isMuted||settings.isMusicMuted);
  s.updatedAt=clampInt(data.lastSaveTime||0,0,9e15);return sanitizeState(s);
}
const economyFingerprint=s=>JSON.stringify([s.coins,s.hearts,s.freeHints,s.bonusBank,s.pets,s.activePet,s.petLevels,s.companionBondXp,s.companionMemories,s.inventory,s.profile,s.activeCaptain,s.captains,s.companionUsage,s.endless,s.daily,s.gift,s.goals,s.weekly,s.rewarded,s.processedPurchases,s.purchaseGrants,s.purchaseLedger,s.adsRemoved,s.starterClaimed]);
export class SaveStore {
  constructor(storage){this.storage=storage;this.persistent=true;this.onChange=()=>{};
    const main=parse(storage,SAVE_KEY),backup=parse(storage,SAVE_KEY+'_backup');
    if(main?.version===5||backup?.version===5)this.state=mergeStates(main,backup);
    else {const legacy={};for(const k of ['game_progress','game_economy','game_companions','game_settings','game_purchases'])legacy[k]=parse(storage,k);this.state=migrateLegacy(legacy);}
    this.economyFingerprint=economyFingerprint(this.state);
  }
  save(){const fingerprint=economyFingerprint(this.state);if(fingerprint!==this.economyFingerprint){this.state.economyRevision++;this.economyFingerprint=fingerprint;}this.state.updatedAt=Date.now();this.state.revision++;this.persist();this.onChange(this.state);}
  persist(){try{const encoded=JSON.stringify(this.state);this.storage.setItem(SAVE_KEY,encoded);this.storage.setItem(SAVE_KEY+'_backup',encoded);this.persistent=true;}catch{this.persistent=false;}}
  merge(raw){const remote=sanitizeState(raw),merged=mergeStates(this.state,remote);const localChanged=JSON.stringify(merged)!==JSON.stringify(this.state),remoteChanged=JSON.stringify(merged)!==JSON.stringify(remote);this.state=merged;this.persist();return {localChanged,remoteChanged};}
  spend(amount){if(!Number.isInteger(amount)||amount<=0||this.state.coins<amount)return false;this.state.coins-=amount;return true;}
}
