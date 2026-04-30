import { Edit2, Loader2, Music, Trash2, Upload } from "lucide-react";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

const EMPTY_TRACK = {
  title: "",
  artist: "",
  image: "",
  description: "",
  tag: "Ambient",
  audioUrl: "",
  lyrics: "",
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
  return (
    <div className="space-y-10">
      <div className={`${glass} rounded-[3rem] p-8 lg:p-12 space-y-6`}>
        <h2 className="text-2xl font-black uppercase">{editingId ? "Edit Track" : "Upload Track"}</h2>

        <div className="grid lg:grid-cols-2 gap-5">
          <input
            value={newTrack.title}
            onChange={(e) => setNewTrack((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
          <input
            value={newTrack.artist}
            onChange={(e) => setNewTrack((prev) => ({ ...prev, artist: e.target.value }))}
            placeholder="Artist"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
          <input
            value={newTrack.audioUrl}
            onChange={(e) => setNewTrack((prev) => ({ ...prev, audioUrl: e.target.value }))}
            placeholder="Audio URL"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none lg:col-span-2"
          />
          <input
            value={newTrack.image}
            onChange={(e) => setNewTrack((prev) => ({ ...prev, image: e.target.value }))}
            placeholder="Image URL"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
          <label className="inline-flex items-center gap-2 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10">
            {isUploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                handleImageUpload(e.target.files?.[0], (url) => setNewTrack((prev) => ({ ...prev, image: url })), "track")
              }
            />
          </label>
          <input
            value={newTrack.tag}
            onChange={(e) => setNewTrack((prev) => ({ ...prev, tag: e.target.value }))}
            placeholder="Tag / Genre"
            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
          />
        </div>

        <textarea
          value={newTrack.description}
          onChange={(e) => setNewTrack((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Description"
          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-28 resize-none"
        />

        <textarea
          value={newTrack.lyrics}
          onChange={(e) => setNewTrack((prev) => ({ ...prev, lyrics: e.target.value }))}
          placeholder="Lyrics"
          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none h-44 resize-none"
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSaveTrack}
            className="px-8 py-4 bg-[#004aad] rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
          >
            {editingId ? "Update Track" : "Save Track"}
          </button>
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setNewTrack(EMPTY_TRACK);
              }}
              className="px-8 py-4 bg-white/5 rounded-full text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className={`${glass} rounded-[3rem] p-8 lg:p-12`}>
        <h2 className="text-2xl font-black uppercase mb-8">Track Library</h2>
        <div className="space-y-3">
          {tracks.map((track) => (
            <div key={track.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 shrink-0">
                {safeSrc(track.image) ? (
                  <img src={safeSrc(track.image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-white/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black uppercase truncate">{track.title}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                  {track.artist} • {track.tag || "Ambient"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEditTrack(track)} className="p-3 rounded-full bg-white/5 hover:bg-white/10">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteTrack(track.id)} className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-red-400">
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
