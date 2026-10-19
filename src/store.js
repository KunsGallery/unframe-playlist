import { callApi } from './utils/api.js';
import { ACHIEVEMENT_DEFINITIONS } from './constants/rewardCatalog.js';
import { dateKey } from './utils/rewardState.js';
export { LEVELS, getLevelInfo } from './levels.js';
export const ACHIEVEMENTS = ACHIEVEMENT_DEFINITIONS;
export const getDateKey = dateKey;
export const getMonthKey = (date = new Date()) => dateKey(date).slice(0, 7);
export const getYear = (date = new Date()) => Number(dateKey(date).slice(0, 4));
export async function migrateRewardsToObjects() { /* Reconciled only by trusted server events. */ }
export function createAchievementEngine({ disabled = false }) {
  let pending = Promise.resolve(), sessionId = null;
  const processEvent = (event) => {
    if (disabled) return { profile: null, unlockedRewards: [] };
    if (event.type === 'track_play_start') sessionId = crypto.randomUUID();
    const stable = { ...event, eventId: event.eventId && /^[A-Za-z0-9_-]{1,140}$/.test(event.eventId) ? event.eventId : crypto.randomUUID(), sessionId };
    const job = pending.catch(() => {}).then(() => callApi('reward-event', stable));
    pending = job;
    return job;
  };
  return { processEvent, ensureProfileDoc: () => processEvent({ type: 'daily_active' }), migrateRewardsToObjects };
}
