export const SHOP_ITEMS=Object.freeze([
 {id:'portrait-owl',title:'Портрет совы',description:'Для вашей карточки капитана',cost:300,icon:'owlPortrait'},
 {id:'captain-lighthouse',title:'Капитан маяка',description:'Косметический образ для профиля и рейтинга',cost:420,icon:'lantern'},
 {id:'captain-north',title:'Капитан северного маршрута',description:'Косметический образ для профиля и рейтинга',cost:520,icon:'snow'},
 {id:'portrait-fox',title:'Портрет лиса',description:'Для вашей карточки капитана',cost:300,icon:'foxPortrait'},
 {id:'frame-sunset',title:'Рамка «Закат»',description:'Тёплая медная рамка',cost:400,icon:'star'},
 {id:'title-pathfinder',title:'Титул «Следопыт»',description:'Подпись в профиле капитана',cost:250,icon:'map'},
 {id:'title-keeper',title:'Титул «Хранитель слов»',description:'Подпись в профиле капитана',cost:600,icon:'book'},
 {id:'portrait-cartographer',title:'Эмблема картографа',description:'Для профиля и таблицы рекордов',cost:300,icon:'compass'},
 {id:'frame-patina',title:'Рамка «Патина»',description:'Спокойная рамка для портрета',cost:450,icon:'star'},
 {id:'camp-lantern',title:'Фонарь лагеря',description:'Косметика главного экрана',cost:220,icon:'gift'},
 {id:'letters-seaglass',title:'Тема «Морское стекло»',description:'Оформление букв и найденных клеток',cost:500,icon:'spark'},
 {id:'hint-supply',title:'Запас подсказок',description:'Сразу +2 бесплатные буквенные подсказки',cost:60,icon:'hint',repeatable:true,effect:'hints',amount:2},
 {id:'heart-supply',title:'Полевой запас',description:'Сразу +3 сердца для команды',cost:75,icon:'heart',repeatable:true,effect:'hearts',amount:3}
]);

export const GOALS=Object.freeze([
 {id:'first',title:'Первое открытие',description:'Пройти первый уровень',need:1,type:'levels',reward:20},
 {id:'eight',title:'За край карты',description:'Пройти 8 уровней',need:8,type:'levels',reward:60},
 {id:'words50',title:'Чувство слова',description:'Найти 50 слов',need:50,type:'words',reward:50},
 {id:'bonus20',title:'Между строк',description:'Найти 20 бонусных слов',need:20,type:'bonus',reward:60},
 {id:'stars60',title:'Звёздный путь',description:'Собрать 60 звёзд',need:60,type:'stars',reward:80},
 {id:'levels40',title:'Исследователь',description:'Пройти 40 уровней',need:40,type:'levels',reward:100},
 {id:'words250',title:'Знаток слов',description:'Найти 250 слов',need:250,type:'words',reward:100},
 {id:'levels100',title:'Большое путешествие',description:'Пройти 100 уровней',need:100,type:'levels',reward:200},
 {id:'stars400',title:'Под счастливой звездой',description:'Собрать 400 звёзд',need:400,type:'stars',reward:200},
 {id:'all',title:'Легенда искателей',description:'Пройти все 304 уровня',need:304,type:'levels',reward:500},
 {id:'words1000',title:'Словесный атлас',description:'Найти 1000 слов',need:1000,type:'words',reward:250},
 {id:'bonus100',title:'Охотник за тайнами',description:'Найти 100 бонусных слов',need:100,type:'bonus',reward:180},
 {id:'stars900',title:'Созвездие экспедиции',description:'Собрать 900 звёзд',need:900,type:'stars',reward:300},
 {id:'levels200',title:'Дальний маршрут',description:'Пройти 200 уровней',need:200,type:'levels',reward:350},
 {id:'chapters10',title:'Собиратель историй',description:'Открыть 10 артефактов',need:10,type:'chapters',reward:220},
 {id:'captains3',title:'Командный состав',description:'Разблокировать 3 капитанов',need:3,type:'captains',reward:180},
 {id:'pets6',title:'Верная команда',description:'Собрать 6 спутников',need:6,type:'pets',reward:180},
 {id:'endless100',title:'За пределами карты',description:'Пройти 100-й этап бесконечной экспедиции',need:100,type:'endless',reward:250},
 {id:'streak7',title:'Неделя в пути',description:'Забрать 7 ежедневных подарков подряд',need:7,type:'streak',reward:160},
 {id:'endless500',title:'Вечный маршрут',description:'Пройти 500-й этап бесконечной экспедиции',need:500,type:'endless',reward:500},
 {id:'endless1000',title:'Легенда бесконечного пути',description:'Пройти 1000-й этап бесконечной экспедиции',need:1000,type:'endless',reward:700},
 {id:'endless2000',title:'Легенда второго круга',description:'Пройти 2000-й этап бесконечной экспедиции',need:2000,type:'endless',reward:1200}
]);

