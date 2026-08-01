// src/hooks/usePlayerEngine.js
import { useEffect, useCallback, useRef } from "react";
import { getDirectLink } from "../utils/PlayerUtils";

export function usePlayerEngine({
  audioRef,

  currentQueue,
  setCurrentQueue,
  currentTrackIdx,
  setCurrentTrackIdx,
  currentTrack,

  setIsPlaying,
  setIsBuffering,

  emit,
  playSessionRef,

  queueRef,
  idxRef,
  playTrackRef,
}) {
  const playRequestRef = useRef(0);

  const syncMediaSession = useCallback((track, state = "playing") => {
    if (!("mediaSession" in navigator) || !track) return;

    const artworkUrl = track.image ? getDirectLink(track.image) : "";

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title ?? "UNFRAME",
        artist: track.artist ?? "",
        album: track.album ?? "UNFRAME PLAYLIST",
        artwork: artworkUrl
          ? [
              { src: artworkUrl, sizes: "96x96", type: "image/png" },
              { src: artworkUrl, sizes: "192x192", type: "image/png" },
              { src: artworkUrl, sizes: "512x512", type: "image/png" },
            ]
          : [],
      });
    } catch {
      // Media Session metadata is optional across browsers.
    }

    try {
      navigator.mediaSession.playbackState = state;
    } catch {
      // Playback state is not writable on every Media Session implementation.
    }
  }, []);

  useEffect(() => {
    queueRef.current = currentQueue || [];
  }, [currentQueue, queueRef]);

  useEffect(() => {
    idxRef.current = currentTrackIdx || 0;
  }, [currentTrackIdx, idxRef]);

  const playTrack = useCallback(
    async (idx, queue = null, context = null) => {
      const audio = audioRef.current;
      if (!audio) return;

      const activeQueue = queue ?? queueRef.current ?? currentQueue;
      if (!activeQueue?.length) return;

      if (queue && queue !== currentQueue) {
        setCurrentQueue(queue);
      }

      const targetIdx = idx !== undefined ? idx : idxRef.current ?? currentTrackIdx;
      const targetTrack = activeQueue?.[targetIdx];
      if (!targetTrack) return;

      const directUrl = getDirectLink(targetTrack.audioUrl);
      if (!directUrl) return;

      const playId = ++playRequestRef.current;

      try {
        const currentSrc = audio.currentSrc || audio.src || "";
        const isSameSource = currentSrc === directUrl;

        setIsBuffering?.(true);

        if (!isSameSource) {
          if (!audio.paused) {
            audio.pause();
          }
          audio.src = directUrl;
          audio.load();
        } else if (audio.ended || context?.restart) {
          audio.currentTime = 0;
        }

        if (idx !== undefined) {
          setCurrentTrackIdx(targetIdx);
        }

        playSessionRef.current = {
          startedAt: Date.now(),
          trackId: targetTrack.id,
          playlistKey: context?.playlistKey || context?.playlistId || null,
        };

        syncMediaSession(targetTrack, "playing");

        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (playRequestRef.current !== playId) return;
              setIsPlaying(true);
              setIsBuffering?.(false);

              if (emit) {
                void emit({
                  type: "track_play_start",
                  trackId: targetTrack.id,
                });

                if (context?.playlistKey || context?.playlistId) {
                  void emit({
                    type: "playlist_play",
                    playlistKey: context?.playlistKey || null,
                    playlistId: context?.playlistId || null,
                    trackId: targetTrack.id,
                  });
                }
              }
            })
            .catch((err) => {
              if (err?.name === "AbortError") return;
              console.error("playTrack play error:", err);
              if (playRequestRef.current !== playId) return;
              setIsPlaying(false);
              setIsBuffering?.(false);
            });
        } else {
          setIsPlaying(true);
          setIsBuffering?.(false);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("playTrack error:", err);
        setIsPlaying(false);
        setIsBuffering?.(false);
      }
    },
    [
      audioRef,
      currentQueue,
      currentTrackIdx,
      setCurrentQueue,
      setCurrentTrackIdx,
      setIsPlaying,
      setIsBuffering,
      emit,
      playSessionRef,
      queueRef,
      idxRef,
      syncMediaSession,
    ]
  );

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack, playTrackRef]);

  const playNext = useCallback(() => {
    const q = queueRef.current || [];
    if (!q.length) return;

    const i = idxRef.current || 0;
    const nextIdx = (i + 1) % q.length;

    playTrackRef.current?.(nextIdx, q, null);
  }, [queueRef, idxRef, playTrackRef]);

  const playPrev = useCallback(() => {
    const q = queueRef.current || [];
    if (!q.length) return;

    const i = idxRef.current || 0;
    const prevIdx = (i - 1 + q.length) % q.length;

    playTrackRef.current?.(prevIdx, q, null);
  }, [queueRef, idxRef, playTrackRef]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const audio = audioRef.current;
    if (!audio) return;

    const safeSet = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers expose Media Session without every action.
      }
    };

    safeSet("play", async () => {
      try {
        setIsBuffering?.(true);
        await audio.play();
        setIsPlaying(true);
        setIsBuffering?.(false);
        navigator.mediaSession.playbackState = "playing";
      } catch (err) {
        if (err?.name === "AbortError") return;
        setIsBuffering?.(false);
      }
    });

    safeSet("pause", () => {
      audio.pause();
      setIsPlaying(false);
      setIsBuffering?.(false);
      try {
        navigator.mediaSession.playbackState = "paused";
      } catch {
        // Playback state is optional.
      }
    });

    safeSet("previoustrack", () => playPrev());
    safeSet("nexttrack", () => playNext());

    safeSet("seekbackward", (details) => {
      const amount = details?.seekOffset || 10;
      audio.currentTime = Math.max(0, audio.currentTime - amount);
    });

    safeSet("seekforward", (details) => {
      const amount = details?.seekOffset || 10;
      const end = Number.isFinite(audio.duration) ? audio.duration : audio.currentTime + amount;
      audio.currentTime = Math.min(end, audio.currentTime + amount);
    });

    safeSet("seekto", (details) => {
      if (!Number.isFinite(details?.seekTime)) return;
      audio.currentTime = details.seekTime;
    });

    safeSet("stop", () => {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      try {
        navigator.mediaSession.playbackState = "none";
      } catch {
        // Playback state is optional.
      }
    });

    if (currentTrack) {
      syncMediaSession(currentTrack, audio.paused ? "paused" : "playing");
    }

    return () => {
      safeSet("play", null);
      safeSet("pause", null);
      safeSet("previoustrack", null);
      safeSet("nexttrack", null);
      safeSet("stop", null);

      safeSet("seekto", null);
      safeSet("seekbackward", null);
      safeSet("seekforward", null);
    };
  }, [audioRef, currentTrack, playNext, playPrev, setIsPlaying, setIsBuffering, syncMediaSession]);

  return {
    playTrack,
    playNext,
    playPrev,
  };
}
