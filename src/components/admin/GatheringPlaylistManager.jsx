import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  MapPin,
  Plus,
  Search,
  Trash2,
  Upload,
  Youtube,
} from "lucide-react";
import {
  buildYouTubePlaylistEmbedUrl,
  createEmptyGatheringPlaylist,
  extractYouTubePlaylistId,
  formatGatheringDate,
  getGatheringSortTime,
} from "../../utils/youtubePlaylist";

const glass =
  "bg-white/[0.03] backdrop-blur-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]";

export default function GatheringPlaylistManager({
  gatheringPlaylists,
  draft,
  setDraft,
  editingId,
  setEditingId,
  isUploadingImage,
  handleImageUpload,
  handleSave,
  handleDelete,
  handleEdit,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const playlistId = extractYouTubePlaylistId(draft.youtubeUrl || draft.youtubePlaylistId);
  const embedUrl = buildYouTubePlaylistEmbedUrl(playlistId);

  const visiblePlaylists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...(gatheringPlaylists || [])]
      .filter((playlist) => {
        if (!term) return true;
        return [playlist?.title, playlist?.location, playlist?.eventDate]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => getGatheringSortTime(b) - getGatheringSortTime(a));
  }, [gatheringPlaylists, searchTerm]);

  const startNew = () => {
    setEditingId(null);
    setDraft(createEmptyGatheringPlaylist());
  };

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <div className="grid xl:grid-cols-[minmax(300px,0.36fr)_minmax(0,0.64fr)] gap-6 items-start">
      <aside className={`${glass} rounded-[3rem] p-6 lg:p-8 space-y-6 xl:sticky xl:top-48`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">Gathering Archive</p>
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight">From the room</h2>
          </div>
          <button type="button" onClick={startNew} className="shrink-0 px-4 py-3 rounded-full bg-[#004aad] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-4 h-4" /> New
          </button>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4">
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search gathering..." className="w-full bg-transparent py-4 outline-none text-sm" />
        </label>

        <div className="space-y-3 max-h-[58vh] overflow-y-auto no-scrollbar">
          {visiblePlaylists.length ? visiblePlaylists.map((playlist) => (
            <article
              key={playlist.id}
              className={`rounded-2xl border p-3 cursor-pointer transition-all ${editingId === playlist.id ? "border-[#ccff00] bg-[#ccff00]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"}`}
              onClick={() => handleEdit(playlist)}
            >
              <div className="flex gap-3 items-center">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#143cff] shrink-0 flex items-center justify-center">
                  {playlist.image ? <img src={playlist.image} alt="" className="w-full h-full object-cover" /> : <Youtube className="w-7 h-7 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-flex mb-2 px-2 py-1 rounded-full text-[8px] font-black tracking-widest ${playlist.isPublished !== false ? "bg-[#ccff00] text-black" : "bg-white/10 text-zinc-400"}`}>
                    {playlist.isPublished !== false ? "PUBLISHED" : "DRAFT"}
                  </span>
                  <h3 className="truncate font-black uppercase text-sm">{playlist.title || "UNFRAME GATHERING"}</h3>
                  <p className="truncate text-[10px] text-zinc-500 mt-1">{formatGatheringDate(playlist.eventDate)} · {playlist.location || "UNFRAME"}</p>
                </div>
                <button type="button" aria-label={`${playlist.title || "Gathering"} 삭제`} onClick={(event) => { event.stopPropagation(); handleDelete(playlist.id); }} className="p-3 rounded-full bg-white/5 text-red-400 hover:bg-red-500/20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          )) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-xs text-zinc-500 uppercase tracking-widest">No gathering playlists</div>
          )}
        </div>
      </aside>

      <section className={`${glass} rounded-[3rem] p-6 lg:p-10 space-y-7`}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-[#004aad] font-black uppercase tracking-[0.35em] mb-3">{editingId ? "Edit Gathering" : "New Gathering"}</p>
            <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">Playlist settings</h2>
            <p className="text-sm text-zinc-500 mt-3">유튜브 공유주소를 붙여넣고 모임의 기억을 발행합니다.</p>
          </div>
          {editingId && <button type="button" onClick={startNew} className="px-5 py-3 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Plus className="w-4 h-4" /> New Playlist</button>}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">YouTube playlist share URL</p>
          <div className="relative">
            <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            <input
              value={draft.youtubeUrl}
              onChange={(event) => update({ youtubeUrl: event.target.value, youtubePlaylistId: extractYouTubePlaylistId(event.target.value) })}
              placeholder="https://www.youtube.com/playlist?list=..."
              className="w-full bg-white/5 border border-white/10 py-4 pl-12 pr-12 rounded-2xl outline-none"
            />
            {playlistId && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#68d391]" />}
          </div>
          {draft.youtubeUrl && !playlistId && <p className="text-xs text-red-400 ml-1">플레이리스트의 `list` 값이 포함된 유튜브 주소를 입력해주세요.</p>}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <label className="space-y-2"><span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Event title</span><input value={draft.title} onChange={(event) => update({ title: event.target.value })} placeholder="예: UNFRAME NIGHT VOL. 03" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" /></label>
          <label className="space-y-2"><span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Event date</span><input type="date" value={draft.eventDate} onChange={(event) => update({ eventDate: event.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" /></label>
          <label className="space-y-2"><span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Location</span><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" /><input value={draft.location} onChange={(event) => update({ location: event.target.value })} placeholder="UNFRAME GALLERY" className="w-full bg-white/5 border border-white/10 py-4 pl-11 pr-4 rounded-2xl outline-none" /></div></label>
          <label className="space-y-2"><span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Cover image</span><div className="grid grid-cols-[1fr_auto] gap-3"><input value={draft.image} onChange={(event) => update({ image: event.target.value })} placeholder="Image URL (optional)" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" /><label className="w-14 rounded-2xl bg-white/5 border border-white/10 grid place-items-center cursor-pointer"><Upload className={`w-4 h-4 ${isUploadingImage ? "animate-pulse" : ""}`} /><input type="file" accept="image/*" className="hidden" onChange={(event) => handleImageUpload(event.target.files?.[0])} /></label></div></label>
        </div>

        <label className="space-y-2 block"><span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest ml-1">Memory note</span><textarea value={draft.desc} onChange={(event) => update({ desc: event.target.value })} placeholder="그날의 분위기나 선곡에 대한 짧은 기록" className="w-full h-28 bg-white/5 border border-white/10 p-4 rounded-2xl outline-none resize-none" /></label>

        <div className="grid lg:grid-cols-[0.68fr_0.32fr] gap-5 items-stretch">
          <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-black aspect-video">
            {embedUrl ? <iframe src={embedUrl} title="YouTube playlist preview" className="w-full h-full" allow="encrypted-media; picture-in-picture" allowFullScreen /> : <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3"><Youtube className="w-10 h-10" /><span className="text-[10px] uppercase font-black tracking-widest">Paste a playlist URL</span></div>}
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 flex flex-col justify-between">
            <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-[#143cff] flex items-center justify-center mb-5">
              {draft.image ? <img src={draft.image} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-10 h-10 text-white/70" />}
            </div>
            <p className="text-[10px] text-[#ccff00] uppercase font-black tracking-[0.25em]">Home card preview</p>
            <h3 className="text-xl font-black uppercase tracking-tight mt-2">{draft.title || "UNFRAME GATHERING PLAYLIST"}</h3>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-2"><CalendarDays className="w-3 h-3" /> {formatGatheringDate(draft.eventDate)}</p>
          </div>
        </div>

        <div className="up-admin-savebar flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <label className="flex items-center gap-3 px-3 cursor-pointer">
            <input type="checkbox" checked={draft.isPublished !== false} onChange={(event) => update({ isPublished: event.target.checked })} className="w-5 h-5 accent-[#143cff]" />
            <span><strong className="block text-xs uppercase">Publish on home</strong><small className="text-[10px] text-zinc-500">끄면 어드민에만 임시 저장됩니다.</small></span>
          </label>
          <div className="flex gap-3">
            {draft.youtubeUrl && <a href={draft.youtubeUrl} target="_blank" rel="noreferrer" className="px-5 py-4 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Check URL <ExternalLink className="w-4 h-4" /></a>}
            <button type="button" onClick={handleSave} disabled={!playlistId} className="px-8 py-4 rounded-full bg-[#004aad] text-white disabled:opacity-30 text-[10px] font-black uppercase tracking-widest">{editingId ? "Save changes" : "Publish gathering"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
