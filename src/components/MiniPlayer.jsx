// src/components/MiniPlayer.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, Heart, Share2, Volume2, VolumeX, Loader2 } from 'lucide-react';

const glass = "bg-zinc-950/80 backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const MiniPlayer = ({
  currentTrack, isPlaying, progressPct, volume, isMuted, setIsMuted, setVolume,
  handleShare, handleToggleLike, userLikes, togglePlay, playTrack, currentTrackIdx, publicTracks, isBuffering, setIsPlayerExpanded
}) => {
  return (
    <motion.div 
      key="mini-player"
      initial={{ y: 150, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      exit={{ y: 150, opacity: 0 }} 
      transition={{ type: "spring", stiffness: 150, damping: 20 }} 
      className="fixed bottom-4 lg:bottom-10 left-0 w-full z-[200] px-4 lg:px-8 flex justify-center cursor-pointer"
      onClick={() => setIsPlayerExpanded(true)}
    >
      {/* 🚀 relative 그룹: overflow 설정을 하지 않음 (볼륨바 노출 위함) */}
      <div className={`${glass} w-full max-w-5xl p-2.5 px-3 lg:p-4 lg:px-6 rounded-[2rem] lg:rounded-full flex items-center justify-between border-white/20 shadow-2xl group/mini relative`}>
        
        {/* 🚀 [수정됨] 배경만 따로 absolute로 빼서 overflow-hidden 적용 */}
        <div className="absolute inset-0 rounded-[2rem] lg:rounded-full overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#004aad]/20 via-[#004aad]/40 to-[#004aad]/60 transition-all duration-300 ease-linear" style={{ width: `${progressPct}%` }}>
                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-blue-400 shadow-[0_0_15px_2px_rgba(59,130,246,1)] box-content" />
            </div>
        </div>

        {/* 앨범 아트 & 정보 */}
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
        
        {/* 컨트롤 버튼 (z-index 높임) */}
        <div className="flex items-center gap-1.5 lg:gap-5 shrink-0 relative z-20" onClick={(e) => e.stopPropagation()}>
            <div className="relative group/vol items-center justify-center hidden md:flex">
                <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 lg:w-6 lg:h-6" /> : <Volume2 className="w-5 h-5 lg:w-6 lg:h-6" />}
                </button>
                {/* 🚀 이제 여기가 잘리지 않습니다! */}
                <div className="absolute bottom-[120%] mb-2 w-10 h-32 bg-zinc-900 border border-white/10 rounded-[2rem] opacity-0 invisible group-hover/vol:opacity-100 group-hover/vol:visible transition-all flex flex-col items-center justify-center shadow-2xl z-50">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => { setVolume(Number(e.target.value)); setIsMuted(false); }}
                      className="w-1.5 h-24 appearance-none bg-white/20 rounded-full outline-none
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                </div>
            </div>
            <button onClick={(e) => handleShare(e, currentTrack, 'track')} className="p-2 text-zinc-400 hover:text-white transition-colors hidden md:block"><Share2 className="w-5 h-5 lg:w-6 lg:h-6" /></button>
            <button onClick={(e) => handleToggleLike(e, currentTrack.id)} className={`p-2 lg:mr-2 transition-all ${userLikes.includes(currentTrack.id) ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-zinc-400 hover:text-white'}`}><Heart className={`w-6 h-6 lg:w-7 lg:h-7 ${userLikes.includes(currentTrack.id) ? 'fill-current' : ''}`} /></button>
            <button onClick={togglePlay} className="w-12 h-12 lg:w-16 lg:h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
            {isPlaying ? (isBuffering ? <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" /> : <Pause className="w-5 h-5 lg:w-6 lg:h-6 fill-current" />) : <Play className="w-5 h-5 lg:w-6 lg:h-6 fill-current ml-1" />}
            </button>
            <button onClick={() => playTrack((currentTrackIdx + 1) % publicTracks.length)} className="p-2 text-zinc-300 hover:text-white transition-colors"><SkipForward className="w-6 h-6 lg:w-7 lg:h-7 fill-current" /></button>
        </div>
      </div>
    </motion.div>
  );
};
export default MiniPlayer;