export function weekKey(now){
 const d=new Date(now),day=d.getUTCDay()||7;
 d.setUTCDate(d.getUTCDate()-day+1);
 return d.toISOString().slice(0,10);
}

export function goalValue(goal,state,starsTotal){
 return {levels:state.completed.length,words:state.wordsTotal,bonus:state.bonusTotal,stars:starsTotal(state),chapters:Math.floor(state.completed.length/8),captains:Math.max(0,(state.captains?.length||1)-1),pets:state.pets?.length||0,endless:state.endless?.best||0,streak:state.gift?.streak||0}[goal.type]??0;
}

export function ensureRewardedDay(state,day){
 if(state.rewarded.day!==day)state.rewarded={day,coins:0,hints:0,doubles:0};
 state.rewarded.doubles??=0;
 return state.rewarded;
}

export function rewardedRemaining(state,kind,day,config){
 const rewarded=ensureRewardedDay(state,day),isCoins=kind==='ad-coins',isDouble=kind==='ad-double';
 const cap=isCoins?config.coinDailyCap:isDouble?config.doubleDailyCap:config.hintDailyCap;
 const used=isCoins?rewarded.coins:isDouble?rewarded.doubles:rewarded.hints;
 return Math.max(0,cap-used);
}

export function dailyGiftOffer(state,today,yesterday){
 const claimed=state.gift.day===today;
 const streak=claimed?state.gift.streak:(state.gift.day===yesterday?state.gift.streak+1:1);
 return {claimed,streak,reward:25+Math.min(6,streak-1)*5};
}

export function ensureDailyState(state,day){
 if(state.daily.day===day)return false;
 state.daily={day,step:0,claimed:false};
 return true;
}

export function ensureWeeklyState(state,key){
 if(state.weekly.key===key)return false;
 state.weekly={key,steps:0,claimed:false};
 return true;
}

export function buyShopItem(store,itemId){
 const item=SHOP_ITEMS.find(entry=>entry.id===itemId);
 if(!item)return {ok:false,reason:'unknown'};
 if(!item.repeatable&&store.state.inventory.includes(item.id))return {ok:false,reason:'owned',item};
  if(!store.spend(item.cost))return {ok:false,reason:'funds',item};
  if(item.repeatable){
    if(item.effect==='hints')store.state.freeHints+=item.amount;
    if(item.effect==='hearts')store.state.hearts+=item.amount;
    return {ok:true,item,amount:item.amount};
  }
  store.state.inventory.push(item.id);
  // Captain products are permanent identity unlocks, not only cosmetic
  // inventory entries. Keep both records in sync so the profile can use the
  // captain immediately and after a reload.
  if(item.id==='captain-lighthouse'||item.id==='captain-north'){
    store.state.captains??=['captain-default'];
    if(!store.state.captains.includes(item.id))store.state.captains.push(item.id);
    store.state.activeCaptain=item.id;
  }
  return {ok:true,item};
}

export function claimGoal(state,goalId,starsTotal){
 const goal=GOALS.find(entry=>entry.id===goalId);
 if(!goal)return {ok:false,reason:'unknown'};
 if(state.goals.includes(goal.id))return {ok:false,reason:'claimed',goal};
 if(goalValue(goal,state,starsTotal)<goal.need)return {ok:false,reason:'locked',goal};
 state.goals.push(goal.id);
 state.coins+=goal.reward;
 state.hearts+=2;
 return {ok:true,goal,coins:goal.reward,hearts:2};
}

export function claimWeekly(state,key,config){
 ensureWeeklyState(state,key);
 if(state.weekly.claimed)return {ok:false,reason:'claimed'};
 if(state.weekly.steps<config.steps)return {ok:false,reason:'locked'};
 state.weekly.claimed=true;
 state.coins+=config.coins;
 state.hearts+=config.hearts;
 return {ok:true,coins:config.coins,hearts:config.hearts};
}
