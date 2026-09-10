import {formatCoins} from './ui-format.js';
import {ABILITIES,applyCompanionEvent} from './companions.js';
import {captainById,captainIsUnlocked,unlockCaptains,captainTitle as captainName,captainMotto} from './captains.js';
import {applyCampaignCompletion,applyEndlessCompletion,applyDailyCompletion} from './progression.js';
import {CHAPTERS,COMPANIONS} from './content.js';
import {artifactAsset as artifactImage,backgroundAsset,chapterAsset,companionAsset} from './asset-manifest.js';
import {chapterVisual} from './chapter-visuals.js';
import {normalizeWord,keyboardLetter,cellsFor,classifyWord,emptyProgress,validateProgress,dateKey,previousDay,levelStars,starsTotal,nextLevel,endlessPoolIndex,levelDifficulty} from './core.js';
import {SaveStore} from './storage.js';
import {YandexPlatform} from './platform.js';
import {GameAudio} from './audio.js';
import {icon} from './icons.js';
import {Analytics} from './analytics.js';
import {normalizeConfig,configDefaultFlags,applyRemoteFlags} from './config.js';
import {weekKey,ensureRewardedDay as ensureRewardedDayState,rewardedRemaining as economyRewardedRemaining,dailyGiftOffer,buyShopItem,claimGoal,claimWeekly,GOALS,goalValue} from './economy.js';
import {CommerceService} from './commerce.js';
import {createMetaScreens} from './meta-screens.js';
import {renderVictory} from './victory-screen.js';
import {fetchJson} from './data-loader.js';
import {companionLine,chapterCompanionLine,recordCompanionMoment} from './companion-dialogue.js';
const victoryRewardClass='companion-reward';
const app=document.querySelector('#app'),modalRoot=document.querySelector('#modal-root');
let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}};}
const store=new SaveStore(storage),platform=new YandexPlatform(store),audio=new GameAudio(()=>store.state.settings),analytics=new Analytics();
platform.onStatus=status=>{if(!status?.scope||!status.state)return;if(/error|empty|timeout|unavailable|offline/.test(status.state))analytics.send('platform_diagnostic',{scope:status.scope,status:status.state});};
const ui={screen:'home',level:null,mode:'campaign',key:null,progress:null,letters:[],selected:[],drag:null,modal:null,modalStack:[],modalClosable:true,focusAnchor:null,combo:0,wordTime:0,replay:false,observer:null,finishTimer:null,toastTimer:null,companionIdleTimer:null,previousFocus:null,adRewardBusy:false,firstWordReported:false,abandonReported:false,tutorialActive:false,tutorialWord:''};
let levels=[],endlessLevels=null,endlessLoad=null,liveConfig=normalizeConfig();
let activationStarted=false;
const state=()=>store.state;
const ENDLESS_BASE=10000;
platform.onAccountSelection=async open=>{
  analytics.send('save_account_selection',{state:open?'opened':'closed'});
  if(open||!levels.length)return true;
  const synced=await platform.loadCloud({refreshPlayer:true});
  if(ui.screen==='game'){leaveScreen();home();}
  toast(synced?'Прогресс аккаунта обновлён':'Проверьте сохранение в настройках');
  return synced;
};
const commerce=new CommerceService({platform,store,analytics,getConfig:()=>liveConfig,save});
const commerceAvailable=()=>commerce.available();
const econ=()=>liveConfig.economy;
const weeklyCfg=()=>liveConfig.weekly;
const rewardedCfg=()=>liveConfig.rewarded;
const ensureRewardedDay=()=>ensureRewardedDayState(state(),dateKey(platform.now()));
const rewardedRemaining=kind=>economyRewardedRemaining(state(),kind,dateKey(platform.now()),rewardedCfg());
const endlessKey=n=>`e:${n}`;
const petImage=(p,pose='calm')=>{const mapped=emotionPets?.has(p.id)?pose==='victory'?'happy':pose==='expedition'?'support':pose:pose;return companionAsset(p.id,mapped);};
const gameCompanion=()=>{const p=COMPANIONS.find(entry=>entry.id===state().activePet);return p?`<span class="companion-anchor"><span class="game-companion" title="Спутник: ${p.name}" aria-label="Спутник: ${p.name}"><img src="${petImage(p)}" alt=""></span><span class="companion-speech" id="companion-speech" aria-live="polite" hidden></span></span>`:'';};
let companionTimer;
const emotionPets=new Set(['owl','fox','wolf','bear','camel','eagle','snake','elephant','turtle','deer','pard','lion']);
function companionReact(event,memory=''){const before=state().companionBondXp?.[state().activePet]||0,text=companionLine(state(),event),moment=recordCompanionMoment(state(),event,memory),el=document.querySelector('#companion-speech');if(moment&&moment.xp!==before)save();if(state().settings.companionReactions===false)return;if(!text||!el)return;const p=COMPANIONS.find(x=>x.id===state().activePet),pose=emotionPets.has(p?.id)?companionPose(event):event==='victory'?'victory':event==='departure'?'expedition':'calm',img=document.querySelector('.game-companion img');if(img&&p)img.src=petImage(p,pose);clearTimeout(companionTimer);el.textContent=text;el.hidden=false;el.classList.remove('is-visible');void el.offsetWidth;el.classList.add('is-visible');companionTimer=setTimeout(()=>{el.hidden=true;el.classList.remove('is-visible');if(img&&p)img.src=petImage(p);},3600);}
function companionPose(event){return event==='word_wrong'||event==='idle'?'support':event==='bonus_found'?'surprise':event==='word_correct'||event==='victory'?'happy':'calm';}
function petCard(pose='calm'){if(pose==='expedition'&&ui.mode==='campaign'&&ui.level?.id%8===1)return chapterPetCard(chapterCompanionLine(state(),Math.floor((ui.level.id-1)/8)));const p=COMPANIONS.find(p=>p.id===state().activePet);return p?`<div class="companion-presence"><img src="${petImage(p,pose)}" alt="${p.name}"><div><b>${p.name}</b><span>${pose==='victory'?'Ещё одно открытие вместе!':ABILITIES[p.id]?.text||'Ваш попутчик'}</span></div></div>`:'';}
function chapterPetCard(line){const p=COMPANIONS.find(p=>p.id===state().activePet);return p?`<div class="companion-presence chapter-companion-presence"><img src="${petImage(p,'expedition')}" alt="${p.name}"><div><b>${p.name}</b>${line?`<span class="companion-chapter-line">«${line}»</span>`:''}<span class="companion-ability"><strong>Способность:</strong> ${ABILITIES[p.id]?.text||'Ваш попутчик'}</span></div></div>`:'';}
function petEvent(event){const result=applyCompanionEvent(state(),event,dateKey(platform.now()));if(result){save();const cost=document.querySelector('#hint-cost');if(cost&&state().freeHints>0)cost.textContent='Бесплатно';analytics.send('companion_ability',{pet:result.pet,event,kind:result.kind,amount:result.amount});toast(result.kind==='hint'?'Спутник приготовил бесплатную букву':`Помощь спутника: +${result.amount} ${result.kind==='heart'?'сердец':'монет'}`);}if(event==='departure')companionReact('departure');if(event==='return')companionReact('return');if(event==='bonus')companionReact('bonus_found');if(event==='victory')companionReact('victory');if(event==='chapter')companionReact('chapter',`chapter:${chapterFor(ui.level?.id||1).id}`);if(event==='daily')companionReact('milestone',`daily:${dateKey(platform.now())}`);if(event==='milestone')companionReact('milestone',`endless:${ui.level?.id||0}`);return result;}
const portraitIcon=()=>{const c=captainById(state().activeCaptain);return c.icon||'captainPortrait';};
const captainAvatar=()=>{const c=captainById(state().activeCaptain);return c.asset?`<img class="captain-avatar-image" src="${c.asset}" alt="">`:icon(c.icon||'captainPortrait');};
const captainTitle=()=>captainName(state());
const captainMottoText=()=>captainMotto(state());
const escapeHTML=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chapterFor=id=>CHAPTERS[Math.min(37,Math.floor((id-1)/8))];
const chapterImage=index=>chapterAsset(index,'portrait');
const chapterWideImage=index=>chapterAsset(index,'wide');
const stars=(n=3)=>`<span class="stars">${[1,2,3].map(i=>i>n?icon('star','empty'):icon('rewardStar')).join('')}</span>`;
const btn=(act,name,ic,cls='secondary',extra='')=>`<button class="${cls}" data-action="${act}" ${extra}>${ic?icon(ic):''}${name}</button>`;
const pendingButton=(button,label='Покупка…')=>{if(!button)return;button.dataset.restoreMarkup=button.innerHTML;button.disabled=true;button.setAttribute('aria-busy','true');button.classList.add('is-pending');button.innerHTML='<span class="pending-spinner" aria-hidden="true"></span>'+label;};
const restorePendingButton=button=>{if(!button?.isConnected)return;button.disabled=false;button.removeAttribute('aria-busy');button.classList.remove('is-pending');if(button.dataset.restoreMarkup!==undefined){button.innerHTML=button.dataset.restoreMarkup;delete button.dataset.restoreMarkup;}};const initialGamePrompt=(mode,id)=>mode==='campaign'&&id===1?'Нажмите буквы по очереди или проведите по ним':mode==='campaign'&&id<=2?'Соберите слово из букв круга':'Проведите по буквам';
const iconBtn=(act,label,ic)=>act==='profile'?`<button class="icon-button captain-home-button" data-action="profile" aria-label="${label}" title="${label}">${captainAvatar()}</button>`:btn(act,'',ic,'icon-button',`aria-label="${label}" title="${label}"`);
const coinPill=()=>btn('wallet',`${icon('rewardCoin')}<span data-coins>${formatCoins(state().coins)}</span>`,'','pill',`aria-label="Монеты и подсказки: ${state().coins}" title="${state().coins} монет"`);
const topbar=(name,back='home')=>`<header class="topbar"><div class="row">${iconBtn(back,'На главную','back')}<span class="nav-label">${name}</span></div><div class="row">${coinPill()}${iconBtn('settings','Настройки','settings')}</div></header>`;
function setBackground(index=null){const el=document.querySelector('#landscape');const cssUrl=file=>"url('../" + file.slice(2) + "')";if(index===null){el.style.setProperty('--bg-landscape',cssUrl(backgroundAsset('campWide')));el.style.setProperty('--bg-portrait',cssUrl(backgroundAsset('campPortrait')));el.style.setProperty('--bg-shade','.42');el.style.setProperty('--bg-landscape-position','center 46%');el.style.setProperty('--bg-mobile-position','center 58%');return;}const visual=chapterVisual(index);el.style.setProperty('--bg-landscape',cssUrl(chapterAsset(index,'wide')));el.style.setProperty('--bg-portrait',cssUrl(chapterAsset(index,'portrait')));el.style.setProperty('--bg-shade',String(visual.shade));el.style.setProperty('--bg-landscape-position','center '+visual.focusY+'%');el.style.setProperty('--bg-mobile-position','center '+visual.focusY+'%');}function refreshCaptainButtons(){const html=captainAvatar();document.querySelectorAll('.captain-home-button').forEach(button=>{button.innerHTML=html;button.setAttribute('aria-label',`Профиль капитана: ${captainTitle()}`);button.setAttribute('title',`Профиль капитана: ${captainTitle()}`);});}
function save(){store.save();applyCosmetics();refreshCaptainButtons();document.querySelectorAll('[data-coins]').forEach(e=>{e.textContent=formatCoins(state().coins);e.closest('button')?.setAttribute('aria-label',`Монеты и подсказки: ${state().coins}`);e.closest('button')?.setAttribute('title',`${state().coins} монет`);});}
function applyCosmetics(){document.body.classList.toggle('theme-seaglass',state().inventory.includes('letters-seaglass'));}
function updateSettings(){applyCosmetics();document.body.classList.toggle('reduced-motion',!state().settings.motion);audio.updateMusic();}
function tutorialIndexes(){
 const word=ui.tutorialWord;
 if(!word)return [];
 const used=new Set();
 return [...word].map(letter=>{const index=ui.letters.findIndex((value,i)=>value===letter&&!used.has(i));if(index>=0)used.add(index);return index;}).filter(index=>index>=0);
}
function updateTutorialGuide(){
 if(!ui.tutorialActive)return;
 const guide=document.querySelector('.tutorial-guide'),indexes=tutorialIndexes();
 document.querySelectorAll('.letter').forEach(button=>button.classList.toggle('tutorial-target',indexes.includes(+button.dataset.letter)));
 const first=document.querySelector(`.letter[data-letter="${indexes[0]??-1}"]`);
 if(!guide||!first)return;
 const rect=first.getBoundingClientRect();
 guide.style.setProperty('--tutorial-x',`${Math.round(rect.left+rect.width/2)}px`);
 guide.style.setProperty('--tutorial-y',`${Math.round(rect.top+rect.height*.72)}px`);
}
function showFirstRunTutorial(){
 if(state().onboardingSeen||ui.mode!=='campaign'||ui.level?.id!==1||ui.tutorialActive)return;
 ui.tutorialActive=true;
 ui.tutorialWord=ui.level.words?.[0]?.word||'';
 const guide=document.createElement('div');
 guide.className='tutorial-guide';
 guide.setAttribute('aria-live','polite');
 guide.innerHTML=`<div class="tutorial-callout"><strong>Первое слово рядом</strong><span>Проведите по подсвеченным буквам</span><b>${escapeHTML(ui.tutorialWord)}</b></div><span class="tutorial-hand" aria-hidden="true">${icon('hand','tutorial-hand-icon')}</span>`;
 document.body.append(guide);
 updateTutorialGuide();
 analytics.send('tutorial_step',{step:'first_level_started'});
}
function finishFirstRunTutorial(step='first_word_found'){
 if(!ui.tutorialActive)return;
 ui.tutorialActive=false;ui.tutorialWord='';
 document.querySelector('.tutorial-guide')?.remove();
 document.querySelectorAll('.letter.tutorial-target').forEach(button=>button.classList.remove('tutorial-target'));
 if(!state().onboardingSeen){state().onboardingSeen=true;save();analytics.send('tutorial_step',{step});}
}
function toast(message){clearTimeout(ui.toastTimer);const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');if(/^(Это слово|Нужно хотя бы|Этого слова)/.test(message))companionReact('word_wrong');ui.toastTimer=setTimeout(()=>el.classList.remove('visible'),2500);}
function leaveScreen(){if(ui.tutorialActive)finishFirstRunTutorial('skipped');if(ui.screen==='game'&&ui.progress&&!ui.progress.finished&&!ui.abandonReported&&ui.progress.found.length){analytics.send('level_abandon',{level:ui.level?.id,mode:ui.mode,found:ui.progress.found.length});ui.abandonReported=true;}clearTimeout(ui.finishTimer);ui.finishTimer=null;clearTimeout(ui.companionIdleTimer);ui.companionIdleTimer=null;ui.observer?.disconnect();ui.observer=null;ui.drag=null;ui.selected=[];platform.setGameplay(false);closeModal(false);}
const screens=createMetaScreens({
 app,state,setScreen:name=>{ui.screen=name;},getLevels:()=>levels,getConfig:()=>liveConfig,econ,weeklyCfg,rewardedCfg,rewardedRemaining,store,platform,analytics,leaveScreen,setBackground,topbar,btn,iconBtn,coinPill,chapterFor,chapterImage,chapterWideImage,petImage,petCard,captainTitle,captainMotto:captainMottoText,portraitIcon,captainAvatar,toast,save,modal,commerceAvailable,commerceProduct:id=>commerce.product(id),commerceBuy:id=>commerce.buy(id),commerceStatus:()=>commerce.catalogState,commerceRetry:()=>commerce.loadCatalog({force:true}),escapeHTML,startLevel,nextLevel,currentModal:()=>ui.modal,pendingButton,restorePendingButton
});
const {home,mapPage,albumPage,artifact,story,petsPage,petAction,showSettings,help,onboarding,profile,wallet,shop,shopConfirm,goals,gift,daily,weekly,leaderboard,startDaily}=screens;
async function ensureEndlessLevels(){
 if(Array.isArray(endlessLevels)&&endlessLevels.length>=2000)return endlessLevels;
 if(!endlessLoad)endlessLoad=fetchJson('./endless-levels.json',{attempts:2,timeoutMs:8000,retryDelayMs:250}).then(data=>{if(!Array.isArray(data)||data.length<2000)throw new Error('Invalid endless catalog');endlessLevels=data;return data;}).catch(error=>{endlessLoad=null;throw error;});
 return endlessLoad;
}
async function startEndless(index=Math.max(1,state().endless.best+1)){
 let pool;try{pool=await ensureEndlessLevels();}catch(error){console.error('Endless mode unavailable:',error);toast('Бесконечная экспедиция пока не загрузилась. Попробуйте ещё раз.');return false;}
 const poolIndex=endlessPoolIndex(index,pool.length),template=pool[poolIndex-1];
 if(!template)return false;analytics.send('endless_start',{stage:index,source:state().completed.length>=levels.length?'campaign_complete':'returning_player'});startLevel(ENDLESS_BASE+index,'endless',{...template,id:ENDLESS_BASE+index,templateId:template.sourceId||template.id});return true;
}
function startLevel(id,mode='campaign',overrideLevel=null){
 if(!overrideLevel&&(!levels[id-1]||(mode==='campaign'&&id>nextLevel(state()))))return;
 const difficulty=levelDifficulty(overrideLevel||levels[id-1]);
 analytics.send('level_start',{level:id,mode,difficulty:difficulty.tier,wave:difficulty.waveRole,score:difficulty.score});
 const mobile=innerWidth<=900&&(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0);
 if(mobile)void platform.requestFullscreen();
 leaveScreen();ui.screen='game';ui.mode=mode;ui.level=overrideLevel||levels[id-1];ui.combo=0;ui.wordTime=0;ui.firstWordReported=false;ui.abandonReported=false;ui.replay=mode==='campaign'?state().completed.includes(id):mode==='endless'&&id-ENDLESS_BASE<=state().endless.best;
 ui.key=mode==='daily'?`d:${state().daily.day}:${state().daily.step}`:mode==='endless'?endlessKey(id-ENDLESS_BASE):`c:${id}`;
 ui.progress=validateProgress(ui.level,state().progress[ui.key]);
 if(ui.progress.finished)ui.progress=emptyProgress();
 ui.letters=[...ui.level.letters];ui.selected=[];
 if(mode==='campaign')state().lastLevel=id;
 persistLevel();const chapter=mode==='endless'?CHAPTERS[Math.max(0,Math.min(37,(ui.level.visualChapter||1)-1))]:chapterFor(id);setBackground(chapter.id-1);
 app.innerHTML=`<section class="screen game"><header class="topbar"><div class="row">${iconBtn('home','На главную','home')}${iconBtn('map','Карта путешествия','map')}</div><div class="brand-mark">${icon('journey')}<span>Слова: Забытая Экспедиция</span></div><div class="row">${gameCompanion()}${coinPill()}${iconBtn('settings','Настройки','settings')}</div></header><div class="game-heading"><p class="eyebrow">${mode==='daily'?`Маршрут дня · Этап ${state().daily.step+1} из 3`:mode==='endless'?`Бесконечная экспедиция · Этап ${id-ENDLESS_BASE}`:`ГЛАВА ${chapter.id} · ${chapter.title}`}</p><h2>${mode==='daily'?'Маленькое открытие':mode==='endless'?`Новый маршрут · ${id-ENDLESS_BASE}`:`Уровень ${id}`} <span class="muted" style="font-weight:400">· <span id="word-count">${ui.progress.found.length}</span> / ${ui.level.words.length}</span></h2><div class="progress-track"><div class="progress-fill" id="word-progress" style="width:${ui.progress.found.length/ui.level.words.length*100}%"></div></div></div>
 <div class="game-stage"><div class="board-area"><div class="board" role="img" aria-label="Кроссворд: найдено ${ui.progress.found.length} из ${ui.level.words.length} слов" style="--cols:${ui.level.width};--rows:${ui.level.height}"></div><button class="bonus-strip" data-action="bonus">${icon('chest')} Бонусные слова <b id="bonus-bank">${state().bonusBank%econ().bonusChestEvery}/${econ().bonusChestEvery}</b></button></div><div class="controls-area"><button class="word-preview" id="word-preview" data-action="submit" disabled>${initialGamePrompt(mode,id)}</button><div class="wheel" id="wheel" role="group" aria-label="Буквы для составления слов"><svg class="lines" viewBox="0 0 100 100" aria-hidden="true"><polyline points=""/></svg><button class="shuffle-center" data-action="shuffle" aria-label="Перемешать буквы бесплатно" title="Перемешать бесплатно">${icon('shuffle')}</button><div id="letters"></div></div><div class="wheel-actions"><button class="tool-button" data-action="hint"><span class="tool-icon">${icon('hint')}</span><span>Буква</span><b id="hint-cost">${state().freeHints>0?'Бесплатно':`${econ().letterHintCost} ◉`}</b></button><button class="tool-button" data-action="word-hint"><span class="tool-icon">${icon('wordHint')}</span><span>Слово</span><b>${econ().wordHintCost} ◉</b></button><button class="tool-button" data-action="help"><span class="tool-icon">${icon('help')}</span><span>Как играть</span><b>Правила</b></button></div></div></div><footer class="game-footer">${icon('star')}<span id="game-tip" role="status" aria-live="polite" aria-atomic="true">Без спешки. Следующее слово уже где-то рядом.</span></footer></section>`;
 renderBoard();renderLetters();bindWheel();ui.observer=new ResizeObserver(fitBoard);ui.observer.observe(document.querySelector('.board-area'));fitBoard();platform.setGameplay(true);if(!ui.replay)petEvent('departure');
 if(mode==='campaign'&&id===1&&!state().onboardingSeen)showFirstRunTutorial();
 if(mode==='campaign'&&id>1&&(id-1)%8===0&&!ui.replay)modal('chapter-welcome',`<div class="chapter-intro-art" style="background-image:url('${chapterAsset(chapter.id-1,'wide')}')"><span>Глава ${chapter.id} из 38</span></div><p class="eyebrow">Новая запись</p><h2>${escapeHTML(chapter.title)}</h2><p class="chapter-story-copy">${escapeHTML(chapter.storyText)}</p><div class="chapter-intro-relic">${artifactImage(chapter.id)?`<img src="${artifactImage(chapter.id)}" alt="">`:icon('artifact')}<span><small>Находка впереди</small><b>${escapeHTML(chapter.artifact)}</b></span></div>${petCard('expedition')}${btn('close','В путь','arrow','primary wide')}`,{cls:'chapter-intro-modal panel-md'});
}
function persistLevel(){if(!ui.key)return;state().progress[ui.key]=ui.progress;const entries=Object.keys(state().progress);if(entries.length>8)for(const k of entries.slice(0,entries.length-8))if(k!==ui.key)delete state().progress[k];save();}
function fitBoard(){const area=document.querySelector('.board-area');if(!area||!ui.level)return;const rect=area.getBoundingClientRect(),gap=innerWidth<=700?4:5,w=rect.width-12,h=rect.height-46;const cell=Math.max(12,Math.min(51,(w-gap*(ui.level.width-1))/ui.level.width,(h-gap*(ui.level.height-1))/ui.level.height));document.querySelector('.board')?.style.setProperty('--cell',`${Math.floor(cell)}px`);}
function renderBoard(newWord=null){const board=document.querySelector('.board');if(!board)return;const found=new Set(ui.progress.found),revealed=new Set(ui.progress.revealed);board.innerHTML=cellsFor(ui.level).map((cell,i)=>{const open=cell.words.some(w=>found.has(w)),hint=revealed.has(cell.key),newly=newWord&&cell.words.includes(newWord);return `<span class="cell ${open?'found':hint?'revealed':''} ${newly?'new':''}" style="grid-column:${cell.x+1};grid-row:${cell.y+1};--i:${i%7}" data-cell="${cell.key}">${open||hint?cell.letter:''}</span>`;}).join('');board.setAttribute('aria-label',`Кроссворд: найдено ${found.size} из ${ui.level.words.length} слов`);document.querySelector('#word-count').textContent=found.size;document.querySelector('#word-progress').style.width=`${found.size/ui.level.words.length*100}%`;if(newWord)companionReact('word_correct');}
function position(i){const a=(-90+i*360/ui.letters.length)*Math.PI/180;return {x:50+35*Math.cos(a),y:50+35*Math.sin(a)};}
function renderLetters(){document.querySelector('#letters').innerHTML=ui.letters.map((c,i)=>{const p=position(i);return `<button class="letter" data-letter="${i}" aria-label="Буква ${c}" style="--x:${p.x};--y:${p.y}">${c}</button>`;}).join('');updateSelection();updateTutorialGuide();clearTimeout(ui.companionIdleTimer);ui.companionIdleTimer=setTimeout(()=>{ui.companionIdleTimer=null;companionReact('idle');},22000);}
function updateSelection(point=null){const word=ui.selected.map(i=>ui.letters[i]).join('');document.querySelectorAll('.letter').forEach(el=>{const selected=ui.selected.includes(+el.dataset.letter);el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});const preview=document.querySelector('#word-preview');if(!preview)return;const emptyPrompt=initialGamePrompt(ui.mode,ui.level?.id||0);preview.disabled=!word;preview.innerHTML=word?escapeHTML(word)+icon('check'):emptyPrompt;preview.setAttribute('aria-label',word?`Отправить слово ${word}`:emptyPrompt);const points=ui.selected.map(position);if(point&&points.length)points.push(point);document.querySelector('.lines polyline')?.setAttribute('points',points.map(p=>`${p.x},${p.y}`).join(' '));}
function selectLetter(index){if(index<0)return;const selected=ui.selected;if(selected.at(-1)===index)return;if(selected.length>1&&selected.at(-2)===index)selected.pop();else if(!selected.includes(index)){selected.push(index);audio.play('select',selected.length-1);}updateSelection();}
function interactive(){return ui.screen==='game'&&!ui.modal&&!platform.paused&&!ui.progress?.finished;}
function bindWheel(){const wheel=document.querySelector('#wheel');wheel.addEventListener('pointerdown',e=>{if(!interactive()||e.button!==0)return;const node=e.target.closest('[data-letter]');if(!node)return;e.preventDefault();audio.unlock();const index=+node.dataset.letter;if(ui.selected.includes(index)&&ui.selected.length===1)ui.selected=[];selectLetter(index);ui.drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};wheel.setPointerCapture(e.pointerId);});
 wheel.addEventListener('pointermove',e=>{if(!ui.drag||ui.drag.id!==e.pointerId||!interactive())return;const r=wheel.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width*100,y:(e.clientY-r.top)/r.height*100};if(Math.hypot(e.clientX-ui.drag.x,e.clientY-ui.drag.y)>8)ui.drag.moved=true;const hit=ui.letters.findIndex((_,i)=>{const q=position(i);return Math.hypot(q.x-p.x,q.y-p.y)<11.5;});if(hit>=0)selectLetter(hit);updateSelection(p);});
 wheel.addEventListener('pointerup',e=>{if(!ui.drag||ui.drag.id!==e.pointerId)return;const moved=ui.drag.moved;ui.drag=null;if(wheel.hasPointerCapture(e.pointerId))wheel.releasePointerCapture(e.pointerId);if(moved)submit();else updateSelection();});
 wheel.addEventListener('pointercancel',()=>{ui.drag=null;ui.selected=[];updateSelection();});
 wheel.addEventListener('lostpointercapture',()=>{if(ui.drag){ui.drag=null;ui.selected=[];updateSelection();}});
 wheel.addEventListener('click',e=>{const node=e.target.closest('[data-letter]');if(node&&e.detail===0&&interactive())selectLetter(+node.dataset.letter);});
}
function submit(){
 if(!interactive()||!ui.selected.length)return;const input=ui.selected.map(i=>ui.letters[i]).join('');ui.selected=[];ui.drag=null;updateSelection();const result=classifyWord(ui.level,ui.progress,input);
 if(result.kind==='target'){
  analytics.send('word_found',{level:ui.level.id,word_length:result.word.length,mode:ui.mode});if(!ui.firstWordReported){ui.firstWordReported=true;analytics.send('first_word_found',{level:ui.level.id,mode:ui.mode});}ui.progress.found.push(result.word);if(ui.tutorialActive&&result.word===ui.tutorialWord)finishFirstRunTutorial();if(!ui.replay)state().wordsTotal++;const now=performance.now();ui.combo=now-ui.wordTime<15000?ui.combo+1:1;ui.wordTime=now;audio.play('success');renderBoard(result.word);persistLevel();const tip=document.querySelector('#game-tip');if(tip){if(ui.combo>=2)tip.textContent=`Отличная серия! ${ui.combo} слова подряд`;else if(ui.progress.found.length<ui.level.words.length){const left=ui.level.words.length-ui.progress.found.length;tip.textContent=left===1?'Последнее слово уже рядом.':`Ещё ${left} слова в этом этапе.`;}else tip.textContent='Маршрут собран — открываем находку.';}if(ui.progress.found.length===ui.level.words.length)completeLevel();return;
 }
 if(result.kind==='bonus'){
  analytics.send('bonus_word',{level:ui.level.id,word_length:result.word.length,mode:ui.mode});ui.progress.bonus.push(result.word);if(!ui.replay){const c=econ();petEvent('bonus');state().bonusTotal++;state().wordsTotal++;state().bonusBank++;const chest=state().bonusBank%c.bonusChestEvery===0,gain=c.bonusWordCoins+(chest?c.bonusChestCoins:0);state().coins+=gain;toast(chest?`${result.word} · Сундук открыт! +${gain} монет`:`${result.word} · Бонусное слово! +${gain} монет`);}else toast(`${result.word} · Бонусное слово`);const chestOpened=!ui.replay&&state().bonusBank%econ().bonusChestEvery===0;const strip=document.querySelector('.bonus-strip');if(strip){strip.classList.remove('is-gain','is-chest');void strip.offsetWidth;strip.classList.add(chestOpened?'is-chest':'is-gain');setTimeout(()=>strip.classList.remove('is-gain','is-chest'),1000);}document.querySelector('#bonus-bank').textContent=`${state().bonusBank%econ().bonusChestEvery}/${econ().bonusChestEvery}`;audio.play('success');persistLevel();return;
 }
 ui.combo=0;audio.play('error');const board=document.querySelector('.wheel');board.classList.remove('shake');void board.offsetWidth;board.classList.add('shake');setTimeout(()=>board.classList.remove('shake'),500);toast(result.kind==='duplicate'?'Это слово уже найдено':result.kind==='short'?'Нужно хотя бы 3 буквы':'Этого слова нет в словаре уровня. Попробуйте другое.');
}
function shuffle(){if(!interactive())return;ui.selected=[];ui.drag=null;let arr=ui.letters.slice();for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}if(arr.join('')===ui.letters.join(''))arr.push(arr.shift());ui.letters=arr;renderLetters();audio.play('click');}
function hint(word=false){if(!interactive())return;analytics.send('hint_opened',{level:ui.level.id,mode:ui.mode,type:word?'word':'letter'});const entries=ui.level.words.filter(w=>!ui.progress.found.includes(w.word));if(!entries.length)return;
 const all=cellsFor(ui.level),closed=all.filter(c=>!ui.progress.revealed.includes(c.key)&&!c.words.some(w=>ui.progress.found.includes(w)));
 if(!word&&!closed.length){toast('Все буквы открыты — осталось составить слова');return;}
 const free=!word&&state().freeHints>0,cost=word?econ().wordHintCost:econ().letterHintCost;
 if(!free&&state().coins<cost){const adOk=platform.sdk?.adv&&rewardedRemaining('ad-hint')>0,need=cost-state().coins;modal('need-coins',`${icon('hint','hero-icon')}<h2>Немного помощи?</h2><p>Для ${word?'целого слова':'одной буквы'} нужно ${cost} ◉, у вас ${state().coins}. Не хватает ${need} ◉.</p>${adOk?btn('ad-hint',`Реклама · открыть одну букву · ${rewardedRemaining('ad-hint')} осталось`,'video','primary wide'):''}<p class="small center">${word?'Целое слово можно получить по одной букве за монеты.':'Бесплатная подсказка приходит с наградами и спутниками.'}</p>${btn('gift','Проверить ежедневный подарок','gift','secondary wide')}${btn('close','Продолжить решать','',adOk?'secondary wide':'primary wide')}`);return;}
 if(free)state().freeHints--;else store.spend(cost);ui.progress.hints++;
 if(word){const entry=entries[0];ui.progress.found.push(entry.word);if(ui.tutorialActive&&entry.word===ui.tutorialWord)finishFirstRunTutorial('first_word_hint');renderBoard(entry.word);if(!ui.replay)state().wordsTotal++;}
 else{const cell=closed[Math.floor(Math.random()*closed.length)];ui.progress.revealed.push(cell.key);renderBoard();const hinted=document.querySelector(`[data-cell="${CSS.escape(cell.key)}"]`);if(hinted){hinted.classList.add('hinted');setTimeout(()=>hinted.classList.remove('hinted'),1200)}}
 ui.selected=[];updateSelection();audio.play('success');persistLevel();document.querySelector('#hint-cost').textContent=state().freeHints>0?'Бесплатно':`${econ().letterHintCost} ◉`;if(ui.progress.found.length===ui.level.words.length)completeLevel();}
