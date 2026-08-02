import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2, Pause, Play, Share2, SkipForward, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "../utils/PlayerUtils";

const MiniPlayer = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  setIsMuted,
  setVolume,
  handleShare,
  handleToggleLike,
  userLikes,
  togglePlay,
  playNext,
  isBuffering,
  setIsPlayerExpanded,
}) => {
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  if (!currentTrack) return null;

  const isLiked = userLikes.includes(currentTrack.id);
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      key="mini-player"
      className="up-mini-player"
    >
      <motion.div
        layoutId="up-player-surface"
        className="up-mini-player__bar"
        transition={{ layout: { type: "spring", stiffness: 210, damping: 27, mass: 0.9 } }}
      >
        <motion.div
          className="up-mini-player__return-paint"
          aria-hidden="true"
          initial={{ opacity: 0.58, scaleX: 2.8, scaleY: 2.1 }}
          animate={{ opacity: 0, scaleX: 0.35, scaleY: 0.45 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="up-mini-player__progress" style={{ width: `${progressPct}%` }} />

        <button type="button" className="up-mini-player__track" onClick={() => setIsPlayerExpanded(true)}>
          <span className={`up-mini-player__cover ${currentTrack.image ? "" : "is-fallback"}`}>
            {currentTrack.image && <img src={currentTrack.image} alt="" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("is-fallback"); }} />}
          </span>
          <span className="up-mini-player__meta">
            <small>NOW ON VIEW</small>
            <strong>{currentTrack.title}</strong>
            <em>{currentTrack.artist}</em>
          </span>
        </button>

        <span className="up-mini-player__time">{formatTime(currentTime)} / {formatTime(duration)}</span>

        <div className="up-mini-player__actions">
          <button type="button" className={isLiked ? "is-liked" : ""} onClick={(e) => handleToggleLike(e, currentTrack.id)} aria-label="Add to archive"><Heart /></button>
          <button type="button" onClick={(e) => handleShare(e, currentTrack, "track")} aria-label="Share track"><Share2 /></button>

          <div className="up-mini-player__volume">
            <button type="button" onClick={() => setIsVolumeOpen((open) => !open)} aria-label="Volume">{isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}</button>
            {isVolumeOpen && (
              <div className="up-mini-player__volume-popover">
                <input
                  type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
                  onChange={(e) => { const nextVolume = Number(e.target.value); setVolume(nextVolume); setIsMuted(nextVolume === 0); }}
                  aria-label="Volume level"
                />
              </div>
            )}
          </div>

          <button type="button" className="up-mini-player__play" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
            {isBuffering ? <Loader2 className="up-spin" /> : isPlaying ? <Pause /> : <Play />}
          </button>
          <button type="button" onClick={playNext} aria-label="Next track"><SkipForward /></button>
        </div>
      </motion.div>
    </div>
  );
};

export default MiniPlayer;
