// Limits belong to the player, not the selected pet: switching never resets them.
export const ABILITIES={
 owl:{event:'departure',kind:'hint',amount:1,text:'Одна бесплатная буква в день'},
 fox:{event:'bonus',kind:'coins',amount:5,text:'+5 монет за бонусное слово'},
 wolf:{event:'perfect',kind:'coins',amount:5,text:'+5 монет за решение без подсказок'},
 bear:{event:'chapter',kind:'coins',amount:12,text:'+12 монет за завершение главы'},
 camel:{event:'daily',kind:'coins',amount:12,text:'+12 монет за маршрут дня'},
 eagle:{event:'departure',kind:'hint',amount:1,text:'Одна бесплатная буква в день'},
 snake:{event:'bonus',kind:'coins',amount:6,text:'+6 монет за бонусное слово'},
 elephant:{event:'chapter',kind:'coins',amount:14,text:'+14 монет за завершение главы'},
 turtle:{event:'perfect',kind:'heart',amount:1,text:'+1 сердце за решение без подсказок'},
 deer:{event:'daily',kind:'heart',amount:2,text:'+2 сердца за маршрут дня'},
 pard:{event:'perfect',kind:'coins',amount:7,text:'+7 монет за решение без подсказок'},
 lion:{event:'victory',kind:'heart',amount:1,text:'+1 сердце за новую победу'}
};
export function applyCompanionEvent(state,event,day){
 const a=ABILITIES[state.activePet];if(!a||!state.pets.includes(state.activePet)||a.event!==event)return null;
 if(state.companionUsage?.day!==day)state.companionUsage={day,rewards:0,hints:0};
 const u=state.companionUsage;
 if(a.kind==='hint'){if(u.hints>=1)return null;u.hints++;state.freeHints+=1;}
 else{if(u.rewards>=3)return null;u.rewards++;state[a.kind==='heart'?'hearts':'coins']+=a.amount;}
 return {...a,pet:state.activePet};
}

export function companionBondText(id,level=1){
 const names={owl:'Сова уже отмечает ваши находки в полевом журнале.',fox:'Лис запоминает короткие тропы между словами.',wolf:'Волк ценит решения без подсказок.',bear:'Медведь помогает отмечать большие переходы.',camel:'Верблюд бережно хранит силы для маршрута дня.',eagle:'Орёл замечает буквы раньше вас.',snake:'Змея находит бонусы между строк.',elephant:'Слон помнит каждую открытую главу.',turtle:'Черепаха не торопит и бережёт сердца.',deer:'Олень ведёт по тихим ежедневным тропам.',pard:'Барс любит чистые победы.',lion:'Лев встречает каждое новое открытие.'};
 const base=names[id]||'Ваш попутчик привыкает к ритму экспедиции.';
 return level>=5?`${base} Вы прошли длинный путь вместе.`:level>=3?`${base} Ещё немного — и связь станет крепче.`:base;
}
export function companionUnlockText(level=1){return level>=5?'Уникальная финальная реплика':level>=4?'Особая реакция на вехи':level>=3?'Дополнительные фразы спутника':'Базовые реакции спутника';}
