// src/hooks/usePlayerEngine.js
import { useEffect, useCallback, useRef } from "react";
import { getStreamLink, loadTrackSource, setNowPlaying, setPlaybackState, syncPositionState } from "../utils/PlayerUtils";
import { nextQueueIndex } from '../utils/catalog';

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
  isShuffle,
  setPlaybackError,
}) {
  const playRequestRef = useRef(0);

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

      const streamUrl = getStreamLink(targetTrack.audioUrl);
      if (!streamUrl) return;

      const playId = ++playRequestRef.current;
      queueRef.current = activeQueue;
      idxRef.current = targetIdx;
      setPlaybackError?.('');

      try {
        const currentSrc = audio.currentSrc || audio.src || "";
        const isSameSource = currentSrc === streamUrl;

        setIsBuffering?.(true);

        // While one track hands over to the next, the lock screen must keep showing "playing".
        // A paused state in that gap makes iOS drop the controls when the screen is locked.
        audio.dataset.switching = '1';
        setNowPlaying(targetTrack);
        setPlaybackState("playing");

        if (!isSameSource) {
          loadTrackSource(audio, targetTrack.audioUrl);
        } else if (audio.ended || context?.restart) {
          audio.currentTime = 0;
        }

        if (idx !== undefined) {
          setCurrentTrackIdx(targetIdx);
        }

        const outgoing = playSessionRef.current;
        const previousSeconds = Math.max(0, (outgoing?.heardSeconds || 0) - (outgoing?.reportedSeconds || 0));

        playSessionRef.current = {
          startedAt: Date.now(),
          trackId: targetTrack.id,
          playlistKey: context?.playlistKey || context?.playlistId || null,
          heardSeconds: 0,
          lastPosition: 0,
          lastTick: Date.now(),
        };

        // play() runs in the same task as the 'ended' event, so iOS still lets it start in the background.
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (playRequestRef.current !== playId) return;
              delete audio.dataset.switching;
              setIsPlaying(true);
              setIsBuffering?.(false);

              if (emit) {
                void emit({
                  type: "track_play_start",
                  trackId: targetTrack.id,
                  previousSeconds,
                });

                if (!context?.continuation && (context?.playlistKey || context?.playlistId)) {
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
              delete audio.dataset.switching;
              setPlaybackState("paused");
              setIsPlaying(false);
              setIsBuffering?.(false);
              setPlaybackError?.(err?.name === 'NotAllowedError' ? '재생 버튼을 눌러 음악을 시작해 주세요.' : '음원을 재생하지 못했습니다. 다시 시도하거나 다음 곡을 선택해 주세요.');
            });
        } else {
          delete audio.dataset.switching;
          setIsPlaying(true);
          setIsBuffering?.(false);
        }
      } catch (err) {
        delete audio.dataset.switching;
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
      setPlaybackError,
    ]
  );

  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack, playTrackRef]);

  const playNext = useCallback(() => {
    const q = queueRef.current || [];
    if (!q.length) return;

    const i = idxRef.current || 0;
    const nextIdx = nextQueueIndex(q.length, i, isShuffle);

    playTrackRef.current?.(nextIdx, q, { playlistKey: playSessionRef.current.playlistKey || null, continuation: true });
  }, [queueRef, idxRef, playTrackRef, isShuffle, playSessionRef]);

  const playPrev = useCallback(() => {
    const q = queueRef.current || [];
    if (!q.length) return;

    const i = idxRef.current || 0;
    if (audioRef.current?.currentTime > 3) { audioRef.current.currentTime = 0; syncPositionState(audioRef.current); return; }
    const prevIdx = (i - 1 + q.length) % q.length;

    playTrackRef.current?.(prevIdx, q, { playlistKey: playSessionRef.current.playlistKey || null, continuation: true });
  }, [queueRef, idxRef, playTrackRef, audioRef, playSessionRef]);

  // The lock screen shows whatever track is loaded, including one restored from the last visit.
  useEffect(() => {
    if (currentTrack) setNowPlaying(currentTrack);
  }, [currentTrack]);

  // Handlers are registered once and read the latest callbacks from refs. Re-registering on
  // every track change briefly removed them, which could leave the lock screen without controls.
  const nextRef = useRef(playNext), prevRef = useRef(playPrev);
  useEffect(() => { nextRef.current = playNext; prevRef.current = playPrev; }, [playNext, playPrev]);

  // The <audio> element mounts after the boot screen, so handlers look it up when they run.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const safeSet = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers expose Media Session without every action.
      }
    };

    safeSet("play", async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        setIsBuffering?.(true);
        await audio.play();
        setIsPlaying(true);
        setIsBuffering?.(false);
        setPlaybackState("playing");
      } catch (err) {
        if (err?.name === "AbortError") return;
        setIsBuffering?.(false);
      }
    });

    safeSet("pause", () => {
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsBuffering?.(false);
      setPlaybackState("paused");
    });

    safeSet("previoustrack", () => prevRef.current());
    safeSet("nexttrack", () => nextRef.current());

    // iOS shows ±10s buttons instead of previous/next whenever these two are registered,
    // so they stay unset. Scrubbing still works through seekto.
    safeSet("seekbackward", null);
    safeSet("seekforward", null);

    safeSet("seekto", (details) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(details?.seekTime)) return;
      if (details.fastSeek && typeof audio.fastSeek === "function") audio.fastSeek(details.seekTime);
      else audio.currentTime = details.seekTime;
      syncPositionState(audio);
    });

    safeSet("stop", () => {
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.currentTime = 0; }
      setIsPlaying(false);
      setPlaybackState("paused");
    });

    return () => {
      ["play", "pause", "previoustrack", "nexttrack", "seekto", "stop"].forEach((action) => safeSet(action, null));
    };
  }, [audioRef, setIsPlaying, setIsBuffering]);

  return {
    playTrack,
    playNext,
    playPrev,
  };
}
