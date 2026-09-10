export class GameAudio {
  constructor(getSettings){this.settings=getSettings;this.context=null;this.paused=false;this.musicTimer=null;this.musicStep=0;}
  unlock(){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();if(!this.paused)void this.context.resume().catch(()=>{});this.updateMusic();}catch{}}
  setPaused(value){this.paused=value;if(value){void this.context?.suspend().catch(()=>{});clearInterval(this.musicTimer);this.musicTimer=null;}else{void this.context?.resume().catch(()=>{});this.updateMusic();}}
  note(freq,duration=.18,volume=.065,type='sine',delay=0){const c=this.context;if(!c||this.paused||c.state!=='running')return;
    const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  play(kind,step=0){if(!this.settings().sound)return;
    if(kind==='select')this.note(330*Math.pow(1.12246,step));
    if(kind==='success')[523,659,784].forEach((f,i)=>this.note(f,.27,.055,'sine',i*.065));
    if(kind==='win')[523,659,784,1047].forEach((f,i)=>this.note(f,.5,.065,'sine',i*.12));
    if(kind==='error')this.note(160,.12,.035,'triangle');
    if(kind==='click')this.note(480,.06,.025);
  }
  updateMusic(){clearInterval(this.musicTimer);this.musicTimer=null;if(this.paused||!this.context||!this.settings().music)return;
    const notes=[196,246.94,293.66,369.99,293.66,246.94,220,293.66];
    this.musicTimer=setInterval(()=>{if(this.settings().music)this.note(notes[this.musicStep++%notes.length],2.7,.012,'sine');},1400);
  }
}
