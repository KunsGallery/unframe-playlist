import { Link } from 'react-router-dom';
import { Play, ArrowUpRight, Radio } from 'lucide-react';
import { RADIO_STATIONS, radioQueue, exhibitionNames } from '../utils/listening';
export default function RadioShelf({ tracks, playTrack }) {
  return <section className="up-section up-radio-shelf" aria-labelledby="radio-title">
    <div className="up-section__head"><div><h2 id="radio-title">UP Radio</h2><p>언프레임이 발행한 음악만으로 이어지는 세 가지 시간.</p></div><Link to="/library">나의 플레이리스트 <ArrowUpRight size={16} /></Link></div>
    <div className="up-radio-programs">{RADIO_STATIONS.map((station) => <article key={station.id}><Radio aria-hidden="true" /><h3>{station.title}</h3><p>{station.description}</p><button disabled={!tracks.length} onClick={() => playTrack(0, radioQueue(tracks, station), { playlistKey: `radio-${station.id}` })}><Play size={15} /> 채널 재생</button></article>)}</div>
    {!!exhibitionNames(tracks).length && <div className="up-exhibition-links"><h3>전시를 듣는 순서</h3>{exhibitionNames(tracks).map((name) => <Link key={name} to={`/exhibitions/${encodeURIComponent(name)}`}>{name}<ArrowUpRight size={16} /></Link>)}</div>}
  </section>;
}
