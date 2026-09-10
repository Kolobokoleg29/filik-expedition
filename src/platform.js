import {SAVE_KEY,migrateLegacy} from './storage.js';
import {applyLanguage,readSdkLang} from './i18n.js';
const TIMEOUT=Symbol('timeout');
const timeout=(promise,ms)=>Promise.race([Promise.resolve(promise),new Promise(resolve=>setTimeout(()=>resolve(null),ms))]);
const settled=async(promise,ms)=>{const value=await Promise.race([Promise.resolve(promise),new Promise(resolve=>setTimeout(()=>resolve(TIMEOUT),ms))]);return value===TIMEOUT?{ok:false,value:null}:{ok:true,value};};
export class YandexPlatform {
  constructor(store,host=window,options={}){this.store=store;this.host=host;this.sdk=null;this.player=null;this.paymentsApi=null;this.cloudReady=false;this.readySent=false;this.readyWanted=false;this.wanted=false;this.playing=false;this.reasons=new Set();this.listeners=[];this.adBusy=false;this.lastAd=Date.now();this.lastCloud=0;this.dirty=false;this.timer=null;this.syncing=false;this.cloudRequestId=0;this.accountSelectionOpen=false;this.language='ru';this.adCooldownMs=180000;this.adOpenTimeout=options.adOpenTimeout??15000;this.adSessionTimeout=options.adSessionTimeout??120000;this.lastStatus=null;this.onStatus=()=>{};this.onAccountSelection=()=>{};store.onChange=()=>this.queueSave();}
  debugMode(){return /(?:^|[?&])debug-mode(?:=|&|$)/.test(this.host.location?.search||'');}
  status(scope,state,meta={}){const value={scope,state,at:Date.now(),...meta};this.lastStatus=value;try{this.onStatus(value);}catch{}if(this.debugMode()&&/error|empty|timeout|unavailable/.test(state)){try{console.warn(`[Expedition] ${scope}: ${state}`);}catch{}}}
  async init(){
    this.status('sdk','loading');
    const local=['localhost','127.0.0.1','terminal.local',''].includes(this.host.location.hostname);
    // Официальный sdk-dev-proxy работает на https://localhost и отдаёт
    // mock SDK через /sdk.js. Обычный HTTP localhost оставляем быстрым
    // fallback-режимом без ожидания отсутствующего SDK.
    const localProxy=local&&this.host.location.protocol==='https:';
    if((!local||localProxy) && !this.host.YaGames){
      await timeout(new Promise(resolve=>{const s=this.host.document.createElement('script');s.src='/sdk.js';s.onload=()=>{this.status('sdk','script_loaded');resolve();};s.onerror=()=>{this.status('sdk','script_error');resolve();};this.host.document.head.append(s);}),4000);
    }
    if(this.host.YaGames){try{this.sdk=await timeout(this.host.YaGames.init(),5000);if(!this.sdk)this.status('sdk','init_timeout');}catch{this.status('sdk','init_error');}}
    if(this.sdk){
      this.status('sdk','ready');
      this.language=applyLanguage(readSdkLang(this.sdk));
      this.sdk.on?.('game_api_pause',()=>this.pause('platform',true));
      this.sdk.on?.('game_api_resume',()=>this.pause('platform',false));
      this.bindAccountSelectionEvents();
      await this.loadCloud();
      if(this.readyWanted)this.ready();this.updateGameplay();
    }
    if(!this.sdk){this.status('sdk','unavailable');applyLanguage(this.language);}
  }
  bindAccountSelectionEvents(){
    if(!this.sdk?.on)return;
    const events=this.sdk.EVENTS||{};
    const opened=events.ACCOUNT_SELECTION_DIALOG_OPENED||'ACCOUNT_SELECTION_DIALOG_OPENED';
    const closed=events.ACCOUNT_SELECTION_DIALOG_CLOSED||'ACCOUNT_SELECTION_DIALOG_CLOSED';
    this.sdk.on(opened,()=>{
      this.accountSelectionOpen=true;
      this.status('account','selection_opened');
      this.pause('account-selection',true);
      try{this.onAccountSelection(true);}catch{}
    });
    this.sdk.on(closed,()=>{
      this.accountSelectionOpen=false;
      this.status('account','selection_closed');
      this.player=null;
      let result;
      try{result=this.onAccountSelection(false);}catch{result=null;}
      Promise.resolve(result).catch(()=>{}).finally(()=>this.pause('account-selection',false));
    });
  }
  async loadCloud({refreshPlayer=false}={}){
    if(!this.sdk)return false;
    const requestId=++this.cloudRequestId;
    this.status('cloud','loading');
    try{
      if(refreshPlayer)this.player=null;
      const player=this.player||await timeout(this.sdk.getPlayer({scopes:false}),3500);
      if(requestId!==this.cloudRequestId)return false;
      this.player=player;
      if(!this.player){this.status('cloud','unavailable');return false;}
      const result=await settled(this.player.getData(),3500);
      if(requestId!==this.cloudRequestId)return false;
      if(!result.ok){this.status('cloud','load_timeout');return false;}
      const data=result.value;
      if(!data){this.status('cloud','empty');this.cloudReady=true;return true;}
      let reconciliation=null;
      if(data[SAVE_KEY])reconciliation=this.store.merge(data[SAVE_KEY]);
      else if(data.currentLevel||data.game_progress||data.progress)reconciliation=this.store.merge(migrateLegacy(data));
      this.cloudReady=true;
      this.status('cloud','ready');
      if(!reconciliation||reconciliation.remoteChanged){this.dirty=true;if(!await this.flush(true))return false;}
      return true;
    }catch{this.status('cloud','load_error');return false;}
  }
  ready(){this.readyWanted=true;if(!this.sdk||this.readySent)return;try{this.sdk.features?.LoadingAPI?.ready();this.readySent=true;this.status('loading_api','ready');}catch{this.status('loading_api','error');}}
  setGameplay(wanted){this.wanted=!!wanted;this.updateGameplay();}
  pause(reason,on){on?this.reasons.add(reason):this.reasons.delete(reason);this.updateGameplay();this.listeners.forEach(fn=>fn(this.reasons.size>0));}
  updateGameplay(){const active=this.wanted&&this.reasons.size===0;if(active===this.playing)return;
    this.playing=active;try{this.sdk?.features?.GameplayAPI?.[active?'start':'stop']();}catch{}
  }
  get paused(){return this.reasons.size>0;}
  now(){try{return this.sdk?.serverTime?.()||Date.now();}catch{return Date.now();}}
  queueSave(){this.dirty=true;this.status('cloud','queued');if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;void this.flush();},15000);}
  async flush(force=false){
    if(!this.dirty||!this.cloudReady||!this.player||this.syncing)return false;
    if(!force&&Date.now()-this.lastCloud<3500){this.queueSave();return false;}
    this.syncing=true;this.dirty=false;this.lastCloud=Date.now();
    try{const result=await settled(this.player.setData({[SAVE_KEY]:JSON.parse(JSON.stringify(this.store.state))},true),5000);if(!result.ok){this.dirty=true;this.queueSave();this.status('cloud','flush_timeout');return false;}this.status('cloud','flushed');return true;}
    catch{this.dirty=true;this.queueSave();this.status('cloud','flush_error');return false;}
    finally{this.syncing=false;}
  }
  configure(config={}){const n=Number(config.ads?.interstitialCooldownMs);if(Number.isFinite(n))this.adCooldownMs=Math.max(60000,Math.min(900000,Math.floor(n)));}
  async requestFullscreen(element=this.host.document?.documentElement){
    // Яндекс рекомендует входить в полноэкранный режим только из действия
    // игрока. Метод вызывается из обработчика старта уровня и безопасно
    // завершается, если конкретный SDK/браузер этот режим не поддерживает.
    if(this.host.document?.fullscreenElement)return true;
    try{
      const screen=this.sdk?.screen;
      const api=screen?.fullscreen;
      if(typeof api?.request==='function'){await api.request();return true;}
      if(typeof screen?.showFullscreen==='function'){await screen.showFullscreen();return true;}
      if(typeof screen?.requestFullscreen==='function'){await screen.requestFullscreen();return true;}
    }catch{}
    try{
      const native=element?.requestFullscreen||element?.webkitRequestFullscreen;
      if(typeof native==='function'){await native.call(element);return true;}
    }catch{}
    return false;
  }
  async flags(defaultFlags={}){if(!this.sdk?.getFlags)return defaultFlags;try{return await timeout(this.sdk.getFlags({defaultFlags}),3000)||defaultFlags;}catch{return defaultFlags;}}
  async rewarded(){return this.showAd('rewarded');}
  async interstitial(){if(this.store.state.adsRemoved||Date.now()-this.lastAd<this.adCooldownMs)return false;return this.showAd('interstitial');}
  async payments(){if(this.paymentsApi)return this.paymentsApi;if(!this.sdk?.getPayments){this.status('payments','unavailable');return null;}try{this.paymentsApi=await timeout(this.sdk.getPayments(),5000);if(!this.paymentsApi)this.status('payments','timeout');else this.status('payments','ready');return this.paymentsApi;}catch{this.status('payments','error');return null;}}
  async catalog(){this.status('catalog','loading');const payments=await this.payments();if(!payments?.getCatalog){this.status('catalog','unavailable');return [];}try{const items=await timeout(payments.getCatalog(),5000);if(!Array.isArray(items)||!items.length){this.status('catalog','empty');return [];}this.status('catalog','ready',{count:items.length});return items;}catch{this.status('catalog','error');return [];}}
  async purchase(id){const payments=await this.payments();if(!payments?.purchase){this.status('purchase','unavailable',{product:id});return null;}try{return await timeout(payments.purchase({id}),15000);}catch{this.status('purchase','error',{product:id});return null;}}
  async restorePurchases(){this.status('restore','loading');const payments=await this.payments();if(!payments?.getPurchases){this.status('restore','unavailable');return [];}try{const purchases=await timeout(payments.getPurchases(),5000);if(!Array.isArray(purchases)){this.status('restore','timeout');return [];}this.status('restore',purchases.length?'ready':'empty',{count:purchases.length});return purchases;}catch{this.status('restore','error');return [];}}
  async consume(token){const payments=await this.payments();if(!payments?.consumePurchase||!token){this.status('consume','unavailable');return false;}try{const result=(await settled(payments.consumePurchase(token),5000)).ok;if(!result)this.status('consume','error');return result;}catch{this.status('consume','error');return false;}}
  async available(method){if(!this.sdk?.isAvailableMethod)return true;try{return await timeout(this.sdk.isAvailableMethod(method),2500)===true;}catch{return false;}}
  async leaderboardSubmit(boardId,score,extraData=''){const api=this.sdk?.leaderboards;if(!api||!boardId||!Number.isFinite(score))return false;try{if(api.setScore){if(!await this.available('leaderboards.setScore'))return false;if(!(await settled(api.setScore(boardId,Math.max(0,Math.floor(score)),extraData),5000)).ok)return false;return true;}if(api.setLeaderboardScore){if(!(await settled(api.setLeaderboardScore(boardId,Math.max(0,Math.floor(score))),5000)).ok)return false;return true;}return false;}catch{return false;}}
  async leaderboardGet(boardId,options={}){const api=this.sdk?.leaderboards;if(!api||!boardId)return null;try{if(api.getEntries)return await timeout(api.getEntries(boardId,options),5000);if(api.getLeaderboardEntries)return await timeout(api.getLeaderboardEntries({leaderboardName:boardId,...options}),5000);return null;}catch{return null;}}
  async showAd(kind){
    const method=kind==='rewarded'?'showRewardedVideo':'showFullscreenAdv';
    if(this.adBusy||!this.sdk?.adv?.[method])return false;
    this.adBusy=true;this.pause('ad',true);void this.flush();
    return new Promise(resolve=>{
      let reward=false,settled=false,opened=false,openTimer=null,sessionTimer=null;
      const finish=(success)=>{if(settled)return;settled=true;clearTimeout(openTimer);clearTimeout(sessionTimer);this.adBusy=false;this.lastAd=Date.now();this.pause('ad',false);resolve(success);};
      openTimer=setTimeout(()=>{if(!opened)finish(false);},this.adOpenTimeout);
      try{this.sdk.adv[method]({callbacks:{
        onOpen:()=>{if(settled)return;opened=true;clearTimeout(openTimer);sessionTimer=setTimeout(()=>finish(false),this.adSessionTimeout);},
        onRewarded:()=>{if(!settled)reward=true;},
        onClose:shown=>{this.status('ad',kind==='rewarded'?(reward?'rewarded':'closed'):(shown===true?'shown':'closed'));finish(kind==='rewarded'?reward:shown===true);},
        onError:()=>{this.status('ad','error',{kind});finish(false);},onOffline:()=>{this.status('ad','offline',{kind});finish(false);}
      }});}catch{finish(false);}
    });
  }
}
