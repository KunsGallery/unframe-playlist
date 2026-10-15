import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceRewardEvent, settleRewards, dateKey } from '../src/utils/rewardState.js';
import { resolvePlaylist, nextQueueIndex } from '../src/utils/catalog.js';
import { ACHIEVEMENT_DEFINITIONS } from '../src/constants/rewardCatalog.js';
const now = new Date('2026-10-15T10:00:00+09:00');
test('Seoul midnight is independent of device timezone', () => assert.equal(dateKey(new Date('2026-10-14T15:01:00Z')), '2026-10-15'));
test('seventh visit unlocks streak without playing', () => {
  const r = reduceRewardEvent({ streak: { lastActive: '2026-10-14', count: 6, longest: 6 } }, { type: 'daily_active', eventId: 'visit' }, now);
  assert.equal(r.profile.streak.count, 7); assert.ok(r.unlockedRewards.some((a) => a.id === 'streak_7')); assert.ok(!r.unlockedRewards.some((a) => a.id === 'first_listen'));
});
test('same event does not duplicate counters, XP or rewards', () => {
  const event = { type: 'track_play_start', trackId: 'a', eventId: 'same' };
  const first = reduceRewardEvent({}, event, now), second = reduceRewardEvent(first.profile, event, now);
  assert.deepEqual(second.profile, first.profile); assert.equal(second.duplicate, true);
});
test('repeated liking of one song is one distinct daily like', () => {
  let state = {};
  for (let i = 0; i < 6; i++) state = reduceRewardEvent(state, { type: 'like_added', trackId: 'a', likedCount: 1, eventId: `like-${i}` }, now).profile;
  assert.equal(state.counters.dailyLikes['2026-10-15'], 1); assert.ok(!state.rewards.some((r) => r.id === 'daily_like_5'));
});
test('distinct likes unlock milestones and daily XP never exceeds cap', () => {
  let state = {};
  for (let i = 0; i < 30; i++) state = reduceRewardEvent(state, { type: 'like_added', trackId: `song-${i}`, likedCount: i + 1, eventId: `event-${i}` }, now).profile;
  for (let i = 0; i < 30; i++) state = reduceRewardEvent(state, { type: 'track_complete', trackId: 'a', eventId: `complete-${i}` }, now).profile;
  assert.ok(state.rewards.some((r) => r.id === 'daily_like_5')); assert.equal(state.xp, 60);
});
test('legacy rewards retain ownership without inventing earned year', () => {
  const r = reduceRewardEvent({ rewards: ['first_listen'], xp: 100 }, { type: 'daily_active' }, now);
  assert.equal(r.profile.rewards.find((r) => r.id === 'first_listen').year, null); assert.equal(r.profile.xp, 103);
});
test('annual settlement is repeatable and excludes manual awards', () => {
  const rewards = ACHIEVEMENT_DEFINITIONS.slice(0, 10).map((d, i) => ({ id: d.id, year: 2026, unlockedAt: i }));
  const first = settleRewards(rewards, 2026), second = settleRewards(first.rewards, 2026);
  assert.equal(first.tier, 'silver'); assert.deepEqual(second.rewards, first.rewards);
  assert.equal(settleRewards(rewards.map((r) => ({ ...r, meta: { adminGranted: true } })), 2026).tier, null);
});
test('playlist resolves latest records and excludes hidden/deleted/draft tracks', () => {
  const tracks = [{ id: 'a', title: 'Updated', audioUrl: 'https://example.com/a.mp3' }, { id: 'b', isHidden: true, audioUrl: 'b' }, { id: 'c', status: 'draft', audioUrl: 'c' }];
  assert.deepEqual(resolvePlaylist({ items: [{ id: 'a', title: 'Old' }, { id: 'b' }, { id: 'c' }, { id: 'deleted' }] }, tracks).items.map((t) => t.title), ['Updated']);
});
test('shuffle always picks another song', () => { assert.equal(nextQueueIndex(3, 1, true, () => 0), 2); assert.equal(nextQueueIndex(1, 0, true), 0); });
