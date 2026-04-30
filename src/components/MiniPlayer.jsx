// src/components/MiniPlayer.jsx
import React, { useState } from 'react';
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
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  if (!currentTrack) return null;

  const isLiked = userLikes.includes(currentTrack.id);

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
        className={`${glass} w-full max-w-5xl p-3 lg:p-4 rounded-4xl lg:rounded-full flex items-center justify-between relative cursor-pointer gap-3`}
        onClick={() => setIsPlayerExpanded(true)}
      >
        {/* Progress Reveal */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 overflow-hidden rounded-4xl lg:rounded-full">
            <div
              className="absolute top-0 left-0 bottom-0 bg-linear-to-r from-[#004aad]/5 via-[#004aad]/30 to-[#004aad]/70 transition-[width] duration-150 ease-linear"
              style={{ width: `${progressPct}%` }}
            />

            <div
              className="absolute top-0 bottom-0 w-0.5"
              style={{
                left: `calc(${progressPct}% - 1px)`,
                backgroundColor: '#004aad',
                boxShadow: '0 0 18px 6px rgba(0,74,173,0.9)',
                transition: 'left 0.15s linear'
              }}
            />
          </div>
        </div>

        {/* Track Info */}
        <div className="flex items-center gap-4 flex-1 relative z-10 min-w-0">
          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full overflow-hidden relative shadow-lg shrink-0">
            <img
              src={currentTrack.image}
              className={`w-full h-full object-cover ${
                isPlaying ? "animate-[spin_20s_linear_infinite]" : ""
              }`}
              alt=""
            />
          </div>

          <div className="truncate min-w-0">
            <p className="text-sm lg:text-lg font-black text-white truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div
          className="flex items-center gap-2 lg:gap-3 relative z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Group: Like / Share */}
          <div className="flex items-center gap-1 lg:gap-2 pr-1 lg:pr-3 border-r border-white/10">
            <button
              onClick={(e) => handleToggleLike(e, currentTrack.id)}
              className={`p-2 rounded-full transition-colors ${
                isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label="Like track"
            >
              <Heart
                className={`w-5 h-5 lg:w-6 lg:h-6 ${isLiked ? "fill-current" : ""}`}
              />
            </button>

            <button
              onClick={(e) => handleShare(e, currentTrack, 'track')}
              className="p-2 rounded-full text-zinc-400 hover:text-white transition-colors"
              aria-label="Share track"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Control Group: Volume / Play / Next */}
          <div className="flex items-center gap-1 lg:gap-2">
            <div className="relative hidden md:flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVolumeOpen((prev) => !prev);
                }}
                className="p-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Volume"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {isVolumeOpen && (
                <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 w-11 h-36 bg-zinc-900 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl z-50">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const nextVolume = Number(e.target.value);
                      setVolume(nextVolume);
                      setIsMuted(nextVolume === 0);
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
              )}
            </div>

            <button
              onClick={togglePlay}
              className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                isBuffering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Pause className="w-5 h-5 fill-current" />
                )
              ) : isBuffering ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={() =>
                playTrack((currentTrackIdx + 1) % publicTracks.length)
              }
              className="p-2 text-white hover:text-[#8db4ff] transition-colors"
              aria-label="Next track"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MiniPlayer;