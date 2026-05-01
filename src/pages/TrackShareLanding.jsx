import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Disc3, Home, Loader2, Play } from "lucide-react";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.55)]";

const getTrackDescription = (track) =>
  track?.description ||
  track?.desc ||
  "전시와 사운드가 이어지는 음악 아카이브";

const getTrackGenre = (track) => track?.genre || track?.tag || "";

const normalizeValue = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const getCreatedTime = (track) => {
  const value = track?.createdAt;

  if (typeof value === "number") return value;
  if (value?.seconds) return value.seconds * 1000;
  if (value?.toDate) return value.toDate().getTime();

  return 0;
};

export default function TrackShareLanding({
  tracks = [],
  publicTracks = [],
  playTrack,
  setIsPlayerExpanded,
  setSelectedTrack,
  setToastMessage,
}) {
  const { trackId } = useParams();
  const [canShowEmptyState, setCanShowEmptyState] = useState(false);

  const visibleTracks = useMemo(() => {
    if (publicTracks.length > 0) return publicTracks;
    return (tracks || []).filter((track) => !track?.isHidden);
  }, [publicTracks, tracks]);

  const track = useMemo(
    () => visibleTracks.find((item) => item?.id === trackId) ?? null,
    [visibleTracks, trackId]
  );

  const relatedTracks = useMemo(() => {
    if (!track) return [];

    const currentGenre = normalizeValue(getTrackGenre(track));
    const currentArtist = normalizeValue(track.artist);
    const candidates = visibleTracks.filter(
      (item) => item?.id && item.id !== track.id
    );

    const selectedIds = new Set();
    const selected = [];

    const appendMatches = (items) => {
      items.forEach((item) => {
        if (selected.length >= 3) return;
        if (!item?.id || selectedIds.has(item.id)) return;
        selectedIds.add(item.id);
        selected.push(item);
      });
    };

    appendMatches(
      candidates.filter(
        (item) =>
          currentGenre &&
          normalizeValue(getTrackGenre(item)) === currentGenre
      )
    );

    appendMatches(
      candidates.filter(
        (item) =>
          currentArtist &&
          normalizeValue(item.artist) === currentArtist
      )
    );

    const fallbackCandidates = candidates.filter(
      (item) => item?.id && !selectedIds.has(item.id)
    );

    const hasCreatedTime = fallbackCandidates.some(
      (item) => getCreatedTime(item) > 0
    );

    appendMatches(
      hasCreatedTime
        ? [...fallbackCandidates].sort(
            (a, b) => getCreatedTime(b) - getCreatedTime(a)
          )
        : fallbackCandidates
    );

    return selected.slice(0, 3);
  }, [track, visibleTracks]);

  useEffect(() => {
    if (visibleTracks.length > 0) {
      setCanShowEmptyState(true);
      return undefined;
    }

    setCanShowEmptyState(false);
    const timer = window.setTimeout(() => {
      setCanShowEmptyState(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [visibleTracks.length]);

  const handlePlayInApp = async () => {
    if (!track) {
      setToastMessage?.("공유된 곡을 찾을 수 없습니다.");
      return;
    }

    const trackIndex = visibleTracks.findIndex((item) => item?.id === track.id);
    if (trackIndex < 0) {
      setToastMessage?.("재생 가능한 트랙 큐를 불러오지 못했습니다.");
      return;
    }

    setSelectedTrack?.(track);
    setIsPlayerExpanded?.(true);

    await playTrack?.(trackIndex, visibleTracks, {
      playlistKey: "shared-track",
    });

    setToastMessage?.(`${track.title || "Track"} 재생을 시작합니다.`);
  };

  if (!track && !canShowEmptyState) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 lg:pt-40 px-6 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,74,173,0.28),transparent_38%),radial-gradient(circle_at_bottom,rgba(16,25,64,0.42),transparent_34%)]" />
        <div className="relative z-10 min-h-[60vh] flex items-center justify-center">
          <div className={`${glass} rounded-[2rem] px-8 py-10 text-center w-full max-w-md`}>
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#8db4ff]" />
            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.35em] text-[#8db4ff]">
              UNFRAME PLAYLIST
            </p>
            <p className="mt-3 text-zinc-300 font-medium">공유된 트랙 정보를 불러오는 중입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-[#050505] text-white pt-32 lg:pt-40 px-6 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,74,173,0.24),transparent_40%),radial-gradient(circle_at_bottom,rgba(16,25,64,0.36),transparent_36%)]" />
        <div className="relative z-10 max-w-3xl mx-auto min-h-[60vh] flex items-center justify-center">
          <div className={`${glass} rounded-[2.5rem] p-10 lg:p-14 text-center w-full max-w-xl`}>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#8db4ff]">
              UNFRAME PLAYLIST
            </p>
            <h1 className="mt-5 text-3xl lg:text-5xl font-black uppercase tracking-[-0.05em] italic">
              Track Not Found
            </h1>
            <p className="mt-4 text-zinc-400 text-sm lg:text-base leading-relaxed">
              공유된 곡을 찾을 수 없습니다.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center justify-center gap-3 rounded-full border border-white/15 px-6 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-white transition hover:border-white/30 hover:bg-white hover:text-black"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#050505] text-white pt-32 lg:pt-40 px-6 pb-24 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,74,173,0.24),transparent_34%),radial-gradient(circle_at_bottom,rgba(16,25,64,0.42),transparent_32%)]" />

      <div className="relative z-10 max-w-6xl mx-auto min-h-[calc(100vh-12rem)] flex flex-col justify-center gap-8">
        <div className="w-full flex items-center justify-center">
          <div className={`${glass} w-full max-w-5xl rounded-[2.75rem] overflow-hidden`}>
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 lg:p-8">
                <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/8 bg-zinc-900">
                  <img
                    src={track.image || "/icon.png"}
                    alt={track.title || "Shared track"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                </div>
              </div>

              <div className="px-8 pb-8 pt-2 lg:px-10 lg:py-10 flex flex-col justify-center">
                <p className="text-[11px] font-black uppercase tracking-[0.38em] text-[#8db4ff]">
                  UNFRAME PLAYLIST
                </p>

                <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#004aad]/40 bg-[#004aad]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#c7ddff]">
                  <Disc3 className="w-3.5 h-3.5" />
                  Shared Track
                </div>

                <h1 className="mt-6 text-4xl lg:text-6xl font-black uppercase tracking-[-0.06em] leading-[0.88] italic text-white">
                  {track.title || "Untitled"}
                </h1>

                <p className="mt-4 text-lg lg:text-2xl font-bold text-[#8db4ff] tracking-[0.08em] uppercase">
                  {track.artist || "UNFRAME"}
                </p>

                <p className="mt-6 max-w-xl text-sm lg:text-base leading-relaxed text-zinc-300">
                  {getTrackDescription(track)}
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={handlePlayInApp}
                    className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-black transition hover:bg-[#8db4ff]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play in UNFRAME
                  </button>

                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-3 rounded-full border border-white/15 px-6 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-white transition hover:border-white/30 hover:bg-white hover:text-black"
                  >
                    <Home className="w-4 h-4" />
                    Go to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {relatedTracks.length > 0 && (
          <section className={`${glass} rounded-[2.5rem] p-6 lg:p-8`}>
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#8db4ff]">
                Related Sounds
              </p>
              <p className="text-sm lg:text-base text-zinc-400">
                이 곡과 가까운 무드의 다른 사운드
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedTracks.map((relatedTrack) => (
                <Link
                  key={relatedTrack.id}
                  to={`/share/track/${relatedTrack.id}`}
                  className="group rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#004aad]/40 hover:bg-white/[0.06]"
                >
                  <div className="relative aspect-[1/1] overflow-hidden rounded-[1.4rem] border border-white/8 bg-zinc-900">
                    {relatedTrack.image ? (
                      <img
                        src={relatedTrack.image}
                        alt={relatedTrack.title || "Related track"}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/25">
                        <Disc3 className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent" />
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8db4ff]">
                      {getTrackGenre(relatedTrack) || "UNFRAME"}
                    </p>
                    <h2 className="mt-2 text-lg font-black uppercase tracking-[-0.04em] text-white line-clamp-2">
                      {relatedTrack.title || "Untitled"}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400 uppercase tracking-[0.12em] line-clamp-1">
                      {relatedTrack.artist || "UNFRAME"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
