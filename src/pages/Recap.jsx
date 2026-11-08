// src/pages/Recap.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react';
import { RECAP_FIRST_YEAR, buildRecap, openRecapYear, sampleReceipts } from '../utils/recap';

// UNFRAME year-end recap: a short run of story slides, then a card to save or share.
export default function Recap({ user, profile, tracks, isAdmin, onLogin, notify }) {
  const [params] = useSearchParams();
  // Admins (and anyone on the local dev server) can preview with sample data: /recap?preview=1
  const preview = (isAdmin || import.meta.env.DEV) && params.get('preview') === '1';
  const year = preview ? Number(params.get('year')) || RECAP_FIRST_YEAR : openRecapYear();
  const name = Number(profile?.nicknameUpdatedCount) >= 1 && profile?.nickname ? profile.nickname : 'Listener';

  const recap = useMemo(() => {
    if (!year) return null;
    return buildRecap({ year, tracks, receipts: preview ? sampleReceipts(tracks, year) : profile?.receipts || {} });
  }, [year, tracks, preview, profile?.receipts]);

  if (!year) {
    return (
      <main className="up-listening-page up-recap-closed">
        <p className="up-recap__eyebrow">UNFRAME RECAP</p>
        <h1>한 해의 결산은 12월에 열립니다</h1>
        <p>12월 1일부터 1월 말까지, 올해 UP에서 들은 음악과 전시를 한 장으로 돌아봅니다.</p>
        <Link to="/library">내 감상 기록 보기</Link>
      </main>
    );
  }
  if (!preview && !user) {
    return (
      <main className="up-listening-page up-recap-closed">
        <p className="up-recap__eyebrow">UNFRAME RECAP {year}</p>
        <h1>로그인하면 {year}년의 결산을 볼 수 있습니다</h1>
        <button type="button" className="is-primary" onClick={onLogin}>Google 로그인</button>
      </main>
    );
  }
  if (!recap) {
    return (
      <main className="up-listening-page up-recap-closed">
        <p className="up-recap__eyebrow">UNFRAME RECAP {year}</p>
        <h1>{year}년에 남은 감상 기록이 아직 없습니다</h1>
        <p>로그인한 채로 음악을 들으면 내년 결산에 담깁니다.</p>
        <Link to="/">UP 둘러보기</Link>
      </main>
    );
  }
  return <RecapStory recap={recap} name={preview ? 'Listener' : name} preview={preview} notify={notify} />;
}

