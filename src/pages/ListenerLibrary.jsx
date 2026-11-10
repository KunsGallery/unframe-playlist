import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Trash2, ArrowUp, ArrowDown, Share2, Lock, Globe, Check, ListMusic } from 'lucide-react';
import { openRecapYear } from '../utils/recap';
import ListeningReceipt from '../components/library/ListeningReceipt';
const EMPTY = { title: '', description: '', trackIds: [], isPublic: false };

// Listener playlists shared by link and open to recommendations (see community-playlists).
function useCommunityPlaylists() {
  const [lists, setLists] = useState([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/community-playlists', { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : { playlists: [] }))
      .then((data) => { if (alive) setLists(Array.isArray(data.playlists) ? data.playlists : []); })
      .catch(() => { /* Recommendations are optional; the shelf just stays hidden. */ });
    return () => { alive = false; };
  }, []);
  return lists;
}

function PlaylistShelf({ kicker, title, note, items }) {
  if (!items.length) return null;
  return <section className="up-playlist-shelf"><div className="up-playlist-shelf__head"><p className="up-kicker">{kicker}</p><h2>{title}</h2>{note && <p className="up-field-note">{note}</p>}</div>
    <div className="up-playlist-shelf__grid">{items.map((item) => <article key={item.key} className="up-playlist-card">
      <div className="up-playlist-card__cover">{item.covers.length ? item.covers.slice(0, 4).map((src, i) => <img key={i} src={src} alt="" loading="lazy" />) : <ListMusic aria-hidden="true" />}</div>
      <div className="up-playlist-card__text"><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}<small>{item.queue.length}곡</small></div>
      <div className="up-listening-actions"><button disabled={!item.queue.length} onClick={item.play}><Play size={15} />재생</button><Link className="up-playlist-card__open" to={item.href}>열기</Link></div>
    </article>)}</div></section>;
}

