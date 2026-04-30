import { useMemo, useState } from "react";
import {
  Edit2,
  Loader2,
  Music,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

const GENRE_OPTIONS = [
  "Ambient",
  "Lo-fi",
  "Jazz",
  "Classical",
  "Electronic",
  "Experimental",
  "Hip-Hop",
  "Blues",
  "Rock",
  "Pop",
  "R&B",
  "Soundtrack",
  "Vocal",
];

const EMPTY_TRACK = {
  title: "",
  artist: "",
  image: "",
  description: "",
  tag: "Ambient",
  genre: "Ambient",
  audioUrl: "",
  lyrics: "",
};

const getTrackGenre = (track) => track?.genre || track?.tag || "Ambient";

const getCreatedTime = (track) => {
  const value = track?.createdAt;

  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value?.seconds) return value.seconds * 1000;
  if (value?.toDate) return value.toDate().getTime();

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function TrackManager({
  tracks,
  newTrack,
  setNewTrack,
  editingId,
  setEditingId,
  isUploadingImg,
  handleImageUpload,
  handleSaveTrack,
  handleDeleteTrack,
  handleEditTrack,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState("newest");

  const selectedTrack = useMemo(() => {
    if (!editingId) return null;
    return tracks.find((track) => track.id === editingId) || null;
  }, [tracks, editingId]);

  const sortedTracks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    let list = [...(tracks || [])].filter(Boolean);

    if (term) {
      list = list.filter((track) => {
        const title = (track?.title || "").toLowerCase();
        const artist = (track?.artist || "").toLowerCase();
        const genre = getTrackGenre(track).toLowerCase();

        return (
          title.includes(term) ||
          artist.includes(term) ||
          genre.includes(term)
        );
      });
    }

    list.sort((a, b) => {
      if (sortMode === "oldest") {
        return getCreatedTime(a) - getCreatedTime(b);
      }

      if (sortMode === "title") {
        return (a?.title || "").localeCompare(b?.title || "");
      }

      if (sortMode === "artist") {
        return (a?.artist || "").localeCompare(b?.artist || "");
      }

      if (sortMode === "genre") {
        return getTrackGenre(a).localeCompare(getTrackGenre(b));
      }

      return getCreatedTime(b) - getCreatedTime(a);
    });

    return list;
  }, [tracks, searchTerm, sortMode]);

  const startNewTrack = () => {
    setEditingId(null);
    setNewTrack(EMPTY_TRACK);
  };

  const updateGenre = (genre) => {
    setNewTrack((prev) => ({
      ...prev,
      genre,
      tag: genre,
    }));
  };

  return (
    <div className="grid xl:grid-cols-[0.42fr_0.58fr] gap-8 items-start">
      {/* Left: Track List */}
      <div className={`${glass} rounded-[3rem] p-6 lg:p-8 space-y-6 xl:sticky xl:top-28`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
              Track Library
            </p>
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">
              Uploaded Tracks
            </h2>
          </div>

          <button
            onClick={startNewTrack}
            className="shrink-0 px-4 py-3 rounded-full bg-[#004aad] text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        <div className="grid gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, artist or genre..."
              className="w-full bg-white/5 border border-white/10 py-4 pl-11 pr-4 rounded-2xl outline-none text-sm"
            />
          </div>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title A-Z</option>
            <option value="artist">Artist A-Z</option>
            <option value="genre">Genre A-Z</option>
          </select>
        </div>

        <div className="space-y-3 max-h-[68vh] overflow-y-auto no-scrollbar pr-1">
          {sortedTracks.length > 0 ? (
            sortedTracks.map((track) => {
              const isActive = editingId === track.id;
              const genre = getTrackGenre(track);

              return (
                <div
                  key={track.id}
                  onClick={() => handleEditTrack(track)}
                  className={`rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-all ${
                    isActive
                      ? "border-[#004aad] bg-[#004aad]/10 shadow-[0_0_24px_rgba(0,74,173,0.18)]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {safeSrc(track.image) ? (
                      <img
                        src={safeSrc(track.image)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase truncate">
                      {track.title || "Untitled"}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                      {track.artist || "Unknown Artist"} • {genre}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrack(track.id);
                    }}
                    className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">
                No tracks found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Track Editor */}
      <div className={`${glass} rounded-[3rem] p-6 lg:p-10 space-y-7`}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
              {editingId ? "Edit Mode" : "Upload Mode"}
            </p>
            <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
              {editingId ? "Edit Track" : "Upload Track"}
            </h2>
            {selectedTrack && (
              <p className="text-zinc-500 text-sm mt-3">
                Editing: <span className="text-white font-bold">{selectedTrack.title}</span>
              </p>
            )}
          </div>

          {editingId && (
            <button
              onClick={startNewTrack}
              className="px-5 py-3 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 self-start"
            >
              <Plus className="w-4 h-4" />
              New Track
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
              Title
            </p>
            <input
              value={newTrack.title}
              onChange={(e) => setNewTrack((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
              Artist
            </p>
            <input
              value={newTrack.artist}
              onChange={(e) => setNewTrack((prev) => ({ ...prev, artist: e.target.value }))}
              placeholder="Artist"
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
              Audio URL
            </p>
            <input
              value={newTrack.audioUrl}
              onChange={(e) => setNewTrack((prev) => ({ ...prev, audioUrl: e.target.value }))}
              placeholder="Audio URL"
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
              Genre
            </p>
            <select
              value={newTrack.genre || newTrack.tag || "Ambient"}
              onChange={(e) => updateGenre(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-black uppercase text-xs tracking-widest outline-none"
            >
              {GENRE_OPTIONS.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
              Image
            </p>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input
                value={newTrack.image}
                onChange={(e) => setNewTrack((prev) => ({ ...prev, image: e.target.value }))}
                placeholder="Image URL"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />

              <label className="inline-flex items-center justify-center gap-2 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                {isUploadingImg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageUpload(
                      e.target.files?.[0],
                      (url) => setNewTrack((prev) => ({ ...prev, image: url })),
                      "track"
                    )
                  }
                />
              </label>
            </div>
          </div>
        </div>

        {safeSrc(newTrack.image) && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 shrink-0">
              <img src={safeSrc(newTrack.image)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">
                Cover Preview
              </p>
              <p className="text-sm text-zinc-400 truncate">
                {newTrack.image}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
            Description
          </p>
          <textarea
            value={newTrack.description}
            onChange={(e) => setNewTrack((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-28 resize-none"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
            Lyrics
          </p>
          <textarea
            value={newTrack.lyrics}
            onChange={(e) => setNewTrack((prev) => ({ ...prev, lyrics: e.target.value }))}
            placeholder="Lyrics"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-44 resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSaveTrack}
            className="px-8 py-4 bg-[#004aad] rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all flex items-center gap-2"
          >
            {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? "Update Track" : "Save Track"}
          </button>

          {editingId && (
            <button
              onClick={startNewTrack}
              className="px-8 py-4 bg-white/5 rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}