function RecapStory({ recap, name, preview, notify }) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef(null);
  const [first] = recap.topTracks;

  const slides = [
    <div key="intro" className="up-recap__slide is-ink">
      <p className="up-recap__eyebrow">UNFRAME RECAP {recap.year}</p>
      <h1>{name}님의<br />{recap.year}년</h1>
      <p>전시와 음악 사이에서 보낸 한 해를 돌아봅니다.</p>
    </div>,
    <div key="minutes" className="up-recap__slide is-blue">
      <p className="up-recap__eyebrow">함께 들은 시간</p>
      <p className="up-recap__big">{recap.minutes.toLocaleString('ko-KR')}<small>분</small></p>
      <p>{recap.uniqueTracks}곡을 {recap.plays.toLocaleString('ko-KR')}번 재생했고, {recap.completed}번 끝까지 들었습니다.</p>
    </div>,
    first && (
      <div key="first" className="up-recap__slide">
        <p className="up-recap__eyebrow">올해 가장 많이 들은 곡</p>
        {first.track.image && <img className="up-recap__cover" src={first.track.image} alt="" />}
        <h2>{first.track.title}</h2>
        <p>{first.track.artist} · {first.count}번</p>
      </div>
    ),
    <div key="top" className="up-recap__slide is-ink">
      <p className="up-recap__eyebrow">TOP {recap.topTracks.length}</p>
      <ol className="up-recap__list">{recap.topTracks.map(({ track, count }) => <li key={track.id}><b>{track.title}</b><small>{count}번</small></li>)}</ol>
    </div>,
    (recap.mood || recap.genre) && (
      <div key="mood" className="up-recap__slide is-lime">
        <p className="up-recap__eyebrow">올해의 무드</p>
        <h2>{recap.mood ? `${recap.mood} 순간을 고른 리스너` : `${recap.genre}를 즐겨 들은 리스너`}</h2>
        {recap.mood && recap.genre && <p>가장 자주 머문 장르는 {recap.genre}였습니다.</p>}
      </div>
    ),
    (recap.topExhibition || recap.busiestMonth) && (
      <div key="place" className="up-recap__slide">
        <p className="up-recap__eyebrow">머문 자리</p>
        {recap.topExhibition && <h2>〈{recap.topExhibition.name}〉의 음악을 가장 많이 들었습니다</h2>}
        {recap.busiestMonth && <p>가장 많이 들은 달은 {recap.busiestMonth.month}월이었습니다.</p>}
      </div>
    ),
    <div key="card" className="up-recap__slide is-card">
      <div ref={cardRef} className="up-recap__card">
        <p className="up-recap__eyebrow">UNFRAME RECAP {recap.year}</p>
        <p className="up-recap__card-name">{name}</p>
        <dl>
          <div><dt>들은 시간</dt><dd>{recap.minutes.toLocaleString('ko-KR')}분</dd></div>
          <div><dt>들은 곡</dt><dd>{recap.uniqueTracks}곡</dd></div>
          {recap.mood && <div><dt>무드</dt><dd>{recap.mood}</dd></div>}
          {recap.topExhibition && <div><dt>전시</dt><dd>{recap.topExhibition.name}</dd></div>}
        </dl>
        <ol>{recap.topTracks.slice(0, 3).map(({ track }) => <li key={track.id}>{track.title}</li>)}</ol>
        <p className="up-recap__card-foot">up.unframe.kr</p>
      </div>
      <ShareActions cardRef={cardRef} year={recap.year} notify={notify} />
    </div>,
  ].filter(Boolean);

  const last = slides.length - 1;
  const go = useCallback((step) => setIndex((i) => Math.min(last, Math.max(0, i + step))), [last]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <main className="up-recap" aria-roledescription="carousel" aria-label={`${recap.year} UNFRAME 결산`}>
      {preview && <p className="up-recap__preview">미리보기 · 예시 데이터</p>}
      <div className="up-recap__progress" aria-hidden="true">{slides.map((_, i) => <span key={i} className={i <= index ? 'is-on' : ''} />)}</div>
      <section className="up-recap__stage" aria-live="polite" aria-label={`${index + 1} / ${slides.length}`}>{slides[index]}</section>
      {index < last && <button type="button" className="up-recap__tap is-next" aria-label="다음" onClick={() => go(1)}><ChevronRight /></button>}
      {index > 0 && <button type="button" className="up-recap__tap is-prev" aria-label="이전" onClick={() => go(-1)}><ChevronLeft /></button>}
    </main>
  );
}

function ShareActions({ cardRef, year, notify }) {
  const [busy, setBusy] = useState(false);
  const render = async () => {
    const { domToBlob } = await import('modern-screenshot');
    return domToBlob(cardRef.current, { scale: 3, type: 'image/png' });
  };
  const run = async (share) => {
    if (busy || !cardRef.current) return;
    setBusy(true);
    try {
      const blob = await render(), file = new File([blob], `unframe-recap-${year}.png`, { type: 'image/png' });
      if (share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: `UNFRAME RECAP ${year}` }); return; }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) { if (err?.name !== 'AbortError') notify?.('이미지를 만들지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="up-recap__actions">
      <button type="button" className="is-primary" disabled={busy} onClick={() => run(true)}><Share2 size={16} /> 공유</button>
      <button type="button" disabled={busy} onClick={() => run(false)}><Download size={16} /> 저장</button>
    </div>
  );
}
