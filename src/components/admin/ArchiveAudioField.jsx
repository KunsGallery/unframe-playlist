// src/components/admin/ArchiveAudioField.jsx
import { useRef, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { ARCHIVE_UPLOAD_URL, fetchArchiveItem, parseArchiveId } from "../../utils/archiveOrg";
import { formatTime } from "../../utils/PlayerUtils";

const DIRECT_AUDIO = /\.(wav|wave|flac|aiff?|mp3|m4a|aac|ogg|opus)(\?.*)?$/i;

// The audio field of the track form. Besides a plain link it takes an archive.org item
// address or identifier: "불러오기" lists the songs in the item and fills in the download
// link, length, and (when empty) title, artist and cover.
export default function ArchiveAudioField({ track, setTrack }) {
  const [busy, setBusy] = useState(false);
  const [item, setItem] = useState(null);
  const [message, setMessage] = useState("");
  const abort = useRef(null);

  const value = track.audioUrl || "";
  const id = parseArchiveId(value);
  const needsLoad = Boolean(id) && !DIRECT_AUDIO.test(value);

  const choose = (loaded, file) => {
    setTrack((prev) => ({
      ...prev,
      audioUrl: file.url,
      ...(file.durationSeconds > 0 ? { durationSeconds: file.durationSeconds } : {}),
      title: prev.title || loaded.title,
      artist: prev.artist || loaded.artist,
      image: prev.image || loaded.image,
    }));
    setItem(null);
    setMessage(
      `${file.name}을(를) 연결했습니다${file.durationSeconds > 0 ? ` · ${formatTime(file.durationSeconds)}` : ""}.` +
        (file.mp3Ready ? "" : " archive.org가 가벼운 MP3 사본을 아직 만드는 중입니다(보통 몇 분~1시간). 그동안은 원본으로 재생됩니다.")
    );
  };

  const load = async () => {
    if (!id || busy) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setItem(null);
    setMessage("");
    try {
      const loaded = await fetchArchiveItem(id, { signal: controller.signal });
      if (loaded.files.length === 1) choose(loaded, loaded.files[0]);
      else {
        setItem(loaded);
        setMessage(`이 아이템에 음원이 ${loaded.files.length}개 있습니다. 이 곡에 쓸 파일을 골라 주세요.`);
      }
    } catch (err) {
      if (err.name !== "AbortError") setMessage(err.message);
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  };

  return (
    <div className="space-y-2 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2 ml-1">
        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Audio</p>
        <a
          href={ARCHIVE_UPLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white"
        >
          archive.org에 올리기 <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input
          value={value}
          onChange={(e) => { setTrack((prev) => ({ ...prev, audioUrl: e.target.value.trim() })); setMessage(""); setItem(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && needsLoad) { e.preventDefault(); load(); } }}
          placeholder="archive.org 아이템 주소나 식별자, 또는 음원 주소"
          aria-label="음원 주소"
          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none"
        />
        <button
          type="button"
          onClick={load}
          disabled={!id || busy}
          title={id ? "archive.org 아이템에서 음원 불러오기" : "archive.org 주소나 식별자를 넣으면 쓸 수 있습니다"}
          className={`inline-flex items-center justify-center gap-2 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest disabled:opacity-30 ${needsLoad ? "bg-[#004aad] border-[#004aad] text-white" : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          불러오기
        </button>
      </div>
      {!value && (
        <p className="text-[11px] text-zinc-500 ml-1">
          archive.org에 음원을 올린 뒤, 아이템 주소(archive.org/details/…)를 붙여 넣고 불러오기를 누르면 나머지는 채워집니다.
        </p>
      )}
      {message && <p role="status" className="text-[11px] text-zinc-300 ml-1">{message}</p>}
      {item && (
        <ul className="rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden">
          {item.files.map((file) => (
            <li key={file.name}>
              <button
                type="button"
                onClick={() => choose(item, file)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-white/5"
              >
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-[11px] text-zinc-500">
                  {file.durationSeconds > 0 ? formatTime(file.durationSeconds) : ""}
                  {file.sizeMB ? ` · ${file.sizeMB}MB` : ""}
                  {file.mp3Ready ? "" : " · MP3 준비 중"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