function bonusModal(){if(ui.screen!=='game'||!ui.progress)return;const c=econ(),every=c.bonusChestEvery,remaining=Math.max(0,ui.level.bonus.length-ui.progress.bonus.length),radar=ui.progress.radar===true;modal('bonus',`${icon(state().bonusBank>0&&state().bonusBank%every===0?'chestOpen':'chest','hero-icon')}<h2>Между строк</h2><p>Каждое бонусное слово приносит ${c.bonusWordCoins} монет. За каждые ${every} — ещё ${c.bonusChestCoins} монет из сундука.</p><div class="reward-box"><strong>${state().bonusBank%every} / ${every}</strong><span class="small">до следующего сундука</span></div>${radar?`<p class="small center">Радар: осталось бонусных слов — <b>${remaining}</b>.</p>`:btn('bonus-radar',`Радар бонусов · ${c.bonusRadarCost} ◉`,'compass','secondary wide')}<div class="found-words">${ui.progress.bonus.map(w=>`<span>${w}</span>`).join('')||'<p>Попробуйте найти дополнительное слово!</p>'}</div>${btn('close','Продолжить','arrow','primary wide')}`);}
function completeLevel(){if(ui.progress.finished)return;document.querySelector('.game')?.classList.add('level-complete');
 analytics.send('level_complete',{level:ui.level.id,mode:ui.mode,hints:ui.progress.hints,stars:levelStars(ui.progress.hints)});ui.progress.finished=true;platform.setGameplay(false);const s=state(),id=ui.level.id,starsEarned=levelStars(ui.progress.hints);
 let reward=0,hearts=0,chapterDone=false,campaignFinale=false,dailyDone=false,milestoneReached=false,milestoneTitle=null,milestoneReward=null,companionUnlocked=null,goalsReady=[],companionRewards=[];
 if(ui.mode==='campaign'){
  const completion=applyCampaignCompletion(s,{id,starsEarned,economy:econ(),levelsTotal:levels.length});
  reward=completion.reward;hearts=completion.hearts;chapterDone=completion.chapterDone;campaignFinale=completion.campaignFinale;
  unlockCaptains(s,c=>analytics.send('captain_unlocked',{captain:c.id,source:'achievement'}));
  if(chapterDone)analytics.send('chapter_progress',{chapter:Math.ceil(id/8),completed:s.completed.length});
  if(completion.firstCompletion&&id===1)analytics.send('activation_level_complete',{level:1,stars:starsEarned});
  if(campaignFinale)analytics.send('campaign_complete',{levels:levels.length,stars:starsTotal(s)});
}
else if(ui.mode==='endless'){
  const completion=applyEndlessCompletion(s,{index:id-ENDLESS_BASE,economy:econ(),day:dateKey(platform.now()),replay:ui.replay});
  reward=completion.reward;hearts=completion.hearts;milestoneReached=completion.milestoneReached;milestoneTitle=completion.milestoneTitle;milestoneReward=completion.milestoneReward;
  if(milestoneReached)analytics.send('endless_milestone',{level:completion.index,title:milestoneTitle,reward:milestoneReward});
  unlockCaptains(s,c=>analytics.send('captain_unlocked',{captain:c.id,source:'endless'}));
  if(completion.index>completion.previousBest)void platform.leaderboardSubmit(liveConfig.leaderboards.endless,completion.index,'best:'+completion.index);
}
else{
  const completion=applyDailyCompletion(s,{economy:econ()});
  reward=completion.reward;hearts=completion.hearts;dailyDone=completion.dailyDone;
}
 if(!ui.replay&&ui.mode!=='daily'){const key=weekKey(platform.now()),cfg=weeklyCfg();if(s.weekly.key!==key)s.weekly={key,steps:0,claimed:false};s.weekly.steps=Math.min(cfg.steps,s.weekly.steps+1);}
 if(chapterDone&&id===8&&!ui.replay&&!s.pets.includes('owl')){s.pets.push('owl');s.petLevels.owl??=1;if(!s.activePet)s.activePet='owl';companionUnlocked='owl';analytics.send('companion_unlocked',{companion:'owl',source:'chapter'});}
 goalsReady=GOALS.filter(goal=>!s.goals.includes(goal.id)&&goalValue(goal,s,starsTotal)>=goal.need).map(goal=>goal.id);
 if(!ui.replay){const note=e=>{const r=petEvent(e);if(r)companionRewards.push(r);};if(chapterDone)note('chapter');if(dailyDone)note('daily');if(milestoneReached)note('milestone');if(starsEarned===3)note('perfect');note('victory');}persistLevel();void platform.flush();audio.play('win');ui.finishTimer=setTimeout(()=>victory({reward,hearts,starsEarned,chapterDone,campaignFinale,dailyDone,companionUnlocked,milestoneTitle,milestoneReward,goalsReady,companionRewards}),550);
}
function victory(result){
 ui.victoryResult=result;const rendered=renderVictory({ui,state,chapterFor,artifactImage,icon,stars,btn,modal,save,celebrate},result);
 if(ui.modal==='victory'&&!result.doubled&&result.reward>0&&rewardedRemaining('ad-double')>0){
   modalRoot.querySelector('.result-footer')?.insertAdjacentHTML('afterbegin',btn('ad-double','Реклама · удвоить монеты','video','secondary wide'));
 }
 return rendered;
}
function celebrate(){if(!state().settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=document.createElement('div');el.className='celebrate';el.setAttribute('aria-hidden','true');el.innerHTML=Array.from({length:30},(_,i)=>`<i class="confetti" style="--left:${Math.random()*100}%;--color:${['#f9d78e','#8ee0b8','#fef1d7'][i%3]};--delay:${Math.random()*.45}s"></i>`).join('');document.body.append(el);setTimeout(()=>el.remove(),3000);}
function modalFocusables(){return [...modalRoot.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(el=>!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&el.offsetParent!==null);}
function focusDescriptor(element){if(!element?.dataset?.action)return null;return {action:element.dataset.action,id:element.dataset.id||null};}
function focusFromDescriptor(descriptor){if(!descriptor)return null;return [...modalRoot.querySelectorAll("[data-action=\""+CSS.escape(descriptor.action)+"\"]")].find(element=>!descriptor.id||element.dataset.id===descriptor.id)||null;}
function modal(type,html,{close=true,center=false,cls=''}={}){
  const current=ui.modal;
  if(current&&current!==type){
    const m=modalRoot.querySelector('.modal');
    ui.modalStack.push({type:current,html:modalRoot.innerHTML,scroll:m?m.scrollTop:0,closable:ui.modalClosable,focus:focusDescriptor(document.activeElement),previousFocus:ui.previousFocus,stack:ui.modalStack.slice()});
  }else if(!current){ui.previousFocus=document.activeElement;ui.modalStack=[];}
  ui.modal=type;ui.modalClosable=!!close;ui.drag=null;ui.selected=[];
  if(ui.screen==='game')updateSelection();
  platform.pause('modal',true);app.inert=true;
  const prevScroll=(current===type&&modalRoot.querySelector('.modal'))?modalRoot.querySelector('.modal').scrollTop:0;
  const autoClass=(type==='gift'||type==='daily'||type==='weekly'||type==='wallet')?'panel-sm':type==='leaderboard'?'panel-md':'';
  modalRoot.innerHTML=`<section class="modal ${center?'center':''} ${autoClass} ${cls}" data-modal-type="${type}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${close?btn('close','','close','icon-button close-modal','aria-label="Закрыть"'):''}${html}</section>`;
  const box=modalRoot.querySelector('.modal');if(box&&current===type&&prevScroll)box.scrollTop=Math.min(prevScroll,box.scrollHeight-box.clientHeight);
  const title=modalRoot.querySelector('h2');if(title){title.id='modal-title';box?.setAttribute('aria-labelledby','modal-title');}const description=modalRoot.querySelector('p:not(.eyebrow)');if(description&&box){description.id='modal-description';box.setAttribute('aria-describedby','modal-description');}
  queueMicrotask(()=>{const anchor=ui.focusAnchor?modalRoot.querySelector(ui.focusAnchor):null;ui.focusAnchor=null;const target=(anchor&&!anchor.disabled)?anchor:modalRoot.querySelector('[data-modal-focus]')||modalFocusables()[0];target?.focus({preventScroll:true});});
}
function closeModal(restore=true){
  const top=ui.modalStack.at(-1);
  if(ui.modalStack.length&&restore){
    const parentFocus=top.previousFocus,parentStack=top.stack||[],focus=top.focus;
    ui.modalStack.pop();ui.modal=null;ui.modalClosable=top.closable;
    const fresh={wallet,shop,gift,goals,daily,weekly,profile,showSettings,help,petsPage}[top.type];
    if(fresh){fresh();ui.previousFocus=parentFocus;ui.modalStack=parentStack;queueMicrotask(()=>{(focusFromDescriptor(focus)||modalFocusables()[0])?.focus({preventScroll:true});});return;}
    ui.modal=top.type;modalRoot.innerHTML=top.html;const m=modalRoot.querySelector('.modal');if(m){m.scrollTop=Math.min(top.scroll,m.scrollHeight-m.clientHeight);}
    ui.previousFocus=parentFocus;ui.modalStack=parentStack;queueMicrotask(()=>{(focusFromDescriptor(focus)||modalFocusables()[0])?.focus({preventScroll:true});});
    return;
  }
  if(restore&&ui.screen==='game'&&ui.progress?.finished&&ui.modalStack.length===0){home();return;}
  ui.modal=null;ui.modalStack=[];app.inert=false;modalRoot.innerHTML='';platform.pause('modal',false);
  if(restore&&ui.previousFocus?.isConnected)ui.previousFocus.focus({preventScroll:true});
}
async function adReward(kind){
 const remaining=rewardedRemaining(kind);if(remaining<=0){toast('Дневной лимит этой рекламной награды исчерпан.');return;}analytics.send('rewarded_requested',{kind});if(ui.adRewardBusy)return;ui.adRewardBusy=true;const targetKey=ui.key;const button=modalRoot.querySelector(`[data-action="${kind}"]`);if(button){button.disabled=true;button.textContent='Открываем рекламу…';}
 const got=await platform.rewarded();ui.adRewardBusy=false;
 if(got){const r=ensureRewardedDay();analytics.send('rewarded_completed',{kind});if(kind==='ad-hint'){r.hints++;state().freeHints++;save();closeModal();if(ui.screen==='game'&&ui.key===targetKey)hint(false);else toast('Бесплатная подсказка получена');}else{r.coins++;state().coins+=rewardedCfg().coins;save();wallet();toast(`Получено ${rewardedCfg().coins} монет`);}void platform.flush();}
 else{if(button?.isConnected){button.disabled=false;button.innerHTML=icon('video')+(kind==='ad-hint'?`Реклама · открыть одну букву · ${rewardedRemaining(kind)} осталось`:`Реклама · +${rewardedCfg().coins} монет · ${rewardedRemaining(kind)} осталось`);}toast('Реклама сейчас недоступна. Можно продолжать игру.');}
}
async function adDoubleReward(){
 const result=ui.victoryResult;if(!result||ui.modal!=='victory'||result.doubled||result.reward<=0)return;
 const remaining=rewardedRemaining('ad-double');if(remaining<=0){toast('Сегодня удваивать награду больше нельзя.');victory(result);return;}
 if(ui.adRewardBusy)return;ui.adRewardBusy=true;analytics.send('rewarded_requested',{kind:'ad-double',placement:'victory',level:ui.level?.id,mode:ui.mode});
 const got=await platform.rewarded();ui.adRewardBusy=false;
 if(!got){analytics.send('rewarded_failed',{kind:'ad-double',placement:'victory'});toast('Реклама сейчас недоступна. Награда не изменена.');victory(result);return;}
 const r=ensureRewardedDay();r.doubles++;state().coins+=result.reward;save();void platform.flush();analytics.send('rewarded_completed',{kind:'ad-double',placement:'victory',reward:result.reward});victory({...result,reward:result.reward*2,doubled:true});toast(`Награда удвоена: +${result.reward} монет`);
}
async function action(name,id,trigger=null){if(ui.adRewardBusy)return;if(platform.paused&&!ui.modal&&name!=='close')return;if(['daily','album','pets','profile','weekly','leaderboard','goals','wallet','shop','endless'].includes(name)){analytics.send('feature_open',{feature:name});}
 if(name==='weekly'){weekly();return;}if(name==='leaderboard'){await leaderboard();return;}if(name==='weekly-claim'){const cfg=weeklyCfg(),result=claimWeekly(state(),weekKey(platform.now()),cfg);if(!result.ok){weekly();return;}save();weekly();toast(`Недельная награда: +${result.coins} монет и ${result.hearts} ед. сердец`);return;}
 if(name==='onboarding-close'){analytics.send('tutorial_step',{step:'complete'});state().onboardingSeen=true;save();closeModal(false);startLevel(nextLevel(state()));return;}
 switch(name){case 'discover-pets':state().discoverySeen=true;save();petsPage();break;case 'home':home();break;case 'continue':{const destination=nextLevel(state());analytics.send('route_continue',{source:'journey',destination:state().completed.length>=levels.length?'endless':destination});if(state().completed.length>=levels.length)await startEndless();else startLevel(destination);break;}case 'map':mapPage();break;case 'album':albumPage();break;case 'artifact':artifact(+id);break;case 'story':story(+id);break;case 'pets':petsPage();break;case 'profile':profile();break;case 'captain-select':{const c=captainById(id);if(!captainIsUnlocked(c,state()))return;state().activeCaptain=id;save();analytics.send('captain_selected',{captain:id});profile();break;}case 'profile-set':{const owned=state().inventory.includes(id)||id.endsWith('default');if(!owned)return;if(id.startsWith('portrait-'))state().profile.portrait=id;else if(id.startsWith('frame-'))state().profile.frame=id;else if(id.startsWith('title-'))state().profile.title=id;save();ui.focusAnchor=`[data-action="profile-set"][data-id="${CSS.escape(id)}"]`;profile();break;}case 'level':startLevel(+id);break;
 case 'settings':showSettings();break;case 'help':help();break;case 'close':closeModal();break;case 'wallet':wallet();break;case 'shop':shop();break;case 'shop-buy':{const result=buyShopItem(store,id);if(!result.ok){if(result.reason==='funds')toast('Пока не хватает монет');return;}save();analytics.send('shop_purchase',{item:result.item.id,currency:'coins',cost:result.item.cost});shop();toast(`${result.item.title} добавлен в дневник`);break;}case 'purchase-no-ads':{pendingButton(trigger);const result=await commerce.buy(liveConfig.catalog.no_ads);if(!result.ok){restorePendingButton(trigger);toast(result.reason==='cloud-unavailable'?'Сначала включите облачное сохранение Яндекс Игр.':result.reason==='cancel'?'Покупка сейчас недоступна.':result.reason==='busy'?'Другая операция с покупкой уже выполняется.':'Не удалось подтвердить покупку.');break;}shop();toast('Реклама между уровнями отключена');break;}case 'purchase-starter':{pendingButton(trigger);const result=await commerce.buy(liveConfig.catalog.starter_explorer);if(!result.ok){restorePendingButton(trigger);toast(result.reason==='cloud-unavailable'?'Сначала включите облачное сохранение Яндекс Игр.':result.reason==='cancel'?'Покупка сейчас недоступна.':result.reason==='busy'?'Другая операция с покупкой уже выполняется.':'Не удалось подтвердить покупку.');break;}shop();if(result.changed)toast('Набор исследователя добавлен в экспедицию');break;}case 'restore-purchases':{if(!commerceAvailable())break;pendingButton(trigger,'Проверяем…');analytics.send('purchase_restore_start');const result=await commerce.recover();if(result.restored){analytics.send('purchase_restore_success');shop();toast('Покупки восстановлены');}else{restorePendingButton(trigger);analytics.send('purchase_restore_empty');toast(result.reason==='cloud-unavailable'?'Сначала включите облачное сохранение Яндекс Игр.':result.reason==='busy'?'Другая операция с покупкой уже выполняется.':'Покупок для восстановления не найдено.');}break;}case 'gift':gift();break;case 'goals':goals();break;case 'daily':daily();break;case 'daily-start':analytics.send('daily_started',{day:state().daily.day,step:state().daily.step});startDaily();break;case 'endless':await startEndless();break;case 'shuffle':shuffle();break;case 'submit':submit();break;case 'hint':hint();break;case 'word-hint':hint(true);break;
 case 'toggle':if(['sound','music','motion','companionReactions'].includes(id)){state().settings[id]=!state().settings[id];save();updateSettings();const sw=modalRoot.querySelector(`[data-action="toggle"][data-id="${id}"]`);if(sw){sw.classList.toggle('on',state().settings[id]);sw.setAttribute('aria-checked',String(state().settings[id]));sw.focus({preventScroll:true});}}break;
 case 'gift-claim':{const s=state(),today=dateKey(platform.now()),offer=dailyGiftOffer(s,today,previousDay(platform.now()));if(offer.claimed)return;s.gift={day:today,streak:offer.streak};s.coins+=offer.reward;save();gift();toast(`Подарок получен: +${offer.reward} монет`);break;}
 case 'goal-claim':{const result=claimGoal(state(),id,starsTotal);if(!result.ok)return;save();goals();toast(`+${result.coins} монет и ${result.hearts} ед. сердец`);break;}
 case 'bonus':bonusModal();break;
 case 'bonus-radar':{if(ui.screen!=='game'||ui.progress.radar)return;const cost=econ().bonusRadarCost;if(!store.spend(cost)){toast('Пока не хватает монет для радара');return;}ui.progress.radar=true;analytics.send('bonus_radar_used',{level:ui.level.id,mode:ui.mode,cost});persistLevel();bonusModal();break;}
 case 'next':{const mode=ui.mode,id=ui.level.id,finale=ui.victoryResult?.campaignFinale===true;analytics.send('route_next',{mode,level:id,finale});closeModal(false);if(mode!=='endless'&&state().completed.length<=liveConfig.ads.earlyLevelSkip)analytics.send('interstitial_skipped',{reason:'early_levels'});else await platform.interstitial();if(mode==='daily'){if(state().daily.claimed)home();else startDaily();}else if(mode==='endless'){await startEndless(id-ENDLESS_BASE+1);}else if(finale||state().completed.length===levels.length)await startEndless();else {const destination=nextLevel(state());if(destination<=levels.length)startLevel(destination);else await startEndless();}break;}
 case 'chapter-story':artifact(chapterFor(ui.level.id).id);break;
 case 'sync':{modal('sync','<h2>Открываем ваш дневник…</h2><p>Проверяем облачное сохранение.</p>',{close:false});const synced=await platform.loadCloud();if(synced){home();toast('Прогресс синхронизирован');}else{showSettings();toast('Облако пока недоступно. Прогресс на устройстве сохранён.');}break;}
 case 'ad-coins':case 'ad-hint':await adReward(name);break;case 'ad-double':await adDoubleReward();break;
 default:if(name.startsWith('pet-'))petAction(name,id);
 }
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled)return;if(platform.reasons.has('ad')||platform.reasons.has('platform')||platform.reasons.has('hidden'))return;audio.unlock();if(!['submit','shuffle','hint','word-hint'].includes(el.dataset.action))audio.play('click');void action(el.dataset.action,el.dataset.id,el);});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey)return;if(ui.modal){if(e.key==='Escape'){e.preventDefault();if(!ui.adRewardBusy&&ui.modalClosable)closeModal();}if(e.key==='Tab'){const list=modalFocusables();if(!list.length)return;const i=list.indexOf(document.activeElement);if(i<0){e.preventDefault();(e.shiftKey?list.at(-1):list[0]).focus();}else if(e.shiftKey&&i===0){e.preventDefault();list.at(-1).focus();}else if(!e.shiftKey&&i===list.length-1){e.preventDefault();list[0].focus();}}return;}
 if(!interactive())return;if(e.repeat)return;if(e.key==='Enter'){if(document.activeElement?.matches('[data-action]')&&document.activeElement.id!=='word-preview'&&!ui.selected.length)return;e.preventDefault();submit();return;}if(e.key==='Backspace'){e.preventDefault();ui.selected.pop();updateSelection();return;}if(e.key==='Escape'){ui.selected=[];updateSelection();return;}
 const letter=keyboardLetter(e.key,e.code);if(!letter)return;e.preventDefault();audio.unlock();const index=ui.letters.findIndex((l,i)=>l===letter&&!ui.selected.includes(i));if(index>=0)selectLetter(index);
});
document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('dragstart',e=>e.preventDefault());
platform.listeners.push(paused=>{audio.setPaused(paused);document.querySelector('#pause-shield').hidden=!(platform.reasons.has('hidden')||platform.reasons.has('platform')||platform.reasons.has('ad'));if(paused&&ui.screen==='game'){ui.drag=null;ui.selected=[];updateSelection();}});
document.addEventListener('visibilitychange',()=>{platform.pause('hidden',document.hidden);if(document.hidden){store.persist();void platform.flush();}});
window.addEventListener('blur',()=>platform.pause('blur',true));window.addEventListener('focus',()=>{platform.pause('blur',false);});
window.addEventListener('pagehide',()=>{store.persist();void platform.flush();});window.addEventListener('resize',()=>{ui.drag=null;if(ui.screen!=='game')return;const keep=ui.selected.slice();requestAnimationFrame(()=>{ui.selected=keep;fitBoard();updateSelection();updateTutorialGuide();});});
window.addEventListener('online',()=>{void platform.flush();});
async function boot(){try{analytics.init();analytics.send('session_start');analytics.send('boot_start');
 const dataPromise=fetchJson('./levels.json',{attempts:2,timeoutMs:8000,retryDelayMs:250});
 const configPromise=fetchJson('./live-config.json',{attempts:2,timeoutMs:5000,retryDelayMs:150}).catch(()=>({}));
 const sdkPromise=platform.init();
 const bootImage=chapterAsset(0,matchMedia('(max-width:700px)').matches?'portrait':'wide');
 const assetsPromise=Promise.allSettled([document.fonts.load('700 16px Golos'),document.fonts.load('900 32px Mulish'),new Promise(resolve=>{const image=new Image();image.onload=resolve;image.onerror=resolve;image.src=bootImage;})]);
 const [levelData,localConfig]=await Promise.all([dataPromise,configPromise]);levels=levelData;if(!Array.isArray(levels)||levels.length!==304)throw new Error('Invalid level catalog');
 await Promise.all([sdkPromise,Promise.race([assetsPromise,new Promise(r=>setTimeout(r,3500))])]);const normalized=normalizeConfig(localConfig),flags=await platform.flags(configDefaultFlags(normalized));liveConfig=applyRemoteFlags(normalized,flags);platform.configure(liveConfig);analytics.send('config_loaded',{version:liveConfig.version,remote:!!platform.sdk?.getFlags});updateSettings();home();await new Promise(requestAnimationFrame);platform.ready();analytics.send('boot_ready',{sdk:!!platform.sdk,cloud:platform.cloudReady});
 if(platform.sdk&&commerceAvailable())void (async()=>{await commerce.loadCatalog();await commerce.recover();if(ui.modal==='shop')screens.shop();else if(ui.screen==='home')screens.home();})();
 if(!store.persistent)toast('Браузер не разрешает сохранение на устройстве');
 if(!state().onboardingSeen){if(!activationStarted){activationStarted=true;analytics.send('activation_start',{entry:'first_level',level:nextLevel(state())});}queueMicrotask(()=>startLevel(nextLevel(state())));}
 }catch(error){console.error('Game could not start:',error);analytics.send('boot_error',{error:error?.name||'unknown'});app.innerHTML=`<div class="loading fatal"><h1>Не удалось открыть карту</h1><p>Проверьте соединение и попробуйте загрузить игру ещё раз.</p><button class="primary" id="retry">Попробовать снова</button></div>`;document.querySelector('#retry').onclick=()=>location.reload();}}
void boot();
