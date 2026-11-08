// src/components/JamPanel.jsx
import React, { useEffect, useState } from 'react';
import { Radio, X } from 'lucide-react';
import { JAM_STALE_MS, jamLink } from '../utils/jam';

// Host sheet: start a Jam, then share its link or QR (handy on a gallery wall).
export function JamPanel({ jam, user, onLogin, notify, onClose }) {
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const link = jam.role === 'host' && jam.jamId ? jamLink(jam.jamId) : '';

  useEffect(() => {
    if (!link) return;
    let alive = true;
    import('qrcode').then((m) => m.default.toDataURL(link, { width: 480, margin: 2, color: { dark: '#11110f', light: '#ffffff' } })).then((image) => { if (alive) setQr(image); }).catch(() => {});
    return () => { alive = false; };
  }, [link]);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'UP · Jam', text: '지금 같은 곡을 함께 들어요', url: link });
      else { await navigator.clipboard.writeText(link); notify?.('Jam 링크를 복사했습니다'); }
    } catch (err) { if (err?.name !== 'AbortError') notify?.('공유하지 못했습니다'); }
  };
  const start = async () => { setBusy(true); await jam.start(); setBusy(false); };

  return (
    <div className="up-jam-panel" role="dialog" aria-modal="false" aria-label="Jam" onClick={(e) => e.stopPropagation()}>
      <header><p><Radio size={16} aria-hidden="true" /> Jam · 함께 듣기</p><button type="button" aria-label="닫기" onClick={onClose}><X size={18} /></button></header>
      {jam.role === 'host' ? (
        <>
          <p>이 링크로 들어온 사람은 지금 이 곡을 같은 순간에 함께 듣습니다.</p>
          {qr && <img className="up-jam-panel__qr" src={qr} alt="Jam 참여 QR 코드" />}
          <p className="up-jam-panel__link">{link}</p>
          <div className="up-jam-panel__actions">
            <button type="button" className="is-primary" onClick={share}>링크 공유</button>
            <button type="button" onClick={() => { jam.end(); onClose(); }}>Jam 끝내기</button>
          </div>
        </>
      ) : jam.role === 'guest' ? (
        <>
          <p>{jam.hostState?.hostName || '호스트'}님의 Jam을 함께 듣고 있습니다.</p>
          <div className="up-jam-panel__actions">
            <button type="button" className="is-primary" onClick={jam.resync}>다시 맞추기</button>
            <button type="button" onClick={() => { jam.leave(); onClose(); }}>나가기</button>
          </div>
        </>
      ) : user && !user.isAnonymous ? (
        <>
          <p>Jam을 열면 링크와 QR이 생깁니다. 들어온 사람은 내가 듣는 곡을 같은 순간에 함께 듣습니다.</p>
          <div className="up-jam-panel__actions"><button type="button" className="is-primary" disabled={busy} onClick={start}>{busy ? '여는 중…' : 'Jam 열기'}</button></div>
        </>
      ) : (
        <>
          <p>Jam은 Google 로그인 후 열 수 있습니다. 참여는 로그인 없이도 됩니다.</p>
          <div className="up-jam-panel__actions"><button type="button" className="is-primary" onClick={onLogin}>Google 로그인</button></div>
        </>
      )}
    </div>
  );
}

// A slim strip while a Jam is on, outside the full player.
export function JamBanner({ jam, currentTrack }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (jam.role !== 'guest') return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [jam.role]);
  if (!jam.role) return null;
  const state = jam.hostState;
  const stale = jam.role === 'guest' && state?.playing && now - (state.updatedAt?.toMillis?.() || now) > JAM_STALE_MS;

  return (
    <div className="up-jam-banner" role="status">
      <Radio size={14} aria-hidden="true" />
      {jam.role === 'host'
        ? <span>Jam 진행 중 · 링크로 들어온 사람이 함께 듣고 있습니다</span>
        : <span>{stale ? '호스트 연결이 잠시 끊겼습니다' : `${state?.hostName || '호스트'}님의 Jam · ${currentTrack?.title || ''}`}</span>}
      {jam.role === 'guest' && <button type="button" onClick={jam.resync}>다시 맞추기</button>}
      <button type="button" onClick={jam.end}>{jam.role === 'host' ? '끝내기' : '나가기'}</button>
    </div>
  );
}
