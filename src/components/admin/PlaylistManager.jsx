import { useMemo, useState } from "react";
import {
  Edit2,
  ListMusic,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

const EMPTY_PLAYLIST = {
  title: "",
  desc: "",
  image: "",
  trackIds: [],
};

const getCreatedTime = (item) => {
  const value = item?.createdAt;

  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value?.seconds) return value.seconds * 1000;
  if (value?.toDate) return value.toDate().getTime();

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPlaylistTrackCount = (playlist) => {
  if (Array.isArray(playlist?.trackIds)) return playlist.trackIds.length;
  if (Array.isArray(playlist?.items)) return playlist.items.length;
  return 0;
};

export default function PlaylistManager({
  tracks,
  playlists,
  newPlaylist,
  setNewPlaylist,
  editingPlaylistId,
  setEditingPlaylistId,
  isUploadingPLImg,
  handleImageUpload,
  handleSavePlaylist,
  handleDeletePlaylist,
  handleEditPlaylist,
}) {
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [trackSearch, setTrackSearch] = useState("");
  const [sortMode, setSortMode] = useState("newest");

  const selectedPlaylist = useMemo(() => {
    if (!editingPlaylistId) return null;
    return playlists.find((playlist) => playlist.id === editingPlaylistId) || null;
  }, [playlists, editingPlaylistId]);

  const sortedPlaylists = useMemo(() => {
    const term = playlistSearch.trim().toLowerCase();

    let list = [...(playlists || [])].filter(Boolean);

    if (term) {
      list = list.filter((playlist) => {
        const title = (playlist?.title || "").toLowerCase();
        const desc = (playlist?.desc || "").toLowerCase();

        return title.includes(term) || desc.includes(term);
      });
    }

    list.sort((a, b) => {
      if (sortMode === "oldest") return getCreatedTime(a) - getCreatedTime(b);
      if (sortMode === "title") return (a?.title || "").localeCompare(b?.title || "");
      if (sortMode === "tracks") return getPlaylistTrackCount(b) - getPlaylistTrackCount(a);

      return getCreatedTime(b) - getCreatedTime(a);
    });

    return list;
  }, [playlists, playlistSearch, sortMode]);

  const filteredTracks = useMemo(() => {
    const term = trackSearch.trim().toLowerCase();

    const list = [...(tracks || [])].filter(Boolean);

    if (!term) return list;

    return list.filter((track) => {
      const title = (track?.title || "").toLowerCase();
      const artist = (track?.artist || "").toLowerCase();
      const genre = (track?.genre || track?.tag || "").toLowerCase();

      return title.includes(term) || artist.includes(term) || genre.includes(term);
    });
  }, [tracks, trackSearch]);

  const selectedTrackIds = Array.isArray(newPlaylist.trackIds)
    ? newPlaylist.trackIds
    : [];

  const selectedTracks = useMemo(() => {
    const idSet = new Set(selectedTrackIds);
    return (tracks || []).filter((track) => idSet.has(track.id));
  }, [tracks, selectedTrackIds]);

  const startNewPlaylist = () => {
    setEditingPlaylistId(null);
    setNewPlaylist(EMPTY_PLAYLIST);
  };

  const toggleTrack = (trackId) => {
    setNewPlaylist((prev) => {
      const current = Array.isArray(prev.trackIds) ? prev.trackIds : [];
      const exists = current.includes(trackId);

      return {
        ...prev,
        trackIds: exists
          ? current.filter((id) => id !== trackId)
          : [...current, trackId],
      };
    });
  };

  const removeTrack = (trackId) => {
    setNewPlaylist((prev) => ({
      ...prev,
      trackIds: (prev.trackIds || []).filter((id) => id !== trackId),
    }));
  };

  return (
    <div className="grid xl:grid-cols-[0.42fr_0.58fr] gap-8 items-start">
      {/* Left: Playlist List */}
      <div className={`${glass} rounded-[3rem] p-6 lg:p-8 space-y-6 xl:sticky xl:top-28`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
              Playlist Library
            </p>
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">
              Collections
            </h2>
          </div>

          <button
            onClick={startNewPlaylist}
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
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              placeholder="Search playlist..."
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
            <option value="tracks">Most Tracks</option>
          </select>
        </div>

        <div className="space-y-3 max-h-[68vh] overflow-y-auto no-scrollbar pr-1">
          {sortedPlaylists.length > 0 ? (
            sortedPlaylists.map((playlist) => {
              const isActive = editingPlaylistId === playlist.id;
              const cover = safeSrc(playlist.image || playlist.items?.[0]?.image);
              const count = getPlaylistTrackCount(playlist);

              return (
                <div
                  key={playlist.id}
                  onClick={() => handleEditPlaylist(playlist)}
                  className={`rounded-2xl border p-4 flex items-center gap-4 cursor-pointer transition-all ${
                    isActive
                      ? "border-[#004aad] bg-[#004aad]/10 shadow-[0_0_24px_rgba(0,74,173,0.18)]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                    {cover ? (
                      <img src={cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase truncate">
                      {playlist.title || "Untitled Playlist"}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                      {count} tracks
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
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
                No playlists found
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Playlist Editor */}
      <div className={`${glass} rounded-[3rem] p-6 lg:p-10 space-y-7`}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">
              {editingPlaylistId ? "Edit Mode" : "Create Mode"}
            </p>
            <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
              {editingPlaylistId ? "Edit Playlist" : "Create Playlist"}
            </h2>
            {selectedPlaylist && (
              <p className="text-zinc-500 text-sm mt-3">
                Editing: <span className="text-white font-bold">{selectedPlaylist.title}</span>
              </p>
            )}
          </div>

          {editingPlaylistId && (
            <button
              onClick={startNewPlaylist}
              className="px-5 py-3 rounded-full bg-white/5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 self-start"
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-[0.6fr_0.4fr] gap-6 items-start">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Playlist Title
              </p>
              <input
                value={newPlaylist.title}
                onChange={(e) => setNewPlaylist((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Playlist Title"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Description
              </p>
              <textarea
                value={newPlaylist.desc}
                onChange={(e) => setNewPlaylist((prev) => ({ ...prev, desc: e.target.value }))}
                placeholder="Playlist Description"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-32 resize-none"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">
                Cover Image URL
              </p>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input
                  value={newPlaylist.image}
                  onChange={(e) => setNewPlaylist((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="Cover Image URL"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
                />

                <label className="inline-flex items-center justify-center gap-2 px-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
                  {isUploadingPLImg ? (
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
                        (url) => setNewPlaylist((prev) => ({ ...prev, image: url })),
                        "playlist"
                      )
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
            <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 mb-4 flex items-center justify-center">
              {safeSrc(newPlaylist.image || selectedTracks?.[0]?.image) ? (
                <img
                  src={safeSrc(newPlaylist.image || selectedTracks?.[0]?.image)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <ListMusic className="w-10 h-10 text-white/20" />
              )}
            </div>

            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">
              Preview
            </p>
            <h3 className="text-xl font-black uppercase tracking-tight truncate">
              {newPlaylist.title || "Untitled Playlist"}
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              {selectedTrackIds.length} selected tracks
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[0.48fr_0.52fr] gap-5">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div>
              <p className="text-[10px] text-[#004aad] uppercase font-black tracking-[0.35em] mb-2">
                Selected Tracks
              </p>
              <h3 className="text-xl font-black uppercase tracking-tight">
                {selectedTrackIds.length} Tracks
              </h3>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {selectedTracks.length > 0 ? (
                selectedTracks.map((track, idx) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/5 p-3"
                  >
                    <div className="w-7 text-center text-zinc-600 text-xs font-bold">
                      {idx + 1}
                    </div>

                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {safeSrc(track.image) ? (
                        <img src={safeSrc(track.image)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ListMusic className="w-4 h-4 text-white/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black uppercase truncate">{track.title}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                        {track.artist}
                      </p>
                    </div>

                    <button
                      onClick={() => removeTrack(track.id)}
                      className="p-2 rounded-full bg-white/5 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    No tracks selected
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div>
              <p className="text-[10px] text-[#004aad] uppercase font-black tracking-[0.35em] mb-2">
                Add Tracks
              </p>
              <h3 className="text-xl font-black uppercase tracking-tight">
                Track Selector
              </h3>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
                placeholder="Search title, artist or genre..."
                className="w-full bg-white/5 border border-white/10 py-4 pl-11 pr-4 rounded-2xl outline-none text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto no-scrollbar">
              {filteredTracks.map((track) => {
                const active = selectedTrackIds.includes(track.id);
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => toggleTrack(track.id)}
                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      active
                        ? "bg-[#004aad] text-white"
                        : "bg-white/5 text-zinc-500 hover:text-white"
                    }`}
                  >
                    {track.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSavePlaylist}
            className="px-8 py-4 bg-[#004aad] rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all flex items-center gap-2"
          >
            {editingPlaylistId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingPlaylistId ? "Update Playlist" : "Save Playlist"}
          </button>

          {editingPlaylistId && (
            <button
              onClick={startNewPlaylist}
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