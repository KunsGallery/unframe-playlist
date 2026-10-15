import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_CATALOG } from '../constants/rewardCatalog.js';
import { getLevelInfo } from '../levels.js';
export const dateKey = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
export const normalizeRewards = (rewards = []) => [...new Map(rewards.filter(Boolean).map((r) => {
  const reward = typeof r === 'string' ? { id: r, year: null, unlockedAt: null, meta: { legacy: true } } : r;
  return [reward.id, reward];
})).values()];
const positive = (map) => Object.values(map || {}).filter((n) => Number(n) > 0).length;
const POINTS = { track_play_start: 1, track_complete: 10, like_added: 2, share_card: 5, playlist_play: 3, daily_active: 3 };
const CAPS = { track_play_start: 10, like_added: 20, share_card: 25, playlist_play: 9 };

// Pure transition, committed atomically by the Firestore adapter.
export function reduceRewardEvent(previous = {}, event, now = new Date()) {
  const day = dateKey(now), month = day.slice(0, 7), year = Number(day.slice(0, 4));
  const p = { ...previous, counters: structuredClone(previous.counters || {}), streak: { ...previous.streak }, timeFlags: { ...previous.timeFlags }, yearly: structuredClone(previous.yearly || {}), monthly: structuredClone(previous.monthly || {}) };
  p.rewards = normalizeRewards(p.rewards);
  p.counters ||= {}; p.streak ||= { count: 0, longest: 0, lastActive: null }; p.timeFlags ||= {};
  const c = p.counters;
  c.listens ??= Number(p.listenCount || 0); c.shares ??= Number(p.shareCount || 0);
  const bump = (key, id) => {
    if (id !== undefined) { c[key] ||= {}; c[key][id] = Number(c[key][id] || 0) + 1; }
    else c[key] = Number(c[key] || 0) + 1;
  };
  for (const key of Object.keys(c)) {
    if (key.startsWith('daily') && c[key] && typeof c[key] === 'object') c[key] = Object.fromEntries(Object.entries(c[key]).filter(([d]) => d >= dateKey(new Date(now.getTime() - 90 * 86400000))));
  }
  c.recentEventIds ||= [];
  if (event.eventId && c.recentEventIds.includes(event.eventId)) return { profile: previous, unlockedRewards: [], duplicate: true };
  if (event.eventId) c.recentEventIds = [...c.recentEventIds.slice(-99), event.eventId];
  const firstToday = p.streak.lastActive !== day;
  if (firstToday) {
    const yesterday = dateKey(new Date(now.getTime() - 86400000));
    p.streak.count = p.streak.lastActive === yesterday ? Number(p.streak.count || 0) + 1 : 1;
    p.streak.longest = Math.max(p.streak.count, Number(p.streak.longest || 0)); p.streak.lastActive = day;
  }
  const addXp = (type, eligible = true) => {
    if (!eligible) return;
    c.dailyXp ||= {}; c.dailyTypeXp ||= {};
    const today = c.dailyTypeXp[day] ||= {};
    const legacyKey = { track_play_start: 'dailyStartXp', like_added: 'dailyLikeXp', share_card: 'dailyShareXp', playlist_play: 'dailyPlaylistXp' }[type];
    const used = Math.max(Number(today[type] || 0), Number(c[legacyKey]?.[day] || 0));
    const amount = Math.max(0, Math.min(POINTS[type] || 0, 60 - Number(c.dailyXp[day] || 0), (CAPS[type] ?? 60) - used));
    p.xp = Number(p.xp || 0) + amount; c.dailyXp[day] = Number(c.dailyXp[day] || 0) + amount; today[type] = used + amount;
  };
  if (firstToday && !c.dailyActiveXp?.[day]) addXp('daily_active');
  let eligible = true;
  if (event.type === 'track_play_start') {
    bump('listens'); p.listenCount = c.listens;
    if (event.trackId) bump('trackPlays', event.trackId);
    c.startTrackDay ||= {};
    const playedToday = c.startTrackDay[day] ||= {};
    eligible = !playedToday[event.trackId] && !c.startTrackDay[`${event.trackId}__${day}`]; playedToday[event.trackId] = true;
    c.startTrackDay = Object.fromEntries(Object.entries(c.startTrackDay).filter(([d]) => d.length === 10 && d >= dateKey(new Date(now.getTime() - 7 * 86400000))));
  } else if (event.type === 'track_complete') {
    bump('completes'); if (event.trackId) bump('trackCompletes', event.trackId);
  } else if (event.type === 'like_added') {
    c.dailyLikedTracks ||= {}; const ids = c.dailyLikedTracks[day] ||= [];
    eligible = !ids.includes(event.trackId);
    if (eligible) { ids.push(event.trackId); bump('dailyLikes', day); }
    c.likes = Number(event.likedCount ?? c.likes ?? 0);
  } else if (event.type === 'share_card') { bump('shares'); p.shareCount = c.shares;
  } else if (event.type === 'playlist_play') { const key = event.playlistKey || event.playlistId; if (key) bump('playlistPlays', key); }
  if (event.type !== 'daily_active') addXp(event.type, eligible);
  if (['track_play_start', 'track_complete'].includes(event.type)) {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23' }).format(now));
    p.timeFlags.listenedDay ||= hour >= 9 && hour < 18; p.timeFlags.listenedNight ||= hour >= 2 && hour < 6;
    p.timeFlags.weekend ||= ['Sat', 'Sun'].includes(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(now));
  }
  const ids = new Set(p.rewards.map((r) => r.id)), unlockedRewards = [];
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (ids.has(definition.id) || (!definition.trigger.includes(event.type) && !(firstToday && definition.trigger.includes('daily_active')) && event.type !== 'daily_active')) continue;
    // Historical milestones can be reconciled at sign-in, but first-event awards
    // and current-event-only conditions must wait for an actual matching action.
    if (event.type === 'daily_active' && (definition.id.startsWith('first_') || ['all_tracks_liked', 'daily_like_5', 'likes_10', 'likes_30', 'repeat_10', 'repeat_25', 'playlist_return_5'].includes(definition.id))) continue;
    if (!definition.condition({ profile: p, event, dateKey: day, has: (id) => ids.has(id), getCounter: () => c.trackPlays?.[event.trackId] || 0 })) continue;
    const reward = { id: definition.id, year, unlockedAt: now.getTime(), meta: { via: event.type, trackId: event.trackId || null, dateKey: day } };
    p.rewards.push(reward); ids.add(reward.id); unlockedRewards.push(reward);
  }
  p.yearly ||= {}; p.monthly ||= {};
  p.yearly[year] = { ...(p.yearly[year] || {}), unlocked: p.rewards.filter((r) => Number(r.year) === year && ACHIEVEMENT_CATALOG[r.id]).length };
  p.monthly[month] = { ...(p.monthly[month] || {}), unlocked: Number(p.monthly[month]?.unlocked || 0) + unlockedRewards.length };
  const level = getLevelInfo(p.xp); p.level = level.level; p.levelKey = level.key;
  return { profile: p, unlockedRewards };
}

