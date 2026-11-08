// src/pages/JamJoin.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { db, appId } from '../firebase';
import { readJam, validJamId } from '../utils/jam';

export default function JamJoin({ jam, tracks }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const valid = validJamId(id);
  const [state, setState] = useState(undefined);

  // A plain read, refreshed now and then. The guest hook holds the only live listener once joined.
  useEffect(() => {
    if (!valid) return;
    let alive = true;
    const load = () => readJam(db, appId, id).then((next) => { if (alive) setState(next); }).catch(() => { if (alive) setState(null); });
    load();
    const timer = setInterval(load, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [id, valid]);

  const track = state && tracks.find((t) => t.id === state.trackId);
  const joined = jam.role === 'guest' && jam.jamId === id;

  return (
    <main className="up-listening-page up-jam-join">
      <p className="up-jam-join__eyebrow"><Radio size={16} aria-hidden="true" /> UP · JAM</p>
      {!valid || state === null ? (
        <>
          <h1>이 Jam은 끝났거나 찾을 수 없습니다</h1>
          <p>호스트가 Jam을 마쳤을 수 있습니다. UP의 다른 음악을 들어 보세요.</p>
          <Link className="up-jam-join__cta" to="/">UP 둘러보기</Link>
        </>
      ) : state === undefined ? (
        <p role="status">Jam을 찾고 있습니다…</p>
      ) : (
        <>
          <h1>{state.hostName}님과 함께 듣기</h1>
          <p>호스트가 듣고 있는 곡을 같은 순간에 함께 듣습니다. 곡을 고르고 넘기는 건 호스트가 합니다.</p>
          {track && (
            <div className="up-jam-join__track">
              <img src={track.image} alt="" />
              <div><b>{track.title}</b><small>{track.artist}</small><small>{state.playing ? '지금 재생 중' : '잠시 멈춤'}</small></div>
            </div>
          )}
          {joined ? (
            <button type="button" className="up-jam-join__cta" onClick={() => navigate('/')}>함께 듣는 중 · UP 둘러보기</button>
          ) : (
            <button type="button" className="up-jam-join__cta" onClick={() => { jam.join(id, state); navigate('/'); }}>함께 듣기 시작</button>
          )}
        </>
      )}
    </main>
  );
}
