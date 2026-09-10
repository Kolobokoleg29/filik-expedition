export const ENDLESS_MILESTONES=Object.freeze([
 {level:200,title:'Опытный следопыт',reward:'Звание в профиле'},
 {level:400,title:'Навигатор бесконечного пути',reward:'Звание в профиле'},
 {level:500,title:'Вечный искатель',reward:'Капитан «Вечный искатель»'},
 {level:600,title:'Хранитель маршрутов',reward:'Особое звание'},
 {level:800,title:'Архивариус горизонта',reward:'Звание в профиле'},
 {level:1000,title:'Легенда экспедиции',reward:'Награда в целях'},
 {level:1200,title:'Хранитель новых земель',reward:'Звание в профиле'},
 {level:1400,title:'Мастер перекрёстков',reward:'Звание в профиле'},
 {level:1600,title:'Собиратель горизонтов',reward:'Звание в профиле'},
 {level:1800,title:'Старший картограф',reward:'Звание в профиле'},
 {level:2000,title:'Легенда второго круга',reward:'Звание в профиле'}
]);
export const endlessMilestone=level=>ENDLESS_MILESTONES.find(m=>m.level===level)||null;
const ENDLESS_RANKS=Object.freeze([
 {level:0,title:'Новичок маршрута'},
 ...ENDLESS_MILESTONES.map(({level,title})=>({level,title}))
]);
export const endlessRank=level=>ENDLESS_RANKS.reduce((rank,current)=>Number(level)>=current.level?current:rank,ENDLESS_RANKS[0]).title;