export function achievementProgress(id, profile = {}, likes = 0) {
  const c = profile.counters || {}, max = (v) => Math.max(0, ...Object.values(v || {}));
  const values = { listen: c.listens, complete: c.completes, share: c.shares, likes, unique_tracks: positive(c.trackPlays), repeat: max(c.trackPlays), playlist: positive(c.playlistPlays), playlist_return: max(c.playlistPlays), streak: profile.streak?.count };
  const match = /^(.*)_(\d+)$/.exec(id);
  if (id === 'playlist_trinity') return `${Math.min(positive(c.playlistPlays), 3)} / 3`;
  return match && match[1] in values ? `${Math.min(Number(values[match[1]] || 0), Number(match[2]))} / ${match[2]}` : '';
}
export function settleRewards(rewards, year) {
  const normalized = normalizeRewards(rewards);
  const count = normalized.filter((r) => Number(r.year) === year && ACHIEVEMENT_CATALOG[r.id] && !r.meta?.adminGranted).length;
  const tier = count >= 20 ? 'gold' : count >= 10 ? 'silver' : count >= 5 ? 'bronze' : null;
  const id = tier ? `annual_${tier}_${year}` : null, existing = normalized.find((r) => r.id === id);
  const result = normalized.filter((r) => !r.id.startsWith('annual_') || !r.id.endsWith(`_${year}`));
  if (id) result.push(existing || { id, year, unlockedAt: Date.now(), meta: { annualSettlement: true, achievementCount: count } });
  return { rewards: result, tier, count };
}
