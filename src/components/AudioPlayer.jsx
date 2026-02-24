// src/components/AudioPlayer.jsx
import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Heart, Share2,
  Volume2, VolumeX, Loader2, ChevronDown, AlignLeft, Repeat
} from 'lucide-react';

const glass = "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const AudioPlayer = ({
  currentTrack, isPlayerExpanded, setIsPlayerExpanded, isPlaying, 
  progressPct, volume, isMuted, setIsMuted, setVolume, handleShare,
  handleToggleLike, userLikes, togglePlay, playTrack, currentTrackIdx,
  publicTracks, isBuffering, showLyrics, setShowLyrics, 
  duration, currentTime, audioRef, formatTime, 
  parsedLyrics, setParsedLyrics // 🚀 App.jsx에서 관리하던 상태를 넘겨받음
}) => {

  // 🚀 [가사 파싱(Parsing) 엔진 - AudioPlayer 내부로 이동]
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

  // 🚀 [가사 하이라이트 인덱스 실시간 추적]
  const activeLyricIdx = useMemo(() => {
    if (!parsedLyrics || parsedLyrics.length <= 1) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time - 0.2) {
        idx = i;
      } else {
        break; 
      }
    }
    return idx;
  }, [currentTime, parsedLyrics]);

  // 🚀 [가사 오토 스크롤 엔진 - 타이밍 보완]
  useEffect(() => {
    if (showLyrics && activeLyricIdx !== -1 && parsedLyrics && parsedLyrics.length > 1) {
      const timeoutId = setTimeout(() => {
        const el = document.getElementById(`lyric-${activeLyricIdx}`);
        if (el) { 
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); 
        }
      }, 50); 
      return () => clearTimeout(timeoutId);
    }
  }, [activeLyricIdx, showLyrics, parsedLyrics]);

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      {/* --- 미니 플레이어 --- */}
      <motion.div 
        initial={{ y: 150 }} 
        animate={{ y: isPlayerExpanded ? 150 : 0 }} 
        exit={{ y: 150 }} 
        transition={{ type: "spring", stiffness: 150, damping: 20 }} 
        className="fixed bottom-4 lg:bottom-10 left-0 w-full z-[200] px-4 lg:px-8 flex justify-center cursor-pointer"
        onClick={() => setIsPlayerExpanded(true)}
      >
        <div className={`${glass} w-full max-w-5xl p-2.5 px-3 lg:p-4 lg:px-6 rounded-[2rem] lg:rounded-full flex items-center justify-between border-white/20 shadow-2xl bg-zinc-900/90 lg:bg-white/[0.03] backdrop-blur-2xl group/mini relative`}>
          
          {/* 🚀 은은한 배경 차오름 효과 */}
          <div className="absolute top-[-1px] left-0 right-0 h-[2px] rounded-[2rem] lg:rounded-full overflow-hidden pointer-events-none z-10">
            <div className="h-full bg-blue-400 rounded-full shadow-[0_0_15px_3px_rgba(59,130,246,0.8),0_0_30px_8px_rgba(0,74,173,0.6)] transition-all duration-300 ease-linear" style={{ width: `${progressPct}%` }} />
          </div>
          
          {/* 🚀 상단 네온 프로그레스 바 (양쪽 끝을 둥글게 rounded-full 적용) */}
          <div className="absolute top-[-1px] left-0 h-[2px] bg-blue-400 rounded-full shadow-[0_0_15px_3px_rgba(59,130,246,0.8),0_0_30px_8px_rgba(0,74,173,0.6)] pointer-events-none transition-all duration-300 ease-linear z-10" style={{ width: `${progressPct}%` }} />

          <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1 relative z-10">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-zinc-800 overflow-hidden shrink-0 relative shadow-lg">
              <img src={currentTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17"} loading="lazy" className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`} alt="" />
              <div className={`absolute inset-0 bg-[#004aad]/20 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />
            </div>
            <div className="truncate pr-2">
              <p className="text-sm lg:text-xl font-black uppercase truncate tracking-tight leading-none text-white">{currentTrack.title}</p>
              <p className="text-[10px] lg:text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1 truncate">{currentTrack.artist}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 lg:gap-5 shrink-0 relative z-10" onClick={(e) => e.stopPropagation()}>
            
            <div className="relative group/vol flex items-center justify-center hidden md:flex">
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 lg:w-6 lg:h-6" /> : <Volume2 className="w-5 h-5 lg:w-6 lg:h-6" />}
              </button>
              <div className="absolute bottom-[120%] mb-2 w-10 h-32 bg-zinc-900 border border-white/10 rounded-[2rem] opacity-0 invisible group-hover/vol:opacity-100 group-hover/vol:visible transition-all flex flex-col items-center justify-center shadow-2xl z-50">
                <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => {setVolume(e.target.value); setIsMuted(false);}} className="w-1.5 h-24 appearance-none bg-white/20 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer slider-vertical" style={{ WebkitAppearance: 'slider-vertical' }} />
              </div>
            </div>

            <button onClick={(e) => handleShare(e, currentTrack, 'track')} className="p-2 text-zinc-400 hover:text-white transition-colors hidden md:block">
              <Share2 className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>

            <button onClick={(e) => handleToggleLike(e, currentTrack.id)} className={`p-2 lg:mr-2 transition-all ${userLikes.includes(currentTrack.id) ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-zinc-400 hover:text-white'}`}>
              <Heart className={`w-6 h-6 lg:w-7 lg:h-7 ${userLikes.includes(currentTrack.id) ? 'fill-current' : ''}`} />
            </button>

            <button onClick={togglePlay} className="w-12 h-12 lg:w-16 lg:h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
              {isPlaying ? (isBuffering ? <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" /> : <Pause className="w-5 h-5 lg:w-6 lg:h-6 fill-current" />) : <Play className="w-5 h-5 lg:w-6 lg:h-6 fill-current ml-1" />}
            </button>
            <button onClick={() => playTrack((currentTrackIdx + 1) % publicTracks.length)} className="p-2 text-zinc-300 hover:text-white transition-colors"><SkipForward className="w-6 h-6 lg:w-7 lg:h-7 fill-current" /></button>
          </div>
        </div>
      </motion.div>

      {/* --- 풀스크린 플레이어 --- */}
      <AnimatePresence>
        {isPlayerExpanded && (
          <motion.div 
            initial={{ y: "100%", opacity: 0.5 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: "100%", opacity: 0 }} 
            transition={{ duration: 0.25, ease: "easeOut" }} 
            className="fixed inset-0 z-[400] bg-zinc-950 flex flex-col pt-safe-top"
          >
            <div className="flex items-center justify-between p-6 px-8 relative z-10 bg-gradient-to-b from-zinc-950 to-transparent">
              <button onClick={() => setIsPlayerExpanded(false)} className="p-2 -ml-2 text-white/70 hover:text-white"><ChevronDown className="w-8 h-8" /></button>
              <div className="text-center flex-1">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Now Playing</p>
                <p className="text-xs font-black uppercase text-white mt-1">Unframe Project UP</p>
              </div>
              <div className="w-8 h-8" /> 
            </div>

            <div className="flex-1 overflow-hidden flex flex-col items-center justify-center relative w-full max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                {!showLyrics ? (
                  <motion.div key="cover" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full aspect-square max-w-md rounded-[2.5rem] lg:rounded-[4rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/5 bg-zinc-900 px-8">
                    <img src={currentTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17"} loading="lazy" className="w-full h-full object-cover" alt="Album Cover" />
                  </motion.div>
                ) : (
                  // 🚀 가사 컨테이너 높이(h-[60vh]) 고정 및 스크롤 패딩 최적화
                  <motion.div key="lyrics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full h-[60vh] flex flex-col overflow-y-auto no-scrollbar relative scroll-smooth px-6 lg:px-12">
                    {parsedLyrics && parsedLyrics.length > 0 ? (
                      <div className="space-y-6 lg:space-y-10 pb-[40vh] pt-[20vh] w-full max-w-xl mx-auto">
                        {parsedLyrics.map((lyric, idx) => {
                          const isActive = idx === activeLyricIdx;
                          if (parsedLyrics.length === 1 && lyric.time === 0) {
                            return <p key={idx} className="text-xl lg:text-3xl text-center font-bold text-zinc-300 leading-loose whitespace-pre-wrap">{lyric.text}</p>
                          }
                          return (
                            <div key={idx} id={`lyric-${idx}`} className={`transition-all duration-500 origin-left py-2 ${isActive ? 'scale-[1.15] opacity-100' : 'opacity-30 blur-[1px]'}`}>
                              <p className={`text-2xl lg:text-4xl font-black tracking-tight leading-tight ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                                {lyric.text || '🎵'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center h-full">
                        <span className="text-zinc-600 font-bold italic text-lg">가사가 등록되지 않은 음원입니다.</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-8 pb-12 lg:pb-16 w-full max-w-2xl mx-auto space-y-8 bg-gradient-to-t from-black via-zinc-950/90 to-transparent relative z-10">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter truncate text-white">{currentTrack.title}</h2>
                  <p className="text-sm lg:text-lg font-bold text-[#004aad] uppercase tracking-widest mt-2 truncate">{currentTrack.artist}</p>
                </div>
                <button onClick={(e) => handleToggleLike(e, currentTrack.id)} className={`p-3 rounded-full transition-all ${userLikes.includes(currentTrack.id) ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white'}`}>
                  <Heart className={`w-7 h-7 ${userLikes.includes(currentTrack.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="space-y-3 relative py-2">
                <div className="h-2 bg-white/10 rounded-full relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-100 ease-linear" style={{ width: `${progressPct}%` }} />
                </div>
                <input type="range" min="0" max={duration || 0} step="0.1" value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value); }} className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10" />
                <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <button onClick={() => playTrack((currentTrackIdx - 1 + publicTracks.length) % publicTracks.length)} className="p-4 text-white hover:scale-110 transition-transform"><SkipBack className="w-10 h-10 fill-current" /></button>
                <button onClick={togglePlay} className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl">
                  {isPlaying ? (isBuffering ? <Loader2 className="w-10 h-10 animate-spin" /> : <Pause className="w-10 h-10 fill-current" />) : <Play className="w-10 h-10 fill-current ml-2" />}
                </button>
                <button onClick={() => playTrack((currentTrackIdx + 1) % publicTracks.length)} className="p-4 text-white hover:scale-110 transition-transform"><SkipForward className="w-10 h-10 fill-current" /></button>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5 opacity-80 px-4">
                <button onClick={() => setShowLyrics(!showLyrics)} className={`flex flex-col items-center gap-2 transition-colors ${showLyrics ? 'text-[#004aad]' : 'text-zinc-400 hover:text-white'}`}>
                  <AlignLeft className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Lyrics</span>
                </button>
                <button onClick={(e) => handleShare(e, currentTrack, 'track')} className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                  <Share2 className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Share</span>
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-colors hidden md:flex">
                  {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  <span className="text-[9px] font-black uppercase tracking-widest">Mute</span>
                </button>
                <button className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                  <Repeat className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Loop</span>
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default AudioPlayer;