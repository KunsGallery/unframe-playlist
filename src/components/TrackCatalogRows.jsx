// src/components/TrackCatalogRows.jsx
// The public track list rows (home catalog and the Archive page) and their sort switch.
import { Link } from "react-router-dom";
import { Heart, Pause, Play } from "lucide-react";
import { getTrackGenre } from "../constants/trackCuration";
import { TRACK_SORTS } from "../utils/trackSort";

const hideBrokenImage = (event) => {
  event.currentTarget.hidden = true;
  event.currentTarget.parentElement?.classList.add("is-fallback");
};

export function TrackSortSwitch({ value, onChange }) {
  return (
    <div className="up-genres up-sort" role="group" aria-label="정렬">
      {TRACK_SORTS.map((sort) => (
        <button
          type="button"
          key={sort.id}
          className={value === sort.id ? "is-active" : ""}
          aria-pressed={value === sort.id}
          onClick={() => onChange(sort.id)}
        >
          {sort.label}
        </button>
      ))}
    </div>
  );
}

export default function TrackCatalogRows({ tracks, currentTrack, isPlaying, togglePlay, onPlay, userLikes = [], handleToggleLike }) {
  return tracks.map((track, index) => {
    const isCurrent = currentTrack?.id === track.id;
    const liked = userLikes.includes(track.id);
    return (
      <article className={`up-track ${isCurrent ? "is-current" : ""}`} key={track.id}>
        <button type="button" className="up-track__play" onClick={() => (isCurrent ? togglePlay?.() : onPlay(index))} aria-label={`${isCurrent && isPlaying ? "Pause" : "Play"} ${track.title}`}>
          {isCurrent && isPlaying ? <Pause /> : <Play />}
        </button>
        <span className="up-track__index">{String(index + 1).padStart(2, "0")}</span>
        <span className={`up-track__cover ${track.image ? "" : "is-fallback"}`}>{track.image && <img src={track.image} alt="" loading="lazy" onError={hideBrokenImage} />}</span>
        <span className="up-track__title"><Link to={`/tracks/${track.id}`}><strong>{track.title}</strong></Link><small>{track.artist}</small></span>
        <span className="up-track__genre">{getTrackGenre(track)}</span>
        <button type="button" className={`up-track__like ${liked ? "is-liked" : ""}`} onClick={(e) => handleToggleLike?.(e, track.id)} aria-label={liked ? "아카이브에서 제거" : "아카이브에 추가"} aria-pressed={liked}><Heart /></button>
      </article>
    );
  });
}
