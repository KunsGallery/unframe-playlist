// src/components/FullPlayer.jsx
import React, { useEffect, useRef } from 'react';
import { formatTime, getDirectLink } from "../utils/PlayerUtils";
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Heart, Share2, Volume2, VolumeX, Loader2, ChevronDown, AlignLeft, Repeat, Shuffle, Repeat1, ListMusic } from 'lucide-react';

const FullPlayer = ({
  currentTrack, setIsPlayerExpanded, isPlaying, progressPct, volume, isMuted, setIsMuted, setVolume,
  handleShare, handleToggleLike, userLikes, togglePlay, playTrack, currentTrackIdx, publicTracks, isBuffering,
  playerView, setPlayerView, 
  parsedLyrics, activeLyricIdx, duration, currentTime, audioRef, loopMode, toggleLoop, isShuffle, toggleShuffle
}) => {
  
  const lyricsContainerRef = useRef(null);
  const listContainerRef = useRef(null);

  useEffect(() => {
    if (playerView === 'lyrics' && activeLyricIdx !== -1 && lyricsContainerRef.current) {
        const activeEl = document.getElementById(`lyric-${activeLyricIdx}`);
        if (activeEl) {
            const container = lyricsContainerRef.current;
            const scrollOffset = activeEl.offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
            container.scrollTo({ top: scrollOffset, behavior: 'smooth' });
        }
    }
  }, [activeLyricIdx, playerView]);

  useEffect(() => {
      if (playerView === 'list' && listContainerRef.current) {
          const activeItem = document.getElementById(`track-${currentTrack.id}`);
          if(activeItem) {
              activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [playerView, currentTrack.id]);

  return (
    <motion.div 
      key="full-player"
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.3, ease: "easeInOut" }} 
      className="fixed inset-0 z-400 bg-zinc-950 flex flex-col pt-safe-top"
    >
        <div className="flex items-center justify-between p-6 px-8 relative z-10 bg-linear-to-b from-zinc-950 to-transparent">
          <button onClick={() => setIsPlayerExpanded(false)} className="p-2 -ml-2 text-white/70 hover:text-white"><ChevronDown className="w-8 h-8" /></button>
          <div className="text-center flex-1"><p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Now Playing</p><p className="text-xs font-black uppercase text-white mt-1">Unframe Project UP</p></div><div className="w-8 h-8" /> 
        </div>

        <div className="flex-1 overflow-hidden flex flex-col items-center justify-center relative w-full max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            
            {/* 1. Cover View - 🚀 [수정됨] px-8 제거, object-cover 적용 */}
            {playerView === 'cover' && (
              <motion.div key="cover" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full aspect-square max-w-md rounded-[2.5rem] lg:rounded-[4rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/5 bg-zinc-900 mx-6" onClick={() => setPlayerView('lyrics')}>
                <img src={currentTrack.image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17"} loading="lazy" className="w-full h-full object-cover" alt="Album Cover" />
              </motion.div>
            )}

            {/* 2. Lyrics View */}
            {playerView === 'lyrics' && (
              <motion.div key="lyrics" ref={lyricsContainerRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full h-[60vh] flex flex-col overflow-y-auto no-scrollbar relative scroll-smooth px-6 lg:px-12" onClick={() => setPlayerView('cover')}>
                {parsedLyrics.length > 0 ? (
                  <div className="space-y-6 lg:space-y-10 pb-[40vh] pt-[20vh] w-full max-w-xl mx-auto">
                    {parsedLyrics.map((lyric, idx) => {
                      const isActive = idx === activeLyricIdx;
                      if (parsedLyrics.length === 1 && lyric.time === 0) { return <p key={idx} className="text-xl lg:text-4xl text-center font-bold text-zinc-300 leading-loose whitespace-pre-wrap">{lyric.text}</p> }
                      return (
                        <div key={idx} id={`lyric-${idx}`}
                        className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] py-3 ${
                          isActive
                            ? 'scale-[1.08] opacity-100 blur-0 translate-y-0'
                            : 'opacity-20 blur-[3px] scale-[0.98] translate-y-1'
                        }`}>
                          <p className={`
                               text-xl lg:text-3xl font-black tracking-tight leading-tight
                               transition-all duration-700
                               ${
                                 isActive
                                   ? 'text-[#5297ff] drop-shadow-[0_0_16px_rgba(0,74,173,0.7)]'
                                   : 'text-zinc-300'
                               }
                             `}
                          >
                            {lyric.text || '🎵'}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : ( <div className="flex-1 flex items-center justify-center h-full"><span className="text-zinc-600 font-bold italic text-lg">가사가 등록되지 않은 음원입니다.</span></div> )}
              </motion.div>
            )}

            {/* 3. List View */}
            {playerView === 'list' && (
              <motion.div key="list" ref={listContainerRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full h-[60vh] flex flex-col overflow-y-auto no-scrollbar relative scroll-smooth px-6 lg:px-12">
                  <div className="space-y-2 pb-[10vh] pt-4 w-full max-w-xl mx-auto">
                      {publicTracks.map((track, idx) => {
                          const isCurrent = currentTrack.id === track.id;
                          return (
                              <div key={track.id} id={`track-${track.id}`} onClick={() => playTrack(idx, publicTracks)} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${isCurrent ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}>
                                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative">
                                      <img src={track.image} className={`w-full h-full object-cover ${isCurrent && isPlaying ? 'opacity-50' : ''}`} alt="" />
                                      {isCurrent && isPlaying && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-black uppercase truncate ${isCurrent ? 'text-[#004aad]' : 'text-white'}`}>{track.title}</p>
                                      <p className="text-xs text-zinc-500 uppercase tracking-widest truncate">{track.artist}</p>
                                  </div>
                                  {isCurrent && <div className="w-2 h-2 rounded-full bg-[#004aad] shadow-[0_0_10px_#004aad]" />}
                              </div>
                          )
                      })}
                  </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <div className="p-8 pb-12 lg:pb-16 w-full max-w-2xl mx-auto space-y-8 bg-linear-to-t from-black via-zinc-950/90 to-transparent relative z-10">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0"><h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter truncate text-white">{currentTrack.title}</h2><p className="text-sm lg:text-lg font-bold text-[#004aad] uppercase tracking-widest mt-2 truncate">{currentTrack.artist}</p></div>
            <button onClick={(e) => handleToggleLike(e, currentTrack.id)} className={`p-3 rounded-full transition-all ${userLikes.includes(currentTrack.id) ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-white'}`}><Heart className={`w-7 h-7 ${userLikes.includes(currentTrack.id) ? 'fill-current' : ''}`} /></button>
          </div>
          <div className="space-y-4 py-3 relative">

            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">

              <div
                className="absolute inset-y-0 left-0 bg-[#004aad] transition-all duration-150 ease-linear"
                style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
              />

              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
                style={{
                  left: `calc(${(currentTime / duration) * 100 || 0}% - 8px)`
                }}
              />
            </div>

            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = parseFloat(e.target.value);
                }
              }}
              className="absolute top-0 left-0 w-full h-6 opacity-0 cursor-pointer"
            />

            <div className="flex justify-between text-[11px] font-bold text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-2">
            <button onClick={toggleShuffle} className={`p-3 transition-colors ${isShuffle ? 'text-[#004aad]' : 'text-zinc-500 hover:text-white'}`}><Shuffle className="w-6 h-6" /></button>
            <button onClick={() => playTrack((currentTrackIdx - 1 + publicTracks.length) % publicTracks.length)} className="p-4 text-white hover:scale-110 transition-transform"><SkipBack className="w-10 h-10 fill-current" /></button>
            <button onClick={togglePlay} className="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl">{isPlaying ? (isBuffering ? <Loader2 className="w-10 h-10 animate-spin" /> : <Pause className="w-10 h-10 fill-current" />) : <Play className="w-10 h-10 fill-current ml-2" />}</button>
            <button onClick={() => playTrack((currentTrackIdx + 1) % publicTracks.length)} className="p-4 text-white hover:scale-110 transition-transform"><SkipForward className="w-10 h-10 fill-current" /></button>
            <button onClick={toggleLoop} className={`p-3 transition-colors ${loopMode > 0 ? 'text-[#004aad]' : 'text-zinc-500 hover:text-white'}`}>{loopMode === 2 ? <Repeat1 className="w-6 h-6" /> : <Repeat className="w-6 h-6" />}</button>
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-white/5 opacity-80 px-4">
            <button onClick={() => setPlayerView(playerView === 'lyrics' ? 'cover' : 'lyrics')} className={`flex flex-col items-center gap-2 transition-colors ${playerView === 'lyrics' ? 'text-[#004aad]' : 'text-zinc-400 hover:text-white'}`}><AlignLeft className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Lyrics</span></button>
            <button onClick={() => setPlayerView(playerView === 'list' ? 'cover' : 'list')} className={`flex flex-col items-center gap-2 transition-colors ${playerView === 'list' ? 'text-[#004aad]' : 'text-zinc-400 hover:text-white'}`}><ListMusic className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">List</span></button>
            <button onClick={(e) => handleShare(e, currentTrack, 'track')} className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-colors"><Share2 className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">Share</span></button>
            <button onClick={() => setIsMuted(!isMuted)} className="items-center gap-2 text-zinc-400 hover:text-white transition-colors hidden md:flex">{isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}<span className="text-[9px] font-black uppercase tracking-widest">Mute</span></button>
          </div>
        </div>
    </motion.div>
  );
};

export default FullPlayer;