export default function ListenerLibrary({ user, profile, tracks, playlists = [], playTrack, library, notify, login }) {
  const [tab, setTab] = useState('playlists'), [draft, setDraft] = useState(null), [query, setQuery] = useState(''), [busy, setBusy] = useState(false);
  const community = useCommunityPlaylists();
  const run = async (job) => { setBusy(true); try { await job(); } catch (e) { notify(e.message); } finally { setBusy(false); } };
  const share = async (list) => {
    const url = `${location.origin}/playlist/${list.publicId}`;
    if (navigator.share) await navigator.share({ title: list.title, url }); else { await navigator.clipboard.writeText(url); notify('공유 링크를 복사했습니다.'); }
  };
  const isMember = Boolean(user);
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const coversOf = (queue) => [...new Set(queue.map((t) => t.image).filter(Boolean))];
  const directorItems = playlists.filter((p) => p.items?.length).map((p) => ({ key: `d-${p.id}`, title: p.title, description: p.desc || p.description, queue: p.items, covers: p.image ? [p.image] : coversOf(p.items), href: `/?playlist=${encodeURIComponent(p.id)}`, play: () => playTrack(0, p.items, { playlistKey: p.id }) }));
  const mine = new Set(library.playlists.map((l) => l.publicId));
  const communityItems = community.filter((p) => !mine.has(p.publicId)).map((p) => { const queue = p.trackIds.map((id) => byId.get(id)).filter(Boolean); return { key: `c-${p.publicId}`, title: p.title, description: p.description, queue, covers: coversOf(queue), href: `/playlist/${p.publicId}`, play: () => playTrack(0, queue, { playlistKey: `shared-${p.publicId}` }) }; }).filter((p) => p.queue.length);
  const tabs = [['playlists', '플레이리스트'], ['receipt', '감상 영수증']];
  return <section className="up-listening-page up-library"><div className="up-listening-title"><h1>Library</h1><p>내가 묶은 음악, 디렉터와 다른 리스너가 고른 순서, 그리고 한 달의 감상 기록.</p></div>
    <div className="up-library-tabs" role="tablist" aria-label="라이브러리 메뉴">{tabs.map(([id, label], index) => <button id={`tab-${id}`} aria-controls={`panel-${id}`} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} key={id} onClick={() => setTab(id)} onKeyDown={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length; setTab(tabs[next][0]); document.getElementById(`tab-${tabs[next][0]}`)?.focus(); } }}>{label}</button>)}</div>
    {isMember && library.error && <div className="up-notice" role="alert">{library.error} <button onClick={library.refresh}>다시 불러오기</button></div>}
    {isMember && library.loading && <p role="status">보관함을 동기화하고 있습니다…</p>}
    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
    {tab === 'playlists' && <>
      {!isMember ? <div className="up-library-empty up-library-login"><Lock size={24} /><h2>나만의 플레이리스트를 만들어 보세요.</h2><p>Google 로그인 후 좋아하는 UP 음원을 원하는 순서로 묶을 수 있습니다.</p><button className="is-primary" onClick={login}>Google로 로그인</button></div> : <>
        <div className="up-listening-actions"><h2>내 플레이리스트</h2><button onClick={() => { setDraft({ ...EMPTY, trackIds: [] }); setQuery(''); }}><Plus size={16} /> 새 플레이리스트</button></div>
        {draft && <form className="up-playlist-editor" onSubmit={(e) => { e.preventDefault(); void run(async () => { await library.mutate({ action: 'save-playlist', ...draft }); setDraft(null); notify('플레이리스트를 저장했습니다.'); }); }}>
          <h3>{draft.id ? '플레이리스트 편집' : '새 플레이리스트'}</h3><label>제목<input required maxLength={80} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>소개<textarea maxLength={500} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          <label className="up-check"><input type="checkbox" checked={draft.isPublic} onChange={(e) => setDraft({ ...draft, isPublic: e.target.checked })} /> 링크를 아는 사람에게 공개</label><p className="up-field-note">기본은 비공개입니다. 공개 시 제목·소개·곡 목록만 공유되며 회원 정보는 포함되지 않습니다. 비공개 전환 시 기존 링크도 닫힙니다.</p>
          <h4>재생 순서 · {draft.trackIds.length}/100곡</h4><ol className="up-selected-tracks">{draft.trackIds.map((id, i) => <li key={id}><span>{tracks.find((t) => t.id === id)?.title || '비공개 또는 삭제된 곡'}</span><button type="button" aria-label="위로 이동" disabled={i === 0} onClick={() => { const ids = [...draft.trackIds]; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; setDraft({ ...draft, trackIds: ids }); }}><ArrowUp size={15} /></button><button type="button" aria-label="아래로 이동" disabled={i === draft.trackIds.length - 1} onClick={() => { const ids = [...draft.trackIds]; [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; setDraft({ ...draft, trackIds: ids }); }}><ArrowDown size={15} /></button><button type="button" aria-label="곡 빼기" onClick={() => setDraft({ ...draft, trackIds: draft.trackIds.filter((x) => x !== id) })}><Trash2 size={15} /></button></li>)}</ol>
          <label>발행 음원에서 찾기<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="곡명 또는 아티스트" /></label><div className="up-track-picker">{tracks.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(query.toLowerCase())).map((t) => <button type="button" key={t.id} disabled={draft.trackIds.includes(t.id) || draft.trackIds.length >= 100} onClick={() => setDraft({ ...draft, trackIds: [...draft.trackIds, t.id] })}>{draft.trackIds.includes(t.id) ? <Check size={15} /> : <Plus size={15} />}<span>{t.title}<small>{t.artist}</small></span></button>)}</div>
          <div className="up-listening-actions"><button className="is-primary" disabled={busy} type="submit">{busy ? '저장 중…' : '저장'}</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>편집 닫기</button></div>
        </form>}
        {!library.playlists.length && !library.loading && <p className="up-library-empty">아직 만든 플레이리스트가 없습니다. 좋아하는 UP 음원을 원하는 순서로 묶어보세요.</p>}
        <div className="up-personal-playlists">{library.playlists.map((list) => {
          const queue = list.trackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean);
          return <article key={list.id}><div><h3>{list.title}</h3><p>{list.description}</p><small>{list.isPublic ? <Globe size={13} /> : <Lock size={13} />}{list.isPublic ? '링크 공개' : '나만 보기'} · {queue.length}곡{queue.length < list.trackIds.length ? ' · 비공개 곡 제외' : ''}</small></div><div className="up-listening-actions"><button disabled={!queue.length} onClick={() => playTrack(0, queue, { playlistKey: `personal-${list.id}` })}><Play size={15} />재생</button><button disabled={busy} onClick={() => setDraft({ ...list })}>편집</button>{list.isPublic && <button onClick={() => run(() => share(list))}><Share2 size={15} />공유</button>}<button aria-label={`${list.title} 삭제`} disabled={busy} onClick={() => { if (confirm('이 플레이리스트를 삭제할까요? 공유 링크도 닫힙니다.')) void run(() => library.mutate({ action: 'delete-playlist', id: list.id })); }}><Trash2 size={15} /></button></div></article>;
        })}</div>
      </>}
      <PlaylistShelf kicker="Director’s pick" title="디렉터가 추천하는 플레이리스트" items={directorItems} />
      <PlaylistShelf kicker="From listeners" title="다른 리스너의 플레이리스트" note="리스너가 링크 공개로 나눈 플레이리스트입니다. 원치 않는 리스너는 마이페이지 › 공개·개인정보에서 끌 수 있습니다." items={communityItems} />
    </>}
    {tab === 'receipt' && <>{openRecapYear() && <Link className="up-recap-entry" to="/recap"><b>{openRecapYear()} UNFRAME 결산</b><span>한 해 동안 들은 음악을 돌아보기 →</span></Link>}
      {!isMember ? <div className="up-library-empty up-library-login"><Lock size={24} /><h2>한 달의 감상을 영수증으로 받아보세요.</h2><p>Google 로그인 후 음악을 재생하면 영수증이 시작됩니다.</p><button className="is-primary" onClick={login}>Google로 로그인</button></div>
        : <ListeningReceipt receipts={profile?.receipts || {}} tracks={tracks} uid={user.uid} playTrack={playTrack} notify={notify} />}
    </>}
    </div>
  </section>;
}
