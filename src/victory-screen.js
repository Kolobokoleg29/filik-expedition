let wordsContext;

export function renderVictory(ctx, result) {
  const {ui, state, chapterFor, artifactImage, icon, stars, btn, modal, save, celebrate} = ctx;
  if (ui.screen !== 'game') return;
  wordsContext = ctx;
  if (!renderVictory.words) {
    renderVictory.words = true;
    document.addEventListener('click', event => {
      if (!event.target.closest('[data-action="victory-words"]') || !wordsContext) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const {ui: currentUi, modal: showModal, btn: makeButton} = wordsContext;
      showModal('victory-words', `<p class="eyebrow">Маршрут завершён</p><h2>Найденные слова</h2><div class="found-words">${currentUi.level.words.map(word => `<span>${word.word}</span>`).join('')}</div>${makeButton('close', 'Вернуться к результату', 'arrow', 'primary wide')}`, {cls: 'panel-md'});
    }, true);
  }

  const {
    reward,
    hearts,
    starsEarned,
    chapterDone,
    campaignFinale = false,
    dailyDone,
    companionUnlocked,
    milestoneTitle,
    milestoneReward,
    goalsReady = [],
  } = result;
  const chapter = chapterFor(ui.level.id);
  const chapterLead = String(chapter.storyText || '').split(/(?<=[.!?])\s+/u)[0] || '';
  const chapterRecap = chapterDone && !campaignFinale ? `<div class="chapter-recap"><span>${icon('book')} Новая запись в дневнике</span><p>${chapterLead}</p></div>` : '';
  const title = ui.mode === 'endless'
    ? 'Этап экспедиции пройден'
    : campaignFinale
      ? 'Экспедиция завершена'
      : dailyDone
        ? 'Маршрут пройден!'
        : chapterDone
          ? 'Новое открытие!'
          : 'Прекрасная работа!';
  const companionName = companionUnlocked === 'owl' ? 'Сова-эрудит' : 'Спутник';
  const companionNote = companionUnlocked ? `<small>В команде: ${companionName}</small>` : '';
  const finaleText = campaignFinale
    ? `<div class="finale-story"><p class="eyebrow">Последняя страница дневника</p><p>${chapter.storyText}</p><strong>Карта собрана. Но за краем маршрута уже начинается новая экспедиция.</strong></div>`
    : '';
  const extra = campaignFinale
    ? `<div class="finale-discovery">${artifactImage(chapter.id) ? `<img src="${artifactImage(chapter.id)}" alt="${chapter.artifact}">` : icon('artifact')}<span><small>Главная находка экспедиции</small><b>${chapter.artifact}</b></span></div>`
    : chapterDone
      ? `<div class="compact-discovery">${artifactImage(chapter.id) ? `<img src="${artifactImage(chapter.id)}" alt="">` : icon('artifact')}<span>Новая находка: <b>${chapter.artifact}</b>${companionNote}</span></div>`
      : companionUnlocked
        ? `<div class="compact-discovery companion-reward">${icon('companions')}<span>В команду добавлен <b>${companionName}</b><small>Теперь этот спутник будет встречать вас в пути.</small></span></div>`
        : '';
  const milestone = milestoneTitle
    ? `<div class="compact-discovery endless-milestone-reward">${icon('endless')}<span>Новая веха: <b>${milestoneTitle}</b><small>${milestoneReward || 'Звание сохранено в профиле.'}</small></span></div>`
    : '';
  const primaryLabel = ui.mode === 'daily'
    ? (dailyDone ? 'Вернуться в лагерь' : 'Следующий этап')
    : ui.mode === 'endless'
      ? 'Следующий этап'
      : campaignFinale
        ? 'Открыть бесконечную экспедицию'
        : 'Продолжить путь';

  modal('victory', `<div class="result-body">${icon(starsEarned === 3 ? 'perfect' : 'complete', 'victory-badge')}<p class="eyebrow">Уровень пройден</p><h2>${title}</h2>${stars(starsEarned)}<p>${campaignFinale ? 'Вы открыли все 38 глав и собрали карту экспедиции.' : companionUnlocked ? `Теперь с вами ${companionName}.` : milestoneTitle ? `Открыта веха «${milestoneTitle}».` : dailyDone ? 'Маршрут дня завершён.' : chapterDone ? `В дневник добавлена находка «${chapter.artifact}».` : 'Ещё один шаг в большое путешествие.'}</p><div class="compact-rewards"><span>${icon('rewardCoin')}<b>+${reward}</b><small>монет</small></span><span>${icon('rewardHeart')}<b>+${hearts}</b><small>сердец</small></span><span>${icon('rewardStar')}<b>${starsEarned}</b><small>звёзд</small></span></div>${goalsReady.length ? '<p class="compact-note">Готовы награды за цели · заберите их в журнале</p>' : ''}${finaleText}${chapterRecap}${extra}${milestone}</div><div class="result-footer">${btn('next', primaryLabel, 'arrow', 'primary wide')}${goalsReady.length ? btn('goals', 'Забрать награды', 'goals', 'secondary wide') : ''}${btn('victory-words', `Показать найденные слова · ${ui.level.words.length}`, 'book', 'secondary wide')}${chapterDone && !campaignFinale ? btn('chapter-story', 'Читать запись главы', 'book', 'secondary wide') : ''}${btn('home', 'В лагерь', 'home', 'secondary wide')}</div>`, {close: false, center: true, cls: 'result-modal result-compact'});
  if (!state().discoverySeen && state().completed.length >= 3) {
    state().discoverySeen = true;
    save();
  }
  celebrate();
}
