// src/components/CanvasArt.jsx
import React, { useEffect, useRef, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Canvas: a short looping video in the player. Without a video (or if it fails), the cover drifts slowly.
// The video is muted, so it never takes over the lock-screen "now playing" from the music.
export default function CanvasArt({ track, src, alt, isPlaying }) {
  const videoRef = useRef(null);
  // Remember which video failed, so the next track's video still gets its chance.
  const [failedUrl, setFailedUrl] = useState('');
  const video = track?.canvasUrl && track.canvasUrl !== failedUrl && !reducedMotion() ? track.canvasUrl : '';

  // The loop follows the music: it rests while the track is paused.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) el.play().catch(() => {}); else el.pause();
  }, [isPlaying, video]);

  if (video) {
    return (
      <video
        ref={videoRef}
        className="up-canvas up-canvas--video"
        src={video}
        poster={src}
        muted
        loop
        playsInline
        autoPlay={isPlaying}
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        aria-label={alt}
        onError={() => setFailedUrl(video)}
      />
    );
  }

  return (
    <img
      className={`up-canvas up-canvas--drift ${isPlaying ? 'is-playing' : ''}`}
      src={src}
      loading="lazy"
      alt={alt}
      onError={(e) => { if (!e.currentTarget.src.endsWith('/icon.png')) e.currentTarget.src = '/icon.png'; }}
    />
  );
}
