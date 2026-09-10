import { endlessMilestone } from "./endless-meta.js";

export function applyCampaignCompletion(state, { id, starsEarned, economy, levelsTotal = 304, chapterSize = 8 }) {
  const firstCompletion = !state.completed.includes(id);
  let reward = 0;
  let hearts = 0;
  let chapterDone = false;

  if (firstCompletion) {
    state.completed.push(id);
    state.completed.sort((a, b) => a - b);
    reward = economy.campaignLevelCoins;
    hearts = economy.campaignLevelHearts;
    if (id % chapterSize === 0) {
      reward += economy.campaignChapterCoins;
      hearts += economy.campaignChapterHearts;
      chapterDone = true;
    }
  }

  const campaignFinale = firstCompletion && id === levelsTotal;
  state.stars[id] = Math.max(state.stars[id] || 0, starsEarned);
  state.coins += reward;
  state.hearts += hearts;
  return { firstCompletion, reward, hearts, chapterDone, campaignFinale };
}

export function applyEndlessCompletion(state, { index, economy, day, replay = false }) {
  const previousBest = state.endless.best;
  state.endless.best = Math.max(state.endless.best, index);
  const milestone = endlessMilestone(index);
  const milestoneReached = Boolean(milestone && !state.endless.milestones.includes(index));
  if (milestoneReached) state.endless.milestones.push(index);

  if (state.endless.rewardDay !== day) {
    state.endless.rewardDay = day;
    state.endless.rewardedStages = 0;
  }

  const reward = !replay && state.endless.rewardedStages < economy.endlessDailyRewardedStages ? economy.endlessCoins : 0;
  if (reward) state.endless.rewardedStages++;
  const hearts = !replay && economy.endlessHeartsEvery > 0 && index % economy.endlessHeartsEvery === 0 ? 1 : 0;
  state.coins += reward;
  state.hearts += hearts;

  return {
    index,
    previousBest,
    reward,
    hearts,
    milestoneReached,
    milestoneTitle: milestone?.title || null,
    milestoneReward: milestone?.reward || null
  };
}

export function applyDailyCompletion(state, { economy }) {
  const previousStep = state.daily.step;
  state.daily.step = Math.min(3, state.daily.step + 1);
  const dailyDone = state.daily.step === 3 && !state.daily.claimed;
  let reward = 0;
  let hearts = 0;
  if (dailyDone) {
    reward = economy.dailyCoins;
    hearts = economy.dailyHearts;
    state.daily.claimed = true;
  }
  state.coins += reward;
  state.hearts += hearts;
  return { previousStep, step: state.daily.step, reward, hearts, dailyDone };
}