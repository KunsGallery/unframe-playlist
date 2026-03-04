// src/components/AudioPlayer.jsx
import React, { useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import MiniPlayer from './MiniPlayer';
import FullPlayer from './FullPlayer';

const AudioPlayer = (props) => {
  const { currentTrack, currentTime, parsedLyrics, setParsedLyrics, isPlayerExpanded, playerView } = props; // playerView 추가됨

  // 가사 파싱 (기존 동일)
  useEffect(() => {
    if (currentTrack && currentTrack.lyrics) {
      const hasTimeTags = /\[\d{1,3}:\d{1,2}(?:\.\d{1,3})?\]/.test(currentTrack.lyrics);
      if (hasTimeTags) {
        const lines = currentTrack.lyrics.split(/\r?\n/);
        const parsed = [];
        const timeReg = /\[(\d{1,3}):(\d{1,2}(?:\.\d{1,3})?)\]/;
        lines.forEach(line => {
          const match = timeReg.exec(line);
          if (match) {
            const min = parseInt(match[1], 10);
            const sec = parseFloat(match[2]);
            const time = (min * 60) + sec;
            const text = line.replace(timeReg, '').trim();
            parsed.push({ time, text });
          }
        });
        parsed.sort((a, b) => a.time - b.time);
        setParsedLyrics(parsed);
      } else {
        setParsedLyrics([{ time: 0, text: currentTrack.lyrics }]);
      }
    } else {
      setParsedLyrics([]);
    }
  }, [currentTrack, setParsedLyrics]);

  // 가사 인덱스 추적 (기존 동일)
  const activeLyricIdx = useMemo(() => {
    if (!parsedLyrics || parsedLyrics.length <= 1) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time - 0.4) {
        idx = i;
      } else { break; }
    }
    return idx;
  }, [currentTime, parsedLyrics]);

  if (!currentTrack) return null;

  return (
    <AnimatePresence mode="wait">
      {!isPlayerExpanded ? (
        <MiniPlayer {...props} /> 
      ) : (
        <FullPlayer {...props} activeLyricIdx={activeLyricIdx} />
      )}
    </AnimatePresence>
  );
};

export default AudioPlayer;