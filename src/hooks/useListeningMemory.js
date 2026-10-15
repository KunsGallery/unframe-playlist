import { useEffect, useRef } from 'react';
import { getDirectLink } from '../utils/PlayerUtils';

export function useListeningMemory({ audioRef, currentQueue, currentTrackIdx, currentTrack, publicTracks, setCurrentQueue, setCurrentTrackIdx, setCurrentTime, loopMode, isShuffle }) {
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !publicTracks.length) return;
    restored.current = true;
    if (currentQueue.length) return;
    try {
      const saved = JSON.parse(localStorage.getItem('up:listening') || 'null');
      if (!saved) return;
      const map = new Map(publicTracks.map((t) => [t.id, t]));
      const queue = (saved.ids || []).map((id) => map.get(id)).filter(Boolean);
      const index = queue.findIndex((t) => t.id === saved.trackId);
      if (index < 0 || !audioRef.current) return;
      setCurrentQueue(queue); setCurrentTrackIdx(index);
      const audio = audioRef.current;
      const position = Math.max(0, Number(saved.position) || 0);
      const restorePosition = () => { const time = Math.min(position, Number.isFinite(audio.duration) ? audio.duration : position); audio.currentTime = time; setCurrentTime(time); };
      audio.addEventListener('loadedmetadata', restorePosition, { once: true });
      audio.src = getDirectLink(queue[index].audioUrl); audio.load();
      return () => audio.removeEventListener('loadedmetadata', restorePosition);
    } catch { /* Storage is optional in private browsing. */ }
  }, [publicTracks, currentQueue.length, audioRef, setCurrentQueue, setCurrentTrackIdx, setCurrentTime]);
  useEffect(() => {
    if (!currentTrack) return;
    const save = () => {
      try { localStorage.setItem('up:listening', JSON.stringify({ ids: currentQueue.slice(0, 200).map((t) => t.id), trackId: currentTrack.id, position: audioRef.current?.currentTime || 0, loopMode, isShuffle })); } catch { /* Storage quota. */ }
    };
    const timer = setInterval(save, 5000);
    window.addEventListener('pagehide', save); document.addEventListener('visibilitychange', save);
    return () => { save(); clearInterval(timer); window.removeEventListener('pagehide', save); document.removeEventListener('visibilitychange', save); };
  }, [audioRef, currentQueue, currentTrackIdx, currentTrack, loopMode, isShuffle]);
}
