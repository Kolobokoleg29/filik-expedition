import assert from "node:assert/strict";
import test from "node:test";
import { applyCampaignCompletion, applyDailyCompletion, applyEndlessCompletion } from "../../src/progression.js";
import { freshState } from "../../src/storage.js";

const economy = {
  campaignLevelCoins: 12,
  campaignChapterCoins: 24,
  campaignLevelHearts: 1,
  campaignChapterHearts: 2,
  dailyCoins: 50,
  dailyHearts: 3,
  endlessDailyRewardedStages: 1,
  endlessCoins: 12,
  endlessHeartsEvery: 10
};

test("completes a campaign level once and keeps replay reward-free", () => {
  const state = freshState();
  const first = applyCampaignCompletion(state, { id: 1, starsEarned: 3, economy });
  assert.equal(first.firstCompletion, true);
  assert.equal(first.reward, 12);
  assert.equal(first.hearts, 1);
  assert.equal(state.coins, 132);
  assert.deepEqual(state.completed, [1]);
  assert.equal(state.stars[1], 3);

  const replay = applyCampaignCompletion(state, { id: 1, starsEarned: 1, economy });
  assert.equal(replay.firstCompletion, false);
  assert.equal(replay.reward, 0);
  assert.equal(replay.hearts, 0);
  assert.equal(state.coins, 132);
  assert.equal(state.stars[1], 3);
});

test("adds chapter completion rewards only at a first chapter finish", () => {
  const state = freshState();
  const result = applyCampaignCompletion(state, { id: 8, starsEarned: 2, economy });
  assert.equal(result.chapterDone, true);
  assert.equal(result.reward, 36);
  assert.equal(result.hearts, 3);
  assert.deepEqual(state.completed, [8]);

  const replay = applyCampaignCompletion(state, { id: 8, starsEarned: 3, economy });
  assert.equal(replay.chapterDone, false);
  assert.equal(replay.reward, 0);
  assert.equal(state.stars[8], 3);
});

test("completes a daily route once at its final step", () => {
  const state = freshState();
  state.daily = { day: "2026-09-10", step: 2, claimed: false };
  const first = applyDailyCompletion(state, { economy });
  assert.equal(first.dailyDone, true);
  assert.equal(first.reward, 50);
  assert.equal(first.hearts, 3);
  assert.equal(state.daily.claimed, true);
  assert.equal(state.coins, 170);

  const repeat = applyDailyCompletion(state, { economy });
  assert.equal(repeat.dailyDone, false);
  assert.equal(repeat.reward, 0);
  assert.equal(state.coins, 170);
});

test("limits endless daily rewards and records milestones once", () => {
  const state = freshState();
  const first = applyEndlessCompletion(state, { index: 10, economy, day: "2026-09-10" });
  assert.equal(first.reward, 12);
  assert.equal(first.hearts, 1);
  assert.equal(state.endless.best, 10);
  assert.equal(state.endless.rewardedStages, 1);

  const second = applyEndlessCompletion(state, { index: 11, economy, day: "2026-09-10" });
  assert.equal(second.reward, 0);
  assert.equal(second.hearts, 0);
  assert.equal(state.endless.rewardedStages, 1);

  const milestone = applyEndlessCompletion(state, { index: 200, economy, day: "2026-09-10" });
  assert.equal(milestone.milestoneReached, true);
  assert.equal(state.endless.milestones.includes(200), true);
  const replay = applyEndlessCompletion(state, { index: 200, economy, day: "2026-09-10", replay: true });
  assert.equal(replay.milestoneReached, false);
});