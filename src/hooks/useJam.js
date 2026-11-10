// src/hooks/useJam.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JAM_HEARTBEAT_MS, JAM_SYNC_TICK_MS, createJam, endJam, expectedPosition, newJamId, subscribeJam, syncStep, updateJam, validJamId } from '../utils/jam';

// Host: mirrors this player into the Jam document on play, pause, seek, track change and a slow heartbeat.
// Guest: follows the document. Guests may still pause or skip on their own; the next host update pulls them back.
export function useJam({ db, appId, audioRef, currentTrack, currentQueue, publicTracks, playTrack, user, hostName, notify }) {
  const [role, setRole] = useState(null);
  const [jamId, setJamId] = useState('');
  const [hostState, setHostState] = useState(null);
  const offsetRef = useRef(Infinity), latestRef = useRef(null);
  // Seconds a seek takes to resume on this device and network, learned from each jump.
  const seekLagRef = useRef(0.2), seekStartRef = useRef(0);
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
  // Move toward the host's moment: a jump when far apart, a slight speed change when close.
  const correct = useCallback((state) => {
    const audio = audioRef.current;
    if (!audio || !state || !Number.isFinite(audio.duration) || audio.seeking) return;
    const target = expectedPosition(state, Date.now(), Number.isFinite(offsetRef.current) ? offsetRef.current : 0);
    const drift = target - audio.currentTime;
    // While the host plays, follow the moving moment; while paused, just stand at the host's spot.
    const step = state.playing ? syncStep(drift, seekLagRef.current) : Math.abs(drift) > 0.25 ? { seekBy: drift, rate: 1 } : { rate: 1 };
    if (step.seekBy !== undefined) {
      seekStartRef.current = performance.now();
      audio.currentTime = Math.min(Math.max(0, audio.currentTime + step.seekBy), Math.max(0, audio.duration - 0.5));
    }
    if (audio.playbackRate !== step.rate) audio.playbackRate = step.rate;
  }, [audioRef]);

  const align = useCallback((state) => {
    const audio = audioRef.current;
    if (!audio || !state) return;
    correct(state);
    if (state.playing && audio.paused) audio.play().catch(() => notify?.('화면을 눌러 Jam 재생을 이어가 주세요.'));
    if (!state.playing && !audio.paused) { audio.pause(); audio.playbackRate = 1; }
  }, [audioRef, correct, notify]);

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
    // The join page read this state a while ago, so it starts the track but does not set the
    // clock difference; the live listener's first fresh reading does that a moment later.
    if (firstState) { latestRef.current = firstState; setHostState(firstState); follow(firstState); }
  }, [follow]);

  const resync = useCallback(() => { if (latestRef.current) follow(latestRef.current); }, [follow]);

  // Between host updates, keep checking: buffering, a slow seek or a device clock running a
  // little fast all show up here and are evened out while the music plays.
  useEffect(() => {
    if (role !== 'guest') return;
    const audio = audioRef.current;
    const landed = () => {
      if (!seekStartRef.current) return;
      const took = (performance.now() - seekStartRef.current) / 1000;
      seekStartRef.current = 0;
      if (took < 5) seekLagRef.current = seekLagRef.current * 0.5 + took * 0.5;
    };
    audio?.addEventListener('seeked', landed);
    const tick = setInterval(() => {
      const state = latestRef.current, { currentTrack: track } = live.current;
      if (state && track?.id === state.trackId && audio && !audio.paused && audio.readyState >= 3) correct(state);
    }, JAM_SYNC_TICK_MS);
    return () => {
      clearInterval(tick);
      audio?.removeEventListener('seeked', landed);
      if (audio) audio.playbackRate = 1;
    };
  }, [role, audioRef, correct]);

  useEffect(() => {
    if (role !== 'guest' || !jamId) return;
    return subscribeJam(db, appId, jamId, onState, () => notify?.('Jam 연결이 끊겼습니다. 다시 맞추기를 눌러 주세요.'));
  }, [role, jamId, db, appId, onState, notify]);

  // Stable while nothing changes, so memoized routes do not re-render on every playback tick.
  return useMemo(() => ({ role, jamId, hostState, start, end, join, leave: end, resync }), [role, jamId, hostState, start, end, join, resync]);
}
