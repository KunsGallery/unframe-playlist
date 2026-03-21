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
    } catch {}

    try {
      navigator.mediaSession.playbackState = state;
    } catch {}
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

        if (!isSameSource) {
          if (!audio.paused) {
            audio.pause();
          }
          audio.src = directUrl;
          audio.load();
        }

        if (idx !== undefined) {
          setCurrentTrackIdx(targetIdx);
        }

        playSessionRef.current = {
          startedAt: Date.now(),
          trackId: targetTrack.id,
          playlistKey: context?.playlistKey || context?.playlistId || null,
        };

        if (emit) {
          await emit({
            type: "track_play_start",
            trackId: targetTrack.id,
          });

          if (context?.playlistKey || context?.playlistId) {
            await emit({
              type: "playlist_play",
              playlistKey: context?.playlistKey || null,
              playlistId: context?.playlistId || null,
              trackId: targetTrack.id,
            });
          }
        }

        syncMediaSession(targetTrack, "playing");

        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (playRequestRef.current !== playId) return;
              setIsPlaying(true);
            })
            .catch((err) => {
              if (err?.name === "AbortError") return;
              console.error("playTrack play error:", err);
              if (playRequestRef.current !== playId) return;
              setIsPlaying(false);
            });
        } else {
          setIsPlaying(true);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("playTrack error:", err);
        setIsPlaying(false);
      }
    },
    [
      audioRef,
      currentQueue,
      currentTrackIdx,
      setCurrentQueue,
      setCurrentTrackIdx,
      setIsPlaying,
      emit,
      playSessionRef,
      queueRef,
      idxRef,
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
      } catch {}
    };

    safeSet("play", async () => {
      try {
        await audio.play();
        setIsPlaying(true);
        navigator.mediaSession.playbackState = "playing";
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    });

    safeSet("pause", () => {
      audio.pause();
      setIsPlaying(false);
      try {
        navigator.mediaSession.playbackState = "paused";
      } catch {}
    });

    safeSet("previoustrack", () => playPrev());
    safeSet("nexttrack", () => playNext());

    safeSet("stop", () => {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      try {
        navigator.mediaSession.playbackState = "none";
      } catch {}
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

      // ❌ 10초 전후 아이콘 안 뜨게 명시적으로 제거
      safeSet("seekto", null);
      safeSet("seekbackward", null);
      safeSet("seekforward", null);
    };
  }, [audioRef, currentTrack, playNext, playPrev, setIsPlaying, syncMediaSession]);

  return {
    playTrack,
    playNext,
    playPrev,
  };
}