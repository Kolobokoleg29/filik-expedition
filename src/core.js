export const normalizeWord = word => String(word || '').normalize('NFC').trim().toUpperCase().replaceAll('Ё', 'Е');
export const clampInt = (value, min=0, max=1e8) => Math.max(min, Math.min(max, Math.floor(Number(value) || 0)));
export function canSpell(word, letters) {
  const bag = [...letters];
  return [...normalizeWord(word)].every(letter => { const i=bag.indexOf(letter); if(i<0)return false; bag.splice(i,1);return true; });
}
export function cellsFor(level) {
  const cells = new Map();
  for(const entry of level.words) [...entry.word].forEach((letter,i)=>{
    const x=entry.x+(entry.direction===0?i:0),y=entry.y+(entry.direction===1?i:0),key=`${x},${y}`;
    if(cells.has(key) && cells.get(key).letter!==letter)throw new Error(`Conflicting crossing: ${level.id}`);
    const cell=cells.get(key)||{key,x,y,letter,words:[]};cell.words.push(entry.word);cells.set(key,cell);
  });return [...cells.values()];
}
export function classifyWord(level, progress, input) {
  const word=normalizeWord(input);
  if(word.length<3)return {kind:'short',word};
  if(!canSpell(word,level.letters))return {kind:'invalid',word};
  const target=level.words.some(w=>w.word===word),bonus=level.bonus.includes(word);
  if((target && progress.found.includes(word))||(bonus && progress.bonus.includes(word)))return {kind:'duplicate',word};
  return {kind:target?'target':bonus?'bonus':'invalid',word};
}
export function dateKey(time=Date.now()) {return new Date(time).toISOString().slice(0,10);}
export function previousDay(time=Date.now()) {return dateKey(time-864e5);}
export function dailyRoute(day, count) {
  let hash=2166136261;for(const c of day)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  const start=32+(hash%Math.max(1,count-32));return [0,1,2].map(i=>32+((start-32+i*67)%Math.max(1,count-32)));
}
export function emptyProgress(){return {found:[],bonus:[],revealed:[],hints:0,radar:false,finished:false};}
export function levelStars(hints){return hints===0?3:hints<=2?2:1;}
export function validateProgress(level, raw) {
  const p=emptyProgress();if(!raw||typeof raw!=='object')return p;
  p.found=Array.isArray(raw.found)?[...new Set(raw.found.filter(w=>level.words.some(e=>e.word===w)))]:[];
  p.bonus=Array.isArray(raw.bonus)?[...new Set(raw.bonus.filter(w=>level.bonus.includes(w)))]:[];
  const keys=new Set(cellsFor(level).map(c=>c.key));
  p.revealed=Array.isArray(raw.revealed)?[...new Set(raw.revealed.filter(k=>keys.has(k)))]:[];
  p.hints=clampInt(raw.hints,0,100);p.radar=raw.radar===true;p.finished=p.found.length===level.words.length;return p;
}
export function starsTotal(state){return Object.values(state.stars).reduce((a,b)=>a+clampInt(b,0,3),0);}
export function nextLevel(state,total=304){for(let i=1;i<=total;i++)if(!state.completed.includes(i))return i;return total;}
export function endlessTemplate(seed,total=304){
  let hash=2166136261;for(const c of String(seed))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  return (hash%Math.max(1,total))+1;
}
function gcd(a,b){while(b){[a,b]=[b,a%b];}return a;}
// A deterministic permutation of the prepared catalog. Unlike selecting a
// template by hash modulo, this guarantees that one pass through the catalog
// cannot repeat a template before every entry has been visited.
export function endlessPoolIndex(stage,total=2000){
 const n=Math.max(1,Math.floor(Number(total)||1)),rawStage=Math.max(1,Math.floor(Number(stage)||1));if(n===1)return 1;
 // The catalog is generated in four difficulty bands (3/4/5/6 target words).
 // Permute inside the current band instead of shuffling the whole catalog: the
 // player gets a stable increase in challenge while every template is still
 // visited exactly once before the 2,000-stage cycle repeats.
 const cycleStage=(rawStage-1)%n+1;
 if(n<4){let step=Math.min(997,n-1);while(gcd(step,n)!==1)step--;if(step<1)step=1;return ((cycleStage-1)*step+endlessTemplate('expedition-v2:offset',n)-1)%n+1;}
 const b1=Math.max(1,Math.floor(n*.04));
 const b2=Math.max(b1+1,Math.floor(n*.14));
 const b3=Math.max(b2+1,Math.floor(n*.325));
 const bands=[[1,Math.min(n,b1)],[Math.min(n,b1+1),Math.min(n,b2)],[Math.min(n,b2+1),Math.min(n,b3)],[Math.min(n,b3+1),n]];
 const [start,end]=bands.find(([a,z])=>cycleStage>=a&&cycleStage<=z)||bands.at(-1),size=end-start+1;
 let step=Math.min(997,size-1);while(step>1&&gcd(step,size)!==1)step--;if(step<1)step=1;
 const offset=endlessTemplate(`expedition-v2:offset:${start}`,size)-1;
 return start+((cycleStage-start)*step+offset)%size;
}

export const WAVE_ROLES=Object.freeze(['warmup','build','variation','peak','breather','build','pre-finale','finale']);
export function difficultyWave(stage){
 const n=Math.max(1,Math.floor(Number(stage)||1));
 return WAVE_ROLES[(n-1)%WAVE_ROLES.length];
}
export function levelDifficulty(level){
 const words=Array.isArray(level?.words)?level.words:[], lengths=words.map(w=>normalizeWord(w?.word).length), max=Math.max(0,...lengths), avg=lengths.length?lengths.reduce((a,b)=>a+b,0)/lengths.length:0, bonus=Array.isArray(level?.bonus)?level.bonus.length:0;
 const cells=level&&Array.isArray(level.words)?cellsFor(level):[], area=Math.max(0,Number(level?.width)||0)*Math.max(0,Number(level?.height)||0), meta=level?.difficulty||{};
 const score=Number.isFinite(Number(meta.score))?Number(meta.score):Math.round(Math.max(0,Math.min(100,20+(words.length-2)*10+(avg-3)*12+(area-12)*.35+Math.min(bonus,12)*.5)));
 return {tier:meta.tier|| (score>=82?'hard':score>=48?'medium':'easy'),waveRole:meta.waveRole||difficultyWave(level?.id||1),score,wordCount:words.length,maxLength:max,averageLength:Number(avg.toFixed(2)),gridArea:area,occupiedCells:cells.length,bonusCount:bonus};
}

const RU_KEYBOARD=Object.freeze({KeyQ:'Й',KeyW:'Ц',KeyE:'У',KeyR:'К',KeyT:'Е',KeyY:'Н',KeyU:'Г',KeyI:'Ш',KeyO:'Щ',KeyP:'З',BracketLeft:'Х',BracketRight:'Ъ',KeyA:'Ф',KeyS:'Ы',KeyD:'В',KeyF:'А',KeyG:'П',KeyH:'Р',KeyJ:'О',KeyK:'Л',KeyL:'Д',Semicolon:'Ж',Quote:'Э',KeyZ:'Я',KeyX:'Ч',KeyC:'С',KeyV:'М',KeyB:'И',KeyN:'Т',KeyM:'Ь',Comma:'Б',Period:'Ю'});
export function keyboardLetter(key,code){const normalized=normalizeWord(key);return /^[А-Я]$/.test(normalized)?normalized:RU_KEYBOARD[code]||'';}
