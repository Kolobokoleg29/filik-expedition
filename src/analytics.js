const COUNTER_ID=111688508,BUILD_VERSION='5.3.4';
const sessionId=(()=>{try{const key='expedition_metrics_session';let v=sessionStorage.getItem(key);if(!v){v=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);sessionStorage.setItem(key,v);}return v;}catch{return 'session_unavailable';}})();
export class Analytics {
  constructor(){this.ready=false;this.queue=[];this.warned=false;}
  init(){
    if(this.ready||typeof window.ym!=='function')return;
    try{window.ym(COUNTER_ID,'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false,params:{build_version:BUILD_VERSION}});this.ready=true;this.queue.splice(0).forEach(([e,p])=>this.send(e,p));}catch{this.warned=true;}
  }
  send(event,params={}){try{if(typeof window.ym!=='function'){if(this.queue.length<32)this.queue.push([event,params]);return;}window.ym(COUNTER_ID,'reachGoal',event,{schema_version:'5',build_version:BUILD_VERSION,session_id:sessionId,surface:Math.min(innerWidth||0,innerHeight||0)<600?'mobile':'desktop',...params});}catch{if(!this.warned)this.warned=true;}}
}