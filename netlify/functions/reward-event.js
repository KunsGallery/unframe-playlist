import { guard, services, root, privateProfile, response, failure, error, safeId, projectRanking, jsonBody } from '../lib/server.js';
import { reduceRewardEvent, dateKey } from '../../src/utils/rewardState.js';

const TYPES = new Set(['daily_active', 'track_play_start', 'track_complete', 'listening_pulse', 'like_added', 'like_removed', 'share_card', 'playlist_play']);
export const durationSeconds = (track) => {
  const v = track.durationSeconds || track.duration;
  if (typeof v === 'number' && v > 0) return v;
  if (typeof v === 'string' && /^\d{1,3}:\d{2}$/.test(v)) { const [m, s] = v.split(':').map(Number); return m * 60 + s; }
  return null;
};
export async function handler(event) {
  try {
    const user = await guard(event), input = jsonBody(event);
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
      const [snap, stateSnap] = await Promise.all([tx.get(ref), tx.get(stateRef)]);
      const previous = snap.data() || { xp: 0, rewards: [], firstJoin: now, nickname: (user.name || 'Listener').slice(0, 16) };
      const state = stateSnap.data() || {};
      if (previous.counters?.recentEventIds?.includes(input.eventId)) return { profile: previous, unlockedRewards: [], duplicate: true };
      const session = state.session;
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
        if (!safeId(input.sessionId) || (session && now - session.startedAt < 5000)) throw error(429, '곡 전환이 너무 빠릅니다.');
        state.session = { id: input.sessionId, trackId: input.trackId, startedAt: now, lastPulse: now, heard: 0, completed: false, duration: durationSeconds(track), genre: track.genre || track.tag || 'Ambient', exhibition: track.exhibition || '' };
      }
      let heard = 0;
      if (['track_complete', 'listening_pulse'].includes(input.type)) {
        if (!session || session.id !== input.sessionId || session.trackId !== input.trackId || now - session.startedAt > Math.max(1800000, (session.duration || 600) * 3000)) throw error(409, '청취 세션이 만료되었습니다. 다음 재생부터 다시 기록합니다.');
        heard = Math.max(0, Math.min(30, (now - session.lastPulse) / 1000, Number(input.seconds) || 0));
        session.heard += heard; session.lastPulse = now;
        if (input.type === 'track_complete') {
          if (!session.duration) throw error(409, '음원 길이 확인이 필요한 곡입니다. 완주 보상은 확인 후 기록됩니다.');
          if (session.completed || session.heard < session.duration * .9 || now - session.startedAt < session.duration * 900) throw error(409, '청취 시간이 충분하지 않습니다.');
          session.completed = true;
        }
      }
      const stable = { type: input.type, trackId: input.trackId || null, playlistKey, eventId: input.eventId, likedCount: likedCount ?? previous.likedCount ?? 0, totalTracks };
      const next = ['listening_pulse', 'like_removed'].includes(input.type) ? { profile: { ...previous, counters: { ...previous.counters, recentEventIds: [...(previous.counters?.recentEventIds || []).slice(-99), input.eventId] } }, unlockedRewards: [] } : reduceRewardEvent(previous, stable, new Date(now));
      if (likedCount !== null) next.profile.likedCount = likedCount;
      const month = dateKey(new Date(now)).slice(0, 7), receipts = { ...previous.receipts };
      const receipt = receipts[month] || { since: now, seconds: 0, plays: {}, exhibitions: {}, completed: 0 };
      receipt.seconds += heard;
      if (input.type === 'track_play_start') { receipt.plays[input.trackId] = (receipt.plays[input.trackId] || 0) + 1; if (track.exhibition) receipt.exhibitions[track.exhibition] = (receipt.exhibitions[track.exhibition] || 0) + 1; }
      if (input.type === 'track_complete') receipt.completed++;
      receipts[month] = receipt;
      next.profile.receipts = Object.fromEntries(Object.entries(receipts).sort(([a], [b]) => b.localeCompare(a)).slice(0, 13));
      tx.set(ref, next.profile); tx.set(stateRef, state);
      return next;
    });
    if (input.type !== 'listening_pulse') await projectRanking(user.uid);
    return response(200, { unlockedRewards: result.unlockedRewards, duplicate: !!result.duplicate });
  } catch (err) { return failure(err); }
}
