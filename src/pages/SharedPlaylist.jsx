import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { Play } from 'lucide-react';
import { db, appId } from '../firebase';
export default function SharedPlaylist({ tracks, playTrack }) {
  const { id } = useParams(), [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => { let alive = true; getDoc(doc(db, 'artifacts', appId, 'shared_playlists', id)).then((snap) => { if (alive) { setData(snap.data() || null); setError(snap.exists() ? '' : '비공개로 전환되었거나 삭제된 플레이리스트입니다.'); } }).catch(() => { if (alive) setError('플레이리스트를 불러오지 못했습니다. 새로고침해 주세요.'); }); return () => { alive = false; }; }, [id]);
  const queue = (data?.trackIds || []).map((tid) => tracks.find((t) => t.id === tid)).filter(Boolean);
  return <section className="up-listening-page"><h1>{data?.title || '공유 플레이리스트'}</h1><p role="status">{error || data?.description || (!data ? '불러오는 중…' : '')}</p><p>UP 발행 음원 · {queue.length}곡</p><button className="is-primary" disabled={!queue.length} onClick={() => playTrack(0, queue, { playlistKey: `shared-${id}` })}><Play size={16} />순서대로 재생</button><ol className="up-shared-track-list">{queue.map((t) => <li key={t.id}><Link to={`/tracks/${t.id}`}>{t.title} · {t.artist}</Link></li>)}</ol><Link to="/library">내 플레이리스트 만들기</Link></section>;
}
