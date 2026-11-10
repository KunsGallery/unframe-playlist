// src/components/library/PrivacyPanel.jsx
// My Page tab: what others can see, data download and account deletion.
import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { callApi } from '../../utils/api';
import { deleteMyAccount } from '../../utils/account';

const seoulMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(new Date());

export default function PrivacyPanel({ library, notify }) {
  const [busy, setBusy] = useState(false);
  const run = async (job) => { setBusy(true); try { await job(); } catch (e) { notify?.(e.message); } finally { setBusy(false); } };
  const setting = (key, value) => run(() => library.mutate({ action: 'settings', [key]: value }));
  return (
    <div className="up-library up-mypage-panel">
      {library.error && <div className="up-notice" role="alert">{library.error} <button onClick={library.refresh}>다시 불러오기</button></div>}
      <h2>공개는 내 선택으로</h2>
      <label className="up-check"><input type="checkbox" disabled={busy} checked={library.settings.rankingOptIn === true} onChange={(e) => setting('rankingOptIn', e.target.checked)} /> 닉네임·프로필 이미지·감상 통계를 공개 랭킹에 표시</label>
      <p className="up-field-note">기본은 비공개입니다. 직접 정한 닉네임만 공개되며, 아직 정하지 않았다면 Listener로 표시됩니다. 끄면 공개 랭킹 문서도 제거됩니다. 관리자 숨김 설정이 있으면 동의하더라도 노출되지 않습니다.</p>
      <label className="up-check"><input type="checkbox" disabled={busy} checked={library.settings.playlistDiscovery !== false} onChange={(e) => setting('playlistDiscovery', e.target.checked)} /> 내가 공개한 플레이리스트를 Library 추천에 보여주기</label>
      <p className="up-field-note">‘링크 공개’로 둔 플레이리스트만 대상입니다. 제목·소개·곡 목록만 보이고 닉네임 등 회원 정보는 표시되지 않습니다. 끄면 추천에서 바로 빠지고, 링크로는 계속 열립니다.</p>
      <h2>나의 데이터</h2>
      <p>프로필, 좋아요, 플레이리스트, 팔로우 기록을 JSON으로 내려받습니다.</p>
      <button disabled={busy} onClick={() => run(async () => { const data = await callApi('listener-library', { action: 'export' }); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `up-library-${seoulMonth()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); })}><Download size={16} />데이터 다운로드</button>
      <h2>회원 탈퇴</h2>
      <p>프로필, 경험치와 보상, 좋아요, 플레이리스트와 공유 링크, 팔로우, 감상 기록이 삭제되며 되돌릴 수 없습니다. 이미 업로드한 프로필 이미지는 외부 이미지 호스팅(ImgBB)에 남을 수 있어, 삭제가 필요하면 운영자에게 요청해 주세요.</p>
      <button disabled={busy} onClick={() => { if (prompt('탈퇴하면 모든 기록이 삭제되며 복구할 수 없습니다. 계속하려면 "탈퇴"를 입력해 주세요.') !== '탈퇴') return; void run(async () => { await deleteMyAccount(); location.assign('/'); }); }}><Trash2 size={16} />회원 탈퇴</button>
    </div>
  );
}
