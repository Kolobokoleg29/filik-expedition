export const CAPTAINS=Object.freeze([
 {id:'captain-default',title:'Капитан экспедиции',motto:'Собираем слова — открываем миры.',rarity:'common',icon:'captainPortrait',asset:'./assets/UI/captain_portrait.png',source:'start',condition:'Доступен сразу'},
 {id:'captain-pathfinder',title:'Следопыт',motto:'У каждой буквы есть тропа.',rarity:'rare',icon:'map',asset:'./assets/UI/captains/captain-pathfinder.png',source:'achievement',condition:'Пройти 50 уровней кампании',check:s=>s.completed.length>=50},
 {id:'captain-cartographer',title:'Картограф',motto:'Карта растёт с каждым открытием.',rarity:'rare',icon:'compass',asset:'./assets/UI/captains/captain-cartographer.png',source:'achievement',condition:'Открыть 10 артефактов',check:s=>Math.floor(s.completed.length/8)>=10},
 {id:'captain-keeper',title:'Хранитель слов',motto:'Редкое слово всегда стоит записи.',rarity:'rare',icon:'book',asset:'./assets/UI/captains/captain-keeper.png',source:'achievement',condition:'Найти 500 слов',check:s=>s.wordsTotal>=500},
 {id:'captain-master',title:'Безошибочный',motto:'Точный ход — спокойный ход.',rarity:'rare',icon:'star',asset:'./assets/UI/captains/captain-master.png',source:'achievement',condition:'Получить 25 уровней на 3 звезды',check:s=>Object.values(s.stars).filter(v=>v===3).length>=25},
 {id:'captain-lighthouse',title:'Капитан маяка',motto:'Даже в тумане путь остаётся видимым.',rarity:'common',icon:'lantern',asset:'./assets/UI/captains/captain-lighthouse.png',source:'shop',condition:'Магазин · 420 монет',cost:420},
 {id:'captain-north',title:'Капитан северного маршрута',motto:'Холодная карта, тёплая команда.',rarity:'common',icon:'snow',asset:'./assets/UI/captains/captain-north.png',source:'shop',condition:'Магазин · 520 монет',cost:520},
 {id:'captain-eternal',title:'Вечный искатель',motto:'За горизонтом всегда есть следующий этап.',rarity:'legendary',icon:'endless',asset:'./assets/UI/captains/captain-eternal.png',source:'achievement',condition:'Пройти 500-й этап бесконечной экспедиции',check:s=>s.endless.best>=500}
]);
export function captainById(id){return CAPTAINS.find(c=>c.id===id)||CAPTAINS[0];}
export function captainIsUnlocked(c,state){return c.source==='start'||state.captains?.includes(c.id)||Boolean(c.check?.(state));}
export function captainTitle(state){return captainById(state.activeCaptain||'captain-default').title;}
export function captainMotto(state){return captainById(state.activeCaptain||'captain-default').motto||'';}

export function unlockCaptains(state,onUnlock=()=>{}){for(const c of CAPTAINS){if(c.source==='achievement'&&captainIsUnlocked(c,state)&&!state.captains.includes(c.id)){state.captains.push(c.id);onUnlock(c);}}}
