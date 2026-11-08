// src/hooks/useJam.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JAM_DRIFT_SECONDS, JAM_HEARTBEAT_MS, createJam, endJam, expectedPosition, newJamId, subscribeJam, updateJam, validJamId } from '../utils/jam';

// Host: mirrors this player into the Jam document on play, pause, seek, track change and a slow heartbeat.
// Guest: follows the document. Guests may still pause or skip on their own; the next host update pulls them back.
export function useJam({ db, appId, audioRef, currentTrack, currentQueue, publicTracks, playTrack, user, hostName, notify }) {
  const [role, setRole] = useState(null);
  const [jamId, setJamId] = useState('');
  const [hostState, setHostState] = useState(null);
  const offsetRef = useRef(Infinity), latestRef = useRef(null);
  const live = useRef({ currentTrack, currentQueue, publicTracks, playTrack });
  useEffect(() => { live.current = { currentTrack, currentQueue, publicTracks, playTrack }; }, [currentTrack, currentQueue, publicTracks, playTrack]);

  // ---------- host ----------
  const push = useCallback(() => {
    if (!jamId) return;
    const { currentTrack: track, currentQueue: queue } = live.current;
    updateJam(db, appId, jamId, { audio: audioRef.current, track, queue }).catch(() => {});
  }, [db, appId, jamId, audioRef]);

  const start = useCallback(async () => {
    if (!user || user.isAnonymous) { notify?.('Google 로그인 후 Jam을 열 수 있습니다.'); return null; }
    const id = newJamId();
    try {
      await createJam(db, appId, { id, hostUid: user.uid, hostName, audio: audioRef.current, track: live.current.currentTrack, queue: live.current.currentQueue });
      setJamId(id); setRole('host');
      return id;
    } catch { notify?.('Jam을 열지 못했습니다. 잠시 후 다시 시도해 주세요.'); return null; }
  }, [db, appId, user, hostName, audioRef, notify]);

  const end = useCallback(async () => {
    const id = jamId;
    setRole(null); setJamId(''); setHostState(null);
    if (role === 'host' && id) await endJam(db, appId, id).catch(() => {});
  }, [db, appId, jamId, role]);

  useEffect(() => {
    if (role !== 'host') return;
    const audio = audioRef.current;
    let timer = 0;
    const soon = () => { clearTimeout(timer); timer = setTimeout(push, 300); };
    const events = ['playing', 'pause', 'seeked'];
    events.forEach((type) => audio?.addEventListener(type, soon));
    const beat = setInterval(push, JAM_HEARTBEAT_MS);
    return () => { clearTimeout(timer); clearInterval(beat); events.forEach((type) => audio?.removeEventListener(type, soon)); };
  }, [role, audioRef, push]);

  // A new track goes out at once, not on the next heartbeat.
  useEffect(() => { if (role === 'host') push(); }, [role, currentTrack?.id, push]);

  // ---------- guest ----------
  const align = useCallback((state) => {
    const audio = audioRef.current;
    if (!audio || !state) return;
    const target = expectedPosition(state, Date.now(), Number.isFinite(offsetRef.current) ? offsetRef.current : 0);
    if (Number.isFinite(audio.duration) && Math.abs(audio.currentTime - target) > JAM_DRIFT_SECONDS) audio.currentTime = Math.min(target, Math.max(0, audio.duration - 0.5));
    if (state.playing && audio.paused) audio.play().catch(() => notify?.('화면을 눌러 Jam 재생을 이어가 주세요.'));
    if (!state.playing && !audio.paused) audio.pause();
  }, [audioRef, notify]);

  const follow = useCallback((state) => {
    const { currentTrack: track, publicTracks: all, playTrack: play } = live.current;
    const audio = audioRef.current;
    if (!state || !audio) return;
    if (track?.id === state.trackId) { align(state); return; }
    const byId = new Map(all.map((t) => [t.id, t]));
    const queue = (state.queueIds || []).map((id) => byId.get(id)).filter(Boolean);
    const list = queue.some((t) => t.id === state.trackId) ? queue : [byId.get(state.trackId)].filter(Boolean);
    const index = list.findIndex((t) => t.id === state.trackId);
    if (index < 0) return;
    // Seek once the new track knows its length; play() itself runs now, inside the tap that joined.
    audio.addEventListener('loadedmetadata', () => align(latestRef.current), { once: true });
    play(index, list, { continuation: true });
    if (!state.playing) audio.addEventListener('playing', () => { if (!latestRef.current?.playing) audio.pause(); }, { once: true });
  }, [audioRef, align]);

  const onState = useCallback((state, arrivedAt) => {
    if (!state) { notify?.('Jam이 끝났습니다. 음악은 계속 들을 수 있습니다.'); setRole(null); setJamId(''); setHostState(null); return; }
    const at = state.updatedAt?.toMillis?.();
    // The smallest gap between the host's server time and arrival here approximates the clock difference.
    if (at) offsetRef.current = Math.min(offsetRef.current, arrivedAt - at);
    latestRef.current = state;
    setHostState(state);
    follow(state);
  }, [follow, notify]);

  // Called from the join page's button, so the first play() happens inside the listener's tap.
  const join = useCallback((id, firstState) => {
    if (!validJamId(id)) return;
    offsetRef.current = Infinity;
    setJamId(id); setRole('guest');
    if (firstState) onState(firstState, Date.now());
  }, [onState]);

  const resync = useCallback(() => { if (latestRef.current) follow(latestRef.current); }, [follow]);

  useEffect(() => {
    if (role !== 'guest' || !jamId) return;
    return subscribeJam(db, appId, jamId, onState, () => notify?.('Jam 연결이 끊겼습니다. 다시 맞추기를 눌러 주세요.'));
  }, [role, jamId, db, appId, onState, notify]);

  // Stable while nothing changes, so memoized routes do not re-render on every playback tick.
  return useMemo(() => ({ role, jamId, hostState, start, end, join, leave: end, resync }), [role, jamId, hostState, start, end, join, resync]);
}
