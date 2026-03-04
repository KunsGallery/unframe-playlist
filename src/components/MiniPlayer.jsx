// src/components/MiniPlayer.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  Heart,
  Share2,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';

const glass =
  "bg-zinc-950/80 backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const MiniPlayer = ({
  currentTrack,
  isPlaying,
  progressPct,
  volume,
  isMuted,
  setIsMuted,
  setVolume,
  handleShare,
  handleToggleLike,
  userLikes,
  togglePlay,
  playTrack,
  currentTrackIdx,
  publicTracks,
  isBuffering,
  setIsPlayerExpanded
}) => {

  if (!currentTrack) return null;

  return (
    <motion.div
      key="mini-player"
      initial={{ y: 150, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 150, opacity: 0 }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
      className="fixed bottom-4 lg:bottom-10 left-0 w-full z-50 px-4 lg:px-8 flex justify-center"
    >
      <div
        className={`${glass} w-full max-w-5xl p-3 lg:p-4 rounded-4xl lg:rounded-full flex items-center justify-between relative cursor-pointer`}
        onClick={() => setIsPlayerExpanded(true)}
      >

        {/* 🔵 리빌 네온 시스템 */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 overflow-hidden rounded-4xl lg:rounded-full">

            {/* 리빌 */}
            <div
              className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#004aad]/5 via-[#004aad]/30 to-[#004aad]/70 transition-[width] duration-150 ease-linear"
              style={{ width: `${progressPct}%` }}
            />

            {/* 네온 라인 */}
            <div
              className="absolute top-0 bottom-0 w-[2px]"
              style={{
                left: `calc(${progressPct}% - 1px)`,
                backgroundColor: '#004aad',
                boxShadow: '0 0 18px 6px rgba(0,74,173,0.9)',
                transition: 'left 0.15s linear'
              }}
            />
          </div>
        </div>

        {/* 좌측 영역 */}
        <div className="flex items-center gap-4 flex-1 relative z-10 min-w-0">
          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full overflow-hidden relative shadow-lg">
            <img
              src={currentTrack.image}
              className={`w-full h-full object-cover ${
                isPlaying ? "animate-[spin_20s_linear_infinite]" : ""
              }`}
              alt=""
            />
          </div>

          <div className="truncate">
            <p className="text-sm lg:text-lg font-black text-white truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* 우측 컨트롤 */}
        <div
          className="flex items-center gap-3 relative z-20"
          onClick={(e) => e.stopPropagation()}
        >

          {/* 🔊 볼륨 + hover 슬라이더 복구 */}
          <div className="relative group hidden md:flex">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 w-10 h-32 bg-zinc-900 border border-white/10 rounded-3xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex items-center justify-center shadow-2xl z-50">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setIsMuted(false);
                }}
                className="w-1.5 h-24 appearance-none bg-white/20 rounded-full outline-none
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              />
            </div>
          </div>

          {/* 🔗 공유 버튼 복구 */}
          <button
            onClick={(e) => handleShare(e, currentTrack, 'track')}
            className="p-2 text-zinc-400 hover:text-white transition-colors hidden md:block"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* ❤️ 좋아요 */}
          <button
            onClick={(e) => handleToggleLike(e, currentTrack.id)}
            className="p-2"
          >
            <Heart
              className={`w-6 h-6 ${
                userLikes.includes(currentTrack.id)
                  ? "text-red-500 fill-current"
                  : "text-white"
              }`}
            />
          </button>

          {/* ▶ 재생 */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl"
          >
            {isPlaying ? (
              isBuffering ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Pause className="w-5 h-5 fill-current" />
              )
            ) : (
              <Play className="w-5 h-5 fill-current ml-1" />
            )}
          </button>

          {/* ⏭ 다음곡 */}
          <button
            onClick={() =>
              playTrack((currentTrackIdx + 1) % publicTracks.length)
            }
            className="p-2 text-white"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MiniPlayer;