// src/components/admin/CommentModeration.jsx
import React, { useEffect, useState } from 'react';
import { formatTime } from '../../utils/PlayerUtils';
import { deleteComment, listCommentsForStudio, restoreComment } from '../../utils/comments';

// Latest timed notes across all tracks. Reported (hidden) ones are listed first.
export default function CommentModeration({ tracks = [], notify }) {
  const [rows, setRows] = useState(null);
  const titles = new Map(tracks.map((t) => [t.id, t.title]));

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  useEffect(() => {
    let alive = true;
    listCommentsForStudio()
      .then((list) => { if (alive) setRows([...list].sort((a, b) => Number(b.hidden) - Number(a.hidden) || b.createdAt - a.createdAt)); })
      .catch((err) => { if (alive) { setRows([]); notify?.(err.message); } });
    return () => { alive = false; };
  }, [version, notify]);

  const act = async (fn, message) => { try { await fn(); notify?.(message); load(); } catch (err) { notify?.(err.message); } };

  return (
    <section className="up-admin-notes">
      <header><h2>Notes</h2><p>리스너가 곡의 특정 시점에 남긴 감상입니다. 신고 3건이 쌓이면 자동으로 숨겨집니다.</p><button type="button" onClick={load}>새로고침</button></header>
      {rows === null ? <p>불러오는 중…</p> : !rows.length ? <p>아직 남겨진 감상이 없습니다.</p> : (
        <ul>
          {rows.map((c) => (
            <li key={c.id} className={c.hidden ? 'is-hidden' : ''}>
              <div>
                <p><b>{c.nickname}</b> · {titles.get(c.trackId) || c.trackId} · {formatTime(c.at)}{c.reports ? ` · 신고 ${c.reports}` : ''}{c.hidden ? ' · 숨김' : ''}</p>
                <p>{c.text}</p>
              </div>
              <div>
                {c.hidden && <button type="button" onClick={() => act(() => restoreComment(c.id), '다시 공개했습니다')}>공개</button>}
                <button type="button" className="is-danger" onClick={() => { if (window.confirm('이 감상을 지울까요? 되돌릴 수 없습니다.')) act(() => deleteComment(c.id), '지웠습니다'); }}>지우기</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
