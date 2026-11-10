// src/components/admin/SortableTrackList.jsx
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, ListMusic, Trash2 } from "lucide-react";

const safeSrc = (v) => (typeof v === "string" && v.trim() ? v : null);

// The chosen tracks of a playlist, in play order. Drag the handle (mouse or touch) to move a
// track; with the handle focused, the up and down arrow keys move it one place.
export default function SortableTrackList({ tracks, onReorder, onRemove, emptyLabel = "No tracks selected", readOnly = false }) {
  if (!tracks.length) {
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{emptyLabel}</p>
      </div>
    );
  }

  const ids = tracks.map((track) => track.id);
  const move = (index, by) => {
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    [next[index], next[to]] = [next[to], next[index]];
    onReorder(next);
  };

  if (readOnly) {
    return (
      <ol className="space-y-2">
        {tracks.map((track, index) => <Row key={track.id} track={track} index={index} />)}
      </ol>
    );
  }

  return (
    <Reorder.Group axis="y" values={ids} onReorder={onReorder} className="space-y-2" as="ol">
      {tracks.map((track, index) => (
        <SortableRow key={track.id} track={track} index={index} total={tracks.length} move={move} onRemove={onRemove} />
      ))}
    </Reorder.Group>
  );
}

function SortableRow({ track, index, total, move, onRemove }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={track.id}
      dragListener={false}
      dragControls={controls}
      className="relative list-none"
      whileDrag={{ scale: 1.02, zIndex: 10, boxShadow: "0 12px 30px rgba(0,0,0,.45)" }}
    >
      <Row track={track} index={index}>
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); move(index, -1); }
            if (e.key === "ArrowDown") { e.preventDefault(); move(index, 1); }
          }}
          aria-label={`${track.title} 순서 옮기기 (${index + 1}/${total}). 끌거나 위아래 화살표 키로 옮깁니다.`}
          title="끌어서 순서 바꾸기"
          className="p-1.5 -ml-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(track.id)}
          aria-label={`${track.title} 빼기`}
          className="p-2 rounded-full bg-white/5 text-red-400 hover:bg-red-500/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </Row>
    </Reorder.Item>
  );
}

// children: [drag handle, remove button] for the editable list; none when read only.
function Row({ track, index, children }) {
  const [handle, remove] = Array.isArray(children) ? children : [];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-900/90 border border-white/5 p-3 select-none">
      {handle}
      <div className="w-6 text-center text-zinc-600 text-xs font-bold">{index + 1}</div>
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
        {safeSrc(track.image) ? (
          <img src={safeSrc(track.image)} alt="" draggable={false} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ListMusic className="w-4 h-4 text-white/20" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black uppercase truncate">{track.title}</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">{track.artist}</p>
      </div>
      {remove}
    </div>
  );
}
