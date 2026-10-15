import { doc, runTransaction } from 'firebase/firestore';
import { ACHIEVEMENT_DEFINITIONS } from './constants/rewardCatalog.js';
import { reduceRewardEvent, normalizeRewards, dateKey } from './utils/rewardState.js';
export { LEVELS, getLevelInfo } from './levels.js';
export const ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS;
export const getDateKey = dateKey;
export const getMonthKey = (date = new Date()) => dateKey(date).slice(0, 7);
export const getYear = (date = new Date()) => Number(dateKey(date).slice(0, 4));
export async function migrateRewardsToObjects({ db, appId, uid }) {
  const ref = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'stats');
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) return;
    const rewards = snapshot.data().rewards || [];
    if (rewards.some((r) => typeof r === 'string')) transaction.update(ref, { rewards: normalizeRewards(rewards) });
  });
}
export function createAchievementEngine({ db, appId, uid, disabled = false }) {
  const profileRef = doc(db, 'artifacts', appId, 'users', uid, 'profile', 'stats');
  const processEvent = async (event) => {
    if (disabled) return { profile: null, unlockedRewards: [] };
    const stableEvent = { ...event, eventId: event.eventId || crypto.randomUUID() };
    const at = event.at || new Date();
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      const previous = snapshot.exists() ? snapshot.data() : { firstJoin: Date.now(), xp: 0, rewards: [] };
      const state = { ...previous, rewards: normalizeRewards(previous.rewards) };
      const result = reduceRewardEvent(state, stableEvent, at);
      if (!result.duplicate) transaction.set(profileRef, result.profile);
      return result;
    });
  };
  return { processEvent, ensureProfileDoc: () => processEvent({ type: 'daily_active' }), migrateRewardsToObjects: () => disabled ? Promise.resolve() : migrateRewardsToObjects({ db, appId, uid }) };
}
