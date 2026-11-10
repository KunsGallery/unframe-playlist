// src/components/library/FollowingPanel.jsx
// My Page tab: followed exhibitions and artists, and new releases from them.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

export default function FollowingPanel({ library, notify }) {
  const [busy, setBusy] = useState(false);
  const run = async (job) => { setBusy(true); try { await job(); } catch (e) { notify?.(e.message); } finally { setBusy(false); } };
  return (
    <div className="up-library up-mypage-panel">
      {library.error && <div className="up-notice" role="alert">{library.error} <button onClick={library.refresh}>다시 불러오기</button></div>}
      <h2>팔로우한 전시와 아티스트</h2>
      <label className="up-check"><input type="checkbox" disabled={busy} checked={library.settings.releaseNotifications === true} onChange={(e) => run(() => library.mutate({ action: 'settings', releaseNotifications: e.target.checked }))} /> 앱 안에서 새 발행 알림 받기</label>
      <p className="up-field-note">팔로우한 뒤 새로 발행되는 음악을 알려드립니다. 이메일·브라우저 푸시는 전송하지 않습니다.</p>
      {!library.follows.length && <p className="up-library-empty">곡 상세나 전시 청취 여정에서 팔로우를 시작해 보세요.</p>}
      {library.follows.map((f) => <div className="up-follow-row" key={f.id}><span>{f.kind === 'artist' ? '아티스트' : '전시'} · {f.name}</span><button disabled={busy} onClick={() => run(() => library.mutate({ action: 'follow', kind: f.kind, name: f.name, enabled: false }))}>팔로우 해제</button></div>)}
      <h2>새로 도착한 음악</h2>
      {!library.notifications.length && <p>새 알림이 없습니다.</p>}
      {library.notifications.map((n) => <p key={n.id}><Bell size={15} /><Link to={`/tracks/${n.id}`}>{n.title} · {n.artist}</Link></p>)}
      {!!library.notifications.length && <button disabled={busy} onClick={() => run(() => library.mutate({ action: 'settings', markRead: true }))}>모두 읽음</button>}
    </div>
  );
}
