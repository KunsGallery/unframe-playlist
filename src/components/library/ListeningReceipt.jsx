// src/components/library/ListeningReceipt.jsx
// The monthly listening receipt: a paper slip that tilts toward the pointer and saves as an image.
import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock, Compass, Download, HelpCircle, Music2, Play, Share2 } from 'lucide-react';
import { barcodeBars, buildReceipt, monthLabel, receiptMonths } from '../../utils/receiptView';

const MAX_TILT = 12;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function ListeningReceipt({ receipts = {}, tracks = [], uid, playTrack, notify }) {
  const months = useMemo(() => receiptMonths(receipts), [receipts]);
  const [month, setMonth] = useState(months[0]);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);
  const view = useMemo(() => buildReceipt(receipts[month], { month, tracks, uid }), [receipts, month, tracks, uid]);

  const tilt = (event) => {
    const card = cardRef.current;
    if (!card || reducedMotion()) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--rx', `${((0.5 - y) * 2 * MAX_TILT).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`);
    card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    card.classList.add('is-tilting');
  };
  const settle = () => cardRef.current?.classList.remove('is-tilting');

  const toImage = async () => {
    settle();
    const { domToBlob } = await import('modern-screenshot');
    return domToBlob(cardRef.current, { scale: 3, type: 'image/png', backgroundColor: '#f6f4ee' });
  };
  const fileName = `up-receipt-${month}.png`;
  const download = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const run = async (job) => { setBusy(true); try { await job(); } catch (e) { if (e?.name !== 'AbortError') notify?.(e.message || '영수증 이미지를 만들지 못했습니다.'); } finally { setBusy(false); } };
  const save = () => run(async () => { download(await toImage()); notify?.('영수증 이미지를 저장했습니다.'); });
  const share = () => run(async () => {
    const blob = await toImage();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `${month} UP 감상 영수증` });
    else { download(blob); notify?.('공유를 지원하지 않는 브라우저라 이미지로 저장했습니다.'); }
  });

  const playFromReceipt = (id) => {
    const index = tracks.findIndex((t) => t.id === id);
    if (index >= 0) playTrack?.(index, tracks);
  };

  return (
    <div className="up-receipt-stage">
      <div className="up-receipt-head">
        <div>
          <h2>월간 감상 영수증</h2>
          <p>한 달 동안 들은 음악과 음악으로 다녀간 전시를 기록합니다.</p>
        </div>
        <div className="up-receipt-controls">
          <div className="up-receipt-chips" role="group" aria-label="최근 달">
            {months.slice(0, 3).reverse().map((m) => (
              <button type="button" key={m} aria-pressed={m === month} className={m === month ? 'is-active' : ''} onClick={() => setMonth(m)}>
                {Number(m.slice(5))}월{m === months[0] ? ' (당월)' : ''}
              </button>
            ))}
          </div>
          <label className="up-receipt-select">
            <span className="sr-only">감상한 달</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
            <ChevronDown aria-hidden="true" />
          </label>
          <button type="button" className="up-receipt-save" disabled={busy} onClick={save}><Download aria-hidden="true" /><span>이미지 저장</span></button>
        </div>
      </div>

      <div className="up-receipt-perspective" onPointerMove={tilt} onPointerLeave={settle} onPointerCancel={settle}>
        <article ref={cardRef} className="up-receipt" aria-label={`${month} 감상 영수증`}>
          <span className="up-receipt__glare" aria-hidden="true" />
          <span className="up-receipt__teeth up-receipt__teeth--top" aria-hidden="true" />
          <div className="up-receipt__body">
            <header className="up-receipt__header">
              <div className="up-receipt__meta"><span>TERMINAL #04</span><span>ISSUED {view.issued}</span></div>
              <h3>UNFRAME PLAYLIST</h3>
              <p>MONTHLY AUDIT &amp; SOUND LOG</p>
              <div className="up-receipt__period"><b>{month}</b><span>•</span><span>{view.since ? `${view.since}부터 확인된 기록` : '아직 기록 없음'}</span></div>
            </header>

            <dl className="up-receipt__stats">
              <div><dt><Music2 aria-hidden="true" />재생한 곡</dt><dd>{view.trackCount}곡</dd></div>
              <div><dt><Play aria-hidden="true" />재생 시작 횟수</dt><dd>{view.playStarts}회</dd></div>
              <div><dt><Clock aria-hidden="true" />확인된 청취 시간</dt><dd>{view.listening}<small>(TOTAL STREAMED)</small></dd></div>
              <div><dt><CheckCircle2 aria-hidden="true" />끝까지 들은 곡</dt><dd className="is-blue">{view.completed}회</dd></div>
            </dl>

            <hr className="up-receipt__dash" />

            <section>
              <div className="up-receipt__label"><span>다시 찾은 음악 (TOP LOOPS)</span><span>COUNT</span></div>
              {view.topTracks.length ? (
                <ol className="up-receipt__tops">
                  {view.topTracks.map((t) => (
                    <li key={t.id}>
                      <span>{t.rank}</span>
                      <button type="button" onClick={() => playFromReceipt(t.id)} title={`${t.title} 재생`}>{t.title}</button>
                      <b>{t.count}회</b>
                    </li>
                  ))}
                </ol>
              ) : <p className="up-receipt__none">두 번 이상 들은 곡이 아직 없습니다.</p>}
            </section>

            <hr className="up-receipt__dash" />

            <section>
              <div className="up-receipt__label">
                <span className="up-receipt__help">
                  음악으로 다녀간 전시
                  <details>
                    <summary aria-label="기록 기준 보기"><HelpCircle aria-hidden="true" /></summary>
                    <p>전시와 연결된 곡을 재생하면 그 전시가 이 칸에 기록되고, 재생 횟수가 함께 찍힙니다.</p>
                  </details>
                </span>
                <span>EXHIBITION PASS</span>
              </div>
              {view.exhibitions.length ? (
                <ul className="up-receipt__exhibitions">
                  {view.exhibitions.map((e) => (
                    <li key={e.name}>
                      <strong>{e.name}</strong>
                      <span className="up-receipt__stamp">VISITED · {e.count}회</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="up-receipt__empty-pass">
                  <Compass aria-hidden="true" />
                  <p>전시와 연결된 감상 기록이 아직 없습니다.</p>
                  <small>전시 사운드트랙을 들으면 이곳에 스탬프가 찍힙니다.</small>
                </div>
              )}
            </section>

            <footer className="up-receipt__footer">
              <div className="up-receipt__barcode" aria-hidden="true">{barcodeBars(view.code).map((w, i) => <i key={i} style={{ width: w }} />)}</div>
              <p className="up-receipt__code">* {view.code} *</p>
              <p className="up-receipt__fine">* 서버에서 확인된 청취 기록으로 발행했습니다. 로그인 전·오프라인·세션이 끊긴 구간은 빠질 수 있습니다.</p>
            </footer>
          </div>
          <span className="up-receipt__teeth up-receipt__teeth--bottom" aria-hidden="true" />
        </article>
      </div>

      <button type="button" className="up-receipt-share" disabled={busy} onClick={share}><Share2 aria-hidden="true" />{busy ? '이미지를 만드는 중…' : '영수증 공유 · 이미지 저장'}</button>
      <p className="up-receipt-tip">영수증 위에서 마우스나 손가락을 움직이면 종이가 빛을 받아 기울어집니다.</p>
    </div>
  );
}
