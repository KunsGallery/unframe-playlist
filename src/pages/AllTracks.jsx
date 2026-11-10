// src/pages/AllTracks.jsx
// Archive: every published track in one list, with search, genre and sort.
import { useMemo, useState } from "react";
import { Disc3, Search } from "lucide-react";
import TrackCatalogRows, { TrackSortSwitch } from "../components/TrackCatalogRows";
import { TRACK_GENRE_OPTIONS, getTrackGenre } from "../constants/trackCuration";
import { DEFAULT_TRACK_SORT, sortTracks } from "../utils/trackSort";

const PAGE = 60;

export default function AllTracks({ tracks = [], playTrack, togglePlay, isPlaying, currentTrack, userLikes = [], handleToggleLike }) {
  const [term, setTerm] = useState("");
  const [genre, setGenre] = useState("All");
  const [sortMode, setSortMode] = useState(DEFAULT_TRACK_SORT);
  const [limit, setLimit] = useState(PAGE);

  const genres = useMemo(() => ["All", ...TRACK_GENRE_OPTIONS.filter((g) => tracks.some((t) => getTrackGenre(t) === g))], [tracks]);

  const list = useMemo(() => {
    const q = term.trim().toLowerCase();
    const matched = tracks.filter((track) => {
      if (!track) return false;
      if (genre !== "All" && getTrackGenre(track) !== genre) return false;
      if (!q) return true;
      return [track.title, track.artist, getTrackGenre(track), track.exhibition].some((v) => String(v || "").toLowerCase().includes(q));
    });
    return sortTracks(matched, sortMode);
  }, [tracks, term, genre, sortMode]);

  const shown = list.slice(0, limit);
  const filtering = Boolean(term.trim()) || genre !== "All";

  return (
    <section className="up-listening-page up-all-tracks">
      <div className="up-listening-title">
        <p className="up-kicker">Archive</p>
        <h1>모든 곡</h1>
        <p>UNFRAME이 발매한 곡을 한곳에서 찾아 듣습니다. 지금 {tracks.length}곡이 있습니다.</p>
      </div>

      <div className="up-catalog">
        <label className="up-search">
          <Search aria-hidden="true" />
          <input value={term} onChange={(e) => { setTerm(e.target.value); setLimit(PAGE); }} placeholder="곡, 아티스트, 장르, 전시 검색" aria-label="곡 검색" />
        </label>

        <div className="up-genres" aria-label="장르">
          {genres.map((g) => (
            <button type="button" key={g} className={genre === g ? "is-active" : ""} aria-pressed={genre === g} onClick={() => { setGenre(g); setLimit(PAGE); }}>{g}</button>
          ))}
        </div>
        <TrackSortSwitch value={sortMode} onChange={setSortMode} />

        {filtering && <p className="up-all-tracks__count" role="status">{list.length}곡</p>}

        <div className="up-tracklist">
          {!shown.length && (
            <div className="up-empty up-empty--tracks">
              <Disc3 aria-hidden="true" />
              <strong>{filtering ? "찾는 곡이 없습니다." : "아직 전시된 곡이 없습니다."}</strong>
              <small>{filtering ? "다른 제목이나 장르로 다시 찾아보세요." : "새로운 사운드가 곧 이곳에 도착합니다."}</small>
            </div>
          )}
          <TrackCatalogRows
            tracks={shown}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            onPlay={(index) => playTrack?.(index, list)}
            userLikes={userLikes}
            handleToggleLike={handleToggleLike}
          />
        </div>

        {list.length > limit && (
          <div className="up-catalog-more">
            <button type="button" className="up-action" onClick={() => setLimit((n) => n + PAGE)}>더 보기 · {shown.length} / {list.length}곡</button>
          </div>
        )}
      </div>
    </section>
  );
}
