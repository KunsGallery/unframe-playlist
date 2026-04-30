import { Edit2, ListMusic, Loader2, Trash2, Upload } from "lucide-react";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

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
  return (
    <div className="space-y-10">
      <div className={`${glass} rounded-[3rem] p-8 lg:p-12 space-y-6`}>
        <h2 className="text-2xl font-black uppercase">{editingPlaylistId ? "Edit Playlist" : "Create Playlist"}</h2>

        <div className="grid lg:grid-cols-2 gap-5">
          <input
            value={newPlaylist.title}
            onChange={(e) => setNewPlaylist((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Playlist Title"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
          <input
            value={newPlaylist.image}
            onChange={(e) => setNewPlaylist((prev) => ({ ...prev, image: e.target.value }))}
            placeholder="Cover Image URL"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
          <label className="inline-flex items-center gap-2 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
            {isUploadingPLImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Playlist Cover
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                handleImageUpload(e.target.files?.[0], (url) => setNewPlaylist((prev) => ({ ...prev, image: url })), "playlist")
              }
            />
          </label>
        </div>

        <textarea
          value={newPlaylist.desc}
          onChange={(e) => setNewPlaylist((prev) => ({ ...prev, desc: e.target.value }))}
          placeholder="Playlist Description"
          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-28 resize-none"
        />

        <div>
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3">Select Tracks</p>
          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto no-scrollbar">
            {tracks.map((track) => {
              const active = newPlaylist.trackIds.includes(track.id);
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    setNewPlaylist((prev) => ({
                      ...prev,
                      trackIds: active
                        ? prev.trackIds.filter((id) => id !== track.id)
                        : [...prev.trackIds, track.id],
                    }));
                  }}
                  className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    active ? "bg-[#004aad] text-white" : "bg-white/5 text-zinc-500 hover:text-white"
                  }`}
                >
                  {track.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSavePlaylist}
            className="px-8 py-4 bg-[#004aad] rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
          >
            {editingPlaylistId ? "Update Playlist" : "Save Playlist"}
          </button>
          {editingPlaylistId && (
            <button
              onClick={() => {
                setEditingPlaylistId(null);
                setNewPlaylist({ title: "", desc: "", image: "", trackIds: [] });
              }}
              className="px-8 py-4 bg-white/5 rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className={`${glass} rounded-[3rem] p-8 lg:p-12`}>
        <h2 className="text-2xl font-black uppercase mb-8">Playlist Library</h2>
        <div className="space-y-3">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                {safeSrc(playlist.image) ? (
                  <img src={safeSrc(playlist.image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ListMusic className="w-5 h-5 text-white/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black uppercase truncate">{playlist.title}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                  {playlist.items?.length || 0} tracks
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditPlaylist(playlist)} className="p-3 rounded-full bg-white/5 hover:bg-white/10">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeletePlaylist(playlist.id)} className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
