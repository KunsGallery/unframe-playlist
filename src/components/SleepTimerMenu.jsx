// src/components/SleepTimerMenu.jsx
import React, { useState } from 'react';
import { Timer } from 'lucide-react';
import { SLEEP_OPTIONS, formatRemaining } from '../hooks/useSleepTimer';

export default function SleepTimerMenu({ timer }) {
  const [open, setOpen] = useState(false);
  if (!timer) return null;
  const label = timer.endOfTrack ? '곡 끝' : timer.deadline ? formatRemaining(timer.remaining) : 'Sleep';
  const choose = (fn) => { fn(); setOpen(false); };

  return (
    <div className="relative flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={timer.active ? `수면 타이머 켜짐: ${label}` : '수면 타이머'}
        className={`flex flex-col items-center gap-2 transition-colors ${timer.active || open ? 'text-[#004aad]' : 'text-zinc-400 hover:text-white'}`}
      >
        <Timer className="w-6 h-6" />
        <span className="text-[9px] font-black uppercase tracking-widest tabular-nums">{label}</span>
      </button>

      {open && (
        <div className="up-sleep-menu" role="menu" aria-label="수면 타이머">
          {SLEEP_OPTIONS.map((minutes) => (
            <button key={minutes} type="button" role="menuitem" onClick={() => choose(() => timer.start(minutes))}>{minutes}분</button>
          ))}
          <button type="button" role="menuitem" aria-pressed={timer.endOfTrack} onClick={() => choose(timer.startEndOfTrack)}>이 곡이 끝나면</button>
          {timer.active && <button type="button" role="menuitem" className="is-off" onClick={() => choose(timer.cancel)}>타이머 끄기</button>}
        </div>
      )}
    </div>
  );
}
