import { guard, services, root, privateProfile, response, failure, error, safeId, projectRanking, jsonBody, DEFAULT_NICKNAME } from '../lib/server.js';
import { reduceRewardEvent, dateKey } from '../../src/utils/rewardState.js';

const TYPES = new Set(['daily_active', 'track_play_start', 'track_complete', 'listening_pulse', 'like_added', 'like_removed', 'share_card', 'playlist_play']);
export const durationSeconds = (track) => {
  const v = track.durationSeconds || track.duration;
  if (typeof v === 'number' && v > 0) return v;
  if (typeof v === 'string' && /^\d{1,3}:\d{2}$/.test(v)) { const [m, s] = v.split(':').map(Number); return m * 60 + s; }
  return null;
};
// A background tab or lock screen can report minutes at once. Server wall-clock time since the
// last report still bounds the credit, so this cap only limits a single claim.
export const MAX_CREDIT_SECONDS = 600;
export const creditSeconds = (session, claimed, now) => Math.max(0, Math.min(MAX_CREDIT_SECONDS, (now - session.lastPulse) / 1000, Number(claimed) || 0));
const USER_LIMIT_PER_MINUTE = 60;
// Kept in the listener's own state document, so the limit adds no write of its own.
export function consumeUserQuota(state, now) {
  const active = state.rate && now < state.rate.until;
  if (active && state.rate.count >= USER_LIMIT_PER_MINUTE) throw error(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
  state.rate = { count: active ? state.rate.count + 1 : 1, until: active ? state.rate.until : now + 60000 };
}
const liveSession = (session, input, now) => {
  if (!session || session.id !== input.sessionId || session.trackId !== input.trackId || now - session.startedAt > Math.max(1800000, (session.duration || 600) * 3000)) throw error(409, '청취 세션이 만료되었습니다. 다음 재생부터 다시 기록합니다.');
  return session;
};
export async function handler(event) {
  try {
    const user = await guard(event, USER_LIMIT_PER_MINUTE, 60000, { durable: false }), input = jsonBody(event);
    if (!TYPES.has(input.type) || !safeId(input.eventId)) throw error(400, '유효하지 않은 이벤트입니다.');
    if (input.trackId && !safeId(input.trackId)) throw error(400, '곡 정보를 확인해 주세요.');
    const trackSnap = input.trackId && ['track_play_start', 'like_added'].includes(input.type) ? await root().collection('public').doc('data').collection('tracks').doc(input.trackId).get() : null;
    const track = trackSnap?.exists ? trackSnap.data() : null;
    if (['track_play_start', 'like_added'].includes(input.type) && !track) throw error(400, '발행된 곡만 기록할 수 있습니다.');
    let likedCount = null, totalTracks = 0;
    if (['like_added', 'like_removed'].includes(input.type)) {
      const [likes, published] = await Promise.all([root().collection('users').doc(user.uid).collection('likes').get(), root().collection('public').doc('data').collection('tracks').get()]);
      if (input.type === 'like_added' && !likes.docs.some((d) => d.id === input.trackId)) throw error(400, '좋아요 상태를 확인해 주세요.');
      likedCount = likes.docs.filter((d) => published.docs.some((t) => t.id === d.id)).length; totalTracks = published.size;
    }
    const ref = privateProfile(user.uid), stateRef = root().collection('server_state').doc(user.uid), now = Date.now();
    const result = await services().db.runTransaction(async (tx) => {
      const state = (await tx.get(stateRef)).data() || {};
      const session = state.session;
      consumeUserQuota(state, now);
      // Pulses touch only the state document: one write. Seconds reach the receipt with the next profile event.
      if (input.type === 'listening_pulse') {
        const live = liveSession(session, input, now), heard = creditSeconds(live, input.seconds, now);
        live.heard += heard; live.lastPulse = now;
        state.pendingSeconds = (state.pendingSeconds || 0) + heard;
        tx.set(stateRef, state);
        return { unlockedRewards: [], skipProjection: true };
      }
      const snap = await tx.get(ref);
      const previous = snap.data() || { xp: 0, rewards: [], firstJoin: now, nickname: DEFAULT_NICKNAME };
      if (previous.counters?.recentEventIds?.includes(input.eventId)) return { profile: previous, unlockedRewards: [], duplicate: true, skipProjection: true };
      if (input.type === 'daily_active' && snap.exists && previous.streak?.lastActive === dateKey(new Date(now)) && !state.pendingSeconds) return { profile: previous, unlockedRewards: [], skipProjection: true };
      const playlistKey = typeof (input.playlistKey || input.playlistId) === 'string' ? (input.playlistKey || input.playlistId).slice(0, 140) : null;
      if (input.type === 'share_card') { if (now - (state.lastShare || 0) < 30000) throw error(429, '공유 기록은 30초마다 반영합니다.'); state.lastShare = now; }
      if (input.type === 'playlist_play') {
        if (!session || session.trackId !== input.trackId || session.id !== input.sessionId || !playlistKey) throw error(400, '현재 재생 목록을 확인해 주세요.');
        if (now - (state.lastPlaylist || 0) < 10000) throw error(429, '플레이리스트 기록은 잠시 후 다시 반영됩니다.');
        let valid = ['radio-opening', 'radio-focus', 'radio-closing'].includes(playlistKey)
          || (session.exhibition && playlistKey === `exhibition-${session.exhibition}`)
          || playlistKey === `genre-${(session.genre || 'Ambient').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        if (!valid) {
          let listRef;
          if (playlistKey.startsWith('personal-') && safeId(playlistKey.slice(9))) listRef = root().collection('users').doc(user.uid).collection('playlists').doc(playlistKey.slice(9));
          else if (playlistKey.startsWith('shared-') && safeId(playlistKey.slice(7))) listRef = root().collection('shared_playlists').doc(playlistKey.slice(7));
          else if (safeId(playlistKey)) listRef = root().collection('public').doc('data').collection('playlists').doc(playlistKey);
          if (listRef) { const list = await tx.get(listRef); valid = list.data()?.trackIds?.includes(session.trackId); }
          if (!valid) {
            const config = await tx.get(root().collection('public').doc('data').collection('site_config').doc('main_texts'));
            valid = config.data()?.heroSlides?.some((slide) => slide.id === playlistKey && slide.isActive !== false && slide.trackIds?.includes(session.trackId));
          }
        }
        if (!valid) throw error(400, '발행된 재생 목록만 기록할 수 있습니다.');
        state.lastPlaylist = now;
      }
      if (input.type === 'track_play_start') {
        if (!safeId(input.sessionId)) throw error(400, '청취 세션을 확인해 주세요.');
        if (session) state.pendingSeconds = (state.pendingSeconds || 0) + creditSeconds(session, input.previousSeconds, now);
        const skippedQuickly = session && now - session.startedAt < 5000;
        state.session = { id: input.sessionId, trackId: input.trackId, startedAt: now, lastPulse: now, heard: 0, completed: false, duration: durationSeconds(track), genre: track.genre || track.tag || 'Ambient', exhibition: track.exhibition || '' };
        // Fast skips still move the session so later reports match, but earn no play count or XP.
        if (skippedQuickly) { tx.set(stateRef, state); return { unlockedRewards: [], skipProjection: true }; }
      }
      let heard = 0;
      if (input.type === 'track_complete') {
        const live = liveSession(session, input, now);
        heard = creditSeconds(live, input.seconds, now);
        live.heard += heard; live.lastPulse = now;
        if (!live.duration) throw error(409, '음원 길이 확인이 필요한 곡입니다. 완주 보상은 확인 후 기록됩니다.');
        if (live.completed || live.heard < live.duration * .9 || now - live.startedAt < live.duration * 900) throw error(409, '청취 시간이 충분하지 않습니다.');
        live.completed = true;
      }
      const stable = { type: input.type, trackId: input.trackId || null, playlistKey, eventId: input.eventId, likedCount: likedCount ?? previous.likedCount ?? 0, totalTracks };
      const next = input.type === 'like_removed' ? { profile: { ...previous, counters: { ...previous.counters, recentEventIds: [...(previous.counters?.recentEventIds || []).slice(-99), input.eventId] } }, unlockedRewards: [] } : reduceRewardEvent(previous, stable, new Date(now));
      if (likedCount !== null) next.profile.likedCount = likedCount;
      const month = dateKey(new Date(now)).slice(0, 7), receipts = { ...previous.receipts };
      const receipt = receipts[month] || { since: now, seconds: 0, plays: {}, exhibitions: {}, completed: 0 };
      receipt.seconds += heard + (state.pendingSeconds || 0);
      state.pendingSeconds = 0;
      if (input.type === 'track_play_start') { receipt.plays[input.trackId] = (receipt.plays[input.trackId] || 0) + 1; if (track.exhibition) receipt.exhibitions[track.exhibition] = (receipt.exhibitions[track.exhibition] || 0) + 1; }
      if (input.type === 'track_complete') receipt.completed++;
      receipts[month] = receipt;
      next.profile.receipts = Object.fromEntries(Object.entries(receipts).sort(([a], [b]) => b.localeCompare(a)).slice(0, 13));
      tx.set(ref, next.profile); tx.set(stateRef, state);
      return next;
    });
    if (!result.skipProjection) await projectRanking(user.uid, { force: result.unlockedRewards?.length > 0 });
    return response(200, { unlockedRewards: result.unlockedRewards, duplicate: !!result.duplicate });
  } catch (err) { return failure(err); }
}
