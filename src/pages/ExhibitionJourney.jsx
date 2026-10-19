import { Link, useParams } from 'react-router-dom';
import { Play, ArrowLeft } from 'lucide-react';
import { journeyQueue } from '../utils/listening';
import { FollowButton } from './ReleaseDetail';
export default function ExhibitionJourney({ tracks, playTrack, library, notify }) {
  const { name } = useParams(), queue = journeyQueue(tracks, name);
  return <section className="up-listening-page up-journey"><Link className="up-back-link" to="/"><ArrowLeft size={16} /> 전시 목록으로</Link><h1>{name}</h1><p>입구에서 작품을 지나, 다시 일상으로. 전시와 함께 듣는 청취 여정입니다.</p>
    <div className="up-listening-actions"><button className="is-primary" disabled={!queue.length} onClick={() => playTrack(0, queue, { playlistKey: `exhibition-${name}` })}><Play size={16} /> 여정 시작</button><FollowButton kind="exhibition" name={name} library={library} notify={notify} /></div>
    {!queue.length && <p role="status">이 전시에 연결된 발행 음원이 없습니다.</p>}
    {['entrance', 'artwork', 'exit'].map((stage, index) => {
      const entries = queue.filter((t) => (t.journeyStage || 'artwork') === stage);
      return <section className="up-journey-stage" key={stage}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{['입구 · 공간에 들어서기', '작품 · 조금 더 머무르기', '퇴장 · 잔상 가져가기'][index]}</h2>{!entries.length ? <p>아직 이 구간에 지정된 곡이 없습니다.</p> : entries.map((t) => <article key={t.id}><button aria-label={`${t.title} 재생`} onClick={() => playTrack(queue.findIndex((x) => x.id === t.id), queue, { playlistKey: `exhibition-${name}` })}><Play size={16} /></button><div><Link to={`/tracks/${t.id}`}>{t.title}</Link><p>{t.journeyNote || t.artworkTitle || t.curatorNote || t.artist}</p></div></article>)}</div></section>;
    })}<p className="up-field-note">구간이 지정되지 않은 곡은 ‘작품’에 모아집니다. 관리자에서 곡별 구간과 안내 문구를 편집할 수 있습니다.</p>
  </section>;
}
