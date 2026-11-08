// src/components/TrackComments.jsx
import React, { useState } from 'react';
import { Flag, Trash2 } from 'lucide-react';
import { formatTime } from '../utils/PlayerUtils';
import { COMMENT_MAX, activeComment, deleteComment, postComment, reportComment } from '../utils/comments';

const Avatar = ({ comment, size = 28 }) => comment.profileImg
  ? <img className="up-tnote-avatar" src={comment.profileImg} alt="" width={size} height={size} loading="lazy" />
  : <span className="up-tnote-avatar is-initial" style={{ width: size, height: size }} aria-hidden="true">{(comment.nickname || 'L').slice(0, 1).toUpperCase()}</span>;

// Dots above the progress bar, one per note, plus the note that floats up as playback passes it.
export function CommentMarks({ comments, duration, currentTime, isPlaying }) {
  if (!duration || !comments.length) return null;
  const live = isPlaying ? activeComment(comments, currentTime) : null;
  const pct = (at) => Math.min(100, Math.max(0, (at / duration) * 100));
  return (
    <div className="up-tnote-marks" aria-hidden="true">
      {comments.map((c) => <span key={c.id} className={`up-tnote-mark ${live?.id === c.id ? 'is-live' : ''}`} style={{ left: `${pct(c.at)}%` }} />)}
      {live && (
        <p key={live.id} className="up-tnote-bubble" style={{ left: `clamp(80px, ${pct(live.at)}%, calc(100% - 80px))` }}>
          <Avatar comment={live} size={18} />
          <span><b>{live.nickname}</b> {live.text}</span>
        </p>
      )}
    </div>
  );
}

export default function TrackComments({ track, comments, error, loading, onAdd, onDrop, currentTime, seek, user, isAdmin, onLogin, notify }) {
  const [text, setText] = useState('');
  const [pinnedAt, setPinnedAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const at = pinnedAt ?? currentTime;

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const comment = await postComment(track.id, at, text);
      onAdd(comment); setText(''); setPinnedAt(null);
      notify?.(`${formatTime(comment.at)}에 남겼습니다`);
    } catch (err) { notify?.(err.message); }
    finally { setBusy(false); }
  };
  const act = async (fn, done) => { try { await fn(); done(); } catch (err) { notify?.(err.message); } };

  return (
    <div className="up-tnotes" onClick={(e) => e.stopPropagation()}>
      <div className="up-tnotes__list">
        {loading ? <p className="up-tnotes__empty">불러오는 중…</p>
          : error ? <p className="up-tnotes__empty">{error}</p>
          : !comments.length ? <p className="up-tnotes__empty">아직 남겨진 감상이 없습니다. 마음이 움직인 순간에 첫 감상을 남겨 보세요.</p>
          : comments.map((c) => {
            const mine = user?.uid === c.uid;
            return (
              <article key={c.id} className="up-tnote">
                <Avatar comment={c} />
                <div>
                  <p className="up-tnote__meta"><b>{c.nickname}</b><button type="button" className="up-tnote__time" onClick={() => seek(c.at)} aria-label={`${formatTime(c.at)}로 이동`}>{formatTime(c.at)}</button></p>
                  <p className="up-tnote__text">{c.text}</p>
                </div>
                <div className="up-tnote__actions">
                  {user && !mine && <button type="button" aria-label="신고하기" title="신고하기" onClick={() => act(() => reportComment(c.id), () => notify?.('신고를 접수했습니다'))}><Flag size={14} /></button>}
                  {(mine || isAdmin) && <button type="button" aria-label="지우기" title="지우기" onClick={() => act(() => deleteComment(c.id), () => onDrop(c.id))}><Trash2 size={14} /></button>}
                </div>
              </article>
            );
          })}
      </div>

      {user ? (
        <form className="up-tnotes__form" onSubmit={submit}>
          <input
            value={text}
            maxLength={COMMENT_MAX}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => { if (pinnedAt === null) setPinnedAt(currentTime); }}
            placeholder="이 순간의 감상을 남겨 주세요"
            aria-label="감상 남기기"
          />
          <button type="submit" disabled={!text.trim() || busy}>{formatTime(at)}에 남기기</button>
          {pinnedAt !== null && <button type="button" className="up-tnotes__repin" onClick={() => setPinnedAt(currentTime)}>지금 시점으로</button>}
        </form>
      ) : (
        <button type="button" className="up-tnotes__login" onClick={onLogin}>Google 로그인 후 감상을 남길 수 있습니다</button>
      )}
    </div>
  );
}
