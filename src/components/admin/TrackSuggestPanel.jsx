// src/components/admin/TrackSuggestPanel.jsx
import { useState } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { callApi } from "../../utils/api";
import { SUGGEST_STYLE_MAX, suggestFromKeywords } from "../../utils/trackSuggestRules";

const FIELDS = ["genre", "moods", "timeSlots", "useCases", "energy", "language", "instrumental", "tags"];
const LABELS = { genre: "Genre", moods: "Moods", timeSlots: "Time", useCases: "Use", energy: "Energy", language: "Language", tags: "Tags" };
const show = (value) => (Array.isArray(value) ? value.join(" · ") || "—" : String(value));

// Paste the style prompt, keep the lyrics in the field above, and get UP's labels suggested.
// The AI reads both; without a server key (or when it fails) keyword rules answer instead.
export default function TrackSuggestPanel({ track, setTrack }) {
  const [style, setStyle] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [before, setBefore] = useState(null);

  const input = { style, lyrics: track.lyrics || "", title: track.title || "", description: track.description || "" };
  const empty = !style.trim() && !String(track.lyrics || "").trim();

  const run = async () => {
    if (busy || empty) return;
    setBusy(true);
    setBefore(null);
    try {
      const { suggestion } = await callApi("track-suggest", input);
      setResult({ suggestion, source: "ai" });
    } catch (err) {
      setResult({ suggestion: suggestFromKeywords(input), source: "keywords", note: err.message });
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    const { suggestion } = result;
    setBefore(Object.fromEntries(FIELDS.map((f) => [f, track[f]]).concat([["tag", track.tag]])));
    setTrack((prev) => ({
      ...prev,
      genre: suggestion.genre,
      tag: suggestion.genre,
      moods: suggestion.moods,
      timeSlots: suggestion.timeSlots.length ? suggestion.timeSlots : prev.timeSlots,
      useCases: suggestion.useCases,
      energy: suggestion.energy,
      language: suggestion.language,
      instrumental: suggestion.instrumental,
      tags: [...new Set([...(prev.tags || []), ...suggestion.tags])],
    }));
  };

  const undo = () => {
    setTrack((prev) => ({ ...prev, ...before }));
    setBefore(null);
  };

  return (
    <div className="rounded-[1.5rem] border border-[#004aad]/40 bg-[#004aad]/[0.08] p-4 lg:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-zinc-300 uppercase font-black tracking-widest flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> 분류 자동 추천
        </p>
        <p className="text-[11px] text-zinc-500">곡 스타일과 위의 가사를 읽고 장르·무드·시간대·용도를 골라 드립니다.</p>
      </div>
      <textarea
        value={style}
        maxLength={SUGGEST_STYLE_MAX}
        onChange={(e) => setStyle(e.target.value)}
        placeholder="곡 스타일 (예: lo-fi, warm Rhodes piano, vinyl crackle, 78 bpm, rainy night)"
        aria-label="곡 스타일"
        className="w-full bg-white/5 border border-white/10 p-3 rounded-2xl outline-none h-20 resize-none text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy || empty}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#004aad] text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? "읽는 중…" : "추천 받기"}
        </button>
        {result && !before && (
          <button type="button" onClick={apply} className="px-4 py-2.5 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-widest">
            추천 적용
          </button>
        )}
        {before && (
          <button type="button" onClick={undo} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 text-white text-[11px] font-black uppercase tracking-widest">
            <Undo2 className="w-4 h-4" /> 적용 취소
          </button>
        )}
      </div>
      {empty && !result && <p className="text-[11px] text-zinc-500">스타일이나 가사 중 하나는 있어야 추천할 수 있습니다.</p>}
      {result && (
        <div className="space-y-2" aria-live="polite">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            {Object.entries(LABELS).map(([key, label]) => (
              <div key={key} className="contents">
                <dt className="text-zinc-500 uppercase tracking-widest text-[10px] font-black pt-0.5">{label}</dt>
                <dd className="text-zinc-100">{show(result.suggestion[key])}{key === "language" && result.suggestion.instrumental && result.suggestion.language !== "instrumental" ? " · instrumental" : ""}</dd>
              </div>
            ))}
          </dl>
          {result.suggestion.reason && <p className="text-[11px] text-zinc-400">{result.suggestion.reason}</p>}
          {result.source === "keywords" && (
            <p className="text-[11px] text-amber-200/80">
              낱말 규칙으로 고른 추천입니다{result.note ? ` (AI 추천: ${result.note})` : ""}. 적용 전에 한 번 확인해 주세요.
            </p>
          )}
          {before && <p className="text-[11px] text-emerald-200/80">적용했습니다. 저장하기 전까지는 아래에서 고치거나 취소할 수 있습니다.</p>}
        </div>
      )}
    </div>
  );
}
