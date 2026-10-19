import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Heart, Plus, Bell, Check, ArrowLeft } from 'lucide-react';
export function FollowButton({ kind, name, library, notify }) {
  const [busy, setBusy] = useState(false);
  const followed = library.follows.some((f) => f.kind === kind && f.name === name);
  if (!name) return null;
  return <button disabled={busy} aria-pressed={followed} onClick={async () => {
    setBusy(true); try { await library.mutate({ action: 'follow', kind, name, enabled: !followed }); notify(followed ? '팔로우를 해제했습니다.' : '팔로우했습니다. Library에서 신곡 알림을 켤 수 있습니다.'); } catch (e) { notify(e.message); } finally { setBusy(false); }
  }}>{followed ? <Check size={15} /> : <Bell size={15} />}{followed ? '팔로우 중' : `${kind === 'artist' ? '아티스트' : '전시'} 팔로우`}</button>;
}
export default function ReleaseDetail({ tracks, playTrack, handleToggleLike, userLikes, library, notify }) {
  const { trackId } = useParams(), track = tracks.find((t) => t.id === trackId);
  const [playlistId, setPlaylistId] = useState(''), [busy, setBusy] = useState(false);
  if (!track) return <section className="up-listening-page"><h1>곡을 찾을 수 없습니다.</h1><p>비공개로 전환되었거나 아직 불러오는 중입니다.</p><Link to="/">음악 목록으로</Link></section>;
  const add = async () => {
    const list = library.playlists.find((p) => p.id === playlistId);
    if (!list) return;
    setBusy(true); try { await library.mutate({ action: 'save-playlist', ...list, trackIds: [...new Set([...list.trackIds, track.id])] }); notify('플레이리스트에 담았습니다.'); } catch (e) { notify(e.message); } finally { setBusy(false); }
  };
  return <article className="up-listening-page up-release-detail">
    <Link to="/" className="up-back-link"><ArrowLeft size={16} /> 발행 음원으로</Link>
    <div className="up-release-layout"><div className="up-release-art"><img src={track.image || '/icon.png'} alt={`${track.title} 앨범 커버`} /></div><div>
      <h1>{track.title}</h1><p className="up-release-artist">{track.artist}</p>
      <div className="up-listening-actions"><button className="is-primary" onClick={() => playTrack(0, [track])}><Play size={16} /> 재생</button><button aria-pressed={userLikes.includes(track.id)} onClick={(e) => handleToggleLike(e, track.id)}><Heart size={16} /> {userLikes.includes(track.id) ? '좋아요 취소' : '좋아요'}</button><FollowButton kind="artist" name={track.artist} library={library} notify={notify} /></div>
      <p className="up-liner-note">{track.curatorNote || track.description || '아직 등록된 라이너 노트가 없습니다.'}</p>
      <dl className="up-release-metadata">{[['발행 번호', track.releaseNumber], ['발행일', track.releasedAt], ['제작일', track.producedAt], ['앨범', track.album], ['버전', track.version], ['연결 작품', track.artworkTitle], ['크레딧', track.credits]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{typeof v === 'string' ? v : JSON.stringify(v)}</dd></div>)}</dl>
      {track.exhibition && <p>함께 듣는 전시 · <Link to={`/exhibitions/${encodeURIComponent(track.exhibition)}`}>{track.exhibition}</Link></p>}
      <div className="up-playlist-add"><label htmlFor="add-to-list">나의 플레이리스트에 담기</label><select id="add-to-list" value={playlistId} onChange={(e) => setPlaylistId(e.target.value)}><option value="">플레이리스트 선택</option>{library.playlists.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select><button onClick={add} disabled={!playlistId || busy}><Plus size={16} /> 담기</button><Link to="/library">새 플레이리스트 만들기</Link></div>
    </div></div>
    {track.lyrics && <section className="up-release-lyrics"><h2>가사</h2><p>{track.lyrics.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')}</p></section>}
  </article>;
}
