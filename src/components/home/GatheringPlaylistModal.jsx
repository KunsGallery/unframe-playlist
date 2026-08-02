import { useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { CalendarDays, ExternalLink, MapPin, X, Youtube } from "lucide-react";
import {
  buildYouTubePlaylistEmbedUrl,
  formatGatheringDate,
} from "../../utils/youtubePlaylist";

export default function GatheringPlaylistModal({ playlist, onClose }) {
  const embedUrl = buildYouTubePlaylistEmbedUrl(playlist?.youtubePlaylistId || "");

  useEffect(() => {
    if (!playlist) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [playlist, onClose]);

  return (
    <AnimatePresence>
      {playlist && (
        <Motion.div
          className="up-gathering-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="up-gathering-modal-title"
        >
          <Motion.div
            className="up-gathering-modal__sheet"
            initial={{ y: 70, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 70, scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="up-gathering-modal__head">
              <div>
                <span><Youtube aria-hidden="true" /> PLAYLISTS FROM THE ROOM</span>
                <h2 id="up-gathering-modal-title">{playlist.title || "UNFRAME GATHERING PLAYLIST"}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="모임 플레이리스트 닫기"><X /></button>
            </header>

            <div className="up-gathering-modal__player">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={`${playlist.title || "UNFRAME"} YouTube playlist`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="up-gathering-modal__error">재생 가능한 유튜브 플레이리스트 주소가 없습니다.</div>
              )}
            </div>

            <footer className="up-gathering-modal__foot">
              <div className="up-gathering-modal__meta">
                <span><CalendarDays aria-hidden="true" /> {formatGatheringDate(playlist.eventDate)}</span>
                {playlist.location && <span><MapPin aria-hidden="true" /> {playlist.location}</span>}
                {playlist.desc && <p>{playlist.desc}</p>}
              </div>
              <a href={playlist.youtubeUrl} target="_blank" rel="noreferrer">
                OPEN YOUTUBE <ExternalLink aria-hidden="true" />
              </a>
            </footer>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
