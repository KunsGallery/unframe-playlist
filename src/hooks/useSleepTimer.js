// src/hooks/useSleepTimer.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { setPlaybackState } from '../utils/PlayerUtils';

export const SLEEP_OPTIONS = [15, 30, 45, 60];

// Stops playback after a set time, or when the current track ends.
// The check runs on the audio element's timeupdate, which keeps firing on a locked phone,
// where an ordinary setTimeout may be held back until the screen wakes.
export function useSleepTimer({ audioRef, setIsPlaying, notify }) {
  const [deadline, setDeadline] = useState(0);
  const [endOfTrack, setEndOfTrack] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const deadlineRef = useRef(0), endOfTrackRef = useRef(false);

  const cancel = useCallback(() => {
    deadlineRef.current = 0; endOfTrackRef.current = false;
    setDeadline(0); setEndOfTrack(false);
  }, []);

  const start = useCallback((minutes) => {
    const at = Date.now() + minutes * 60000;
    deadlineRef.current = at; endOfTrackRef.current = false;
    setDeadline(at); setEndOfTrack(false); setNow(Date.now());
    notify?.(`${minutes}분 뒤에 재생을 멈춥니다`);
  }, [notify]);

  const startEndOfTrack = useCallback(() => {
    deadlineRef.current = 0; endOfTrackRef.current = true;
    setDeadline(0); setEndOfTrack(true);
    notify?.('이 곡이 끝나면 재생을 멈춥니다');
  }, [notify]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setPlaybackState('paused');
    cancel();
    notify?.('수면 타이머로 재생을 멈췄습니다');
  }, [audioRef, setIsPlaying, cancel, notify]);

  // Called by the player when a track ends naturally. Returns true when the timer took over.
  const consumeTrackEnd = useCallback(() => {
    if (!endOfTrackRef.current) return false;
    stop();
    return true;
  }, [stop]);

  useEffect(() => {
    if (!deadline) return;
    const audio = audioRef.current;
    const check = () => { if (deadlineRef.current && Date.now() >= deadlineRef.current) stop(); };
    const tick = setInterval(() => { setNow(Date.now()); check(); }, 1000);
    audio?.addEventListener('timeupdate', check);
    return () => { clearInterval(tick); audio?.removeEventListener('timeupdate', check); };
  }, [deadline, audioRef, stop]);

  const remaining = deadline ? Math.max(0, deadline - now) : 0;
  return { deadline, endOfTrack, remaining, active: Boolean(deadline || endOfTrack), start, startEndOfTrack, cancel, consumeTrackEnd };
}

export const formatRemaining = (ms) => {
  const total = Math.ceil(ms / 1000), m = Math.floor(total / 60), s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
