import { useEffect, useRef, useState } from 'react';
import { getDirectLink } from '../../utils/PlayerUtils';

export default function PublicationTools({ value, setValue, identity, original, onRestore, kind }) {
  const [preview, setPreview] = useState(false), [check, setCheck] = useState(''), [saved, setSaved] = useState(false);
  const key = `up:editor:${identity}`;
  const baseline = useRef(JSON.stringify(value));
  const current = JSON.stringify(value);
  const dirty = baseline.current !== current;
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => { try { localStorage.setItem(key, current); setSaved(true); } catch { setSaved(false); } }, 500);
    const beforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { clearTimeout(timer); try { localStorage.setItem(key, current); } catch { /* Device storage is optional. */ } window.removeEventListener('beforeunload', beforeUnload); };
  }, [current, dirty, key]);
  const validate = async () => {
    setCheck('파일을 확인하고 있습니다…');
    const url = getDirectLink(value.audioUrl || value.image || '');
    try {
      if (!/^https:\/\//.test(url)) throw new Error('HTTPS 주소를 입력해 주세요.');
      if (value.audioUrl) {
        await new Promise((resolve, reject) => {
          const audio = new Audio();
          const cleanup = () => { clearTimeout(timer); audio.onloadedmetadata = null; audio.onerror = null; audio.removeAttribute('src'); audio.load(); };
          const timer = setTimeout(() => { cleanup(); reject(new Error('응답이 늦습니다. 원본 링크를 확인해 주세요.')); }, 10000);
          audio.preload = 'metadata'; audio.onloadedmetadata = () => { cleanup(); resolve(); }; audio.onerror = () => { cleanup(); reject(new Error('음원에 접근할 수 없습니다. 파일 공개 설정을 확인해 주세요.')); }; audio.src = url;
        });
      } else {
        await new Promise((resolve, reject) => { const image = new Image(); image.onload = resolve; image.onerror = () => reject(new Error('이미지를 불러오지 못했습니다.')); image.src = url; });
      }
      setCheck('파일을 정상적으로 불러왔습니다.');
    } catch (error) { setCheck(error.message); }
  };
  return <div className="up-publication-tools">
    {original?.trashedAt && <p role="status">휴지통에 보관된 콘텐츠입니다. 변경 이력에서 삭제 전 버전을 복원할 수 있습니다.</p>}
    <div className="up-publication-tools__row">
      <label>공개 상태 <select value={value.status || (value.isPublished === false ? 'draft' : 'published')} onChange={(e) => setValue((v) => ({ ...v, status: e.target.value, ...(kind === 'gatherings' ? { isPublished: e.target.value === 'published' } : {}) }))}><option value="draft">임시저장 · 비공개</option><option value="published">발행 · 공개</option></select></label>
      <button type="button" onClick={() => setPreview((p) => !p)}>{preview ? '미리보기 접기' : '발행 전 미리보기'}</button>
      <button type="button" onClick={validate}>파일 연결 점검</button>
      <button type="button" onClick={() => { try { const draft = JSON.parse(localStorage.getItem(key)); if (draft) setValue(draft); else setCheck('저장된 임시본이 없습니다.'); } catch { setCheck('임시본을 읽지 못했습니다.'); } }}>이 기기의 임시본 불러오기</button>
    </div>
    <p role="status">{check || (saved ? '입력 내용이 이 기기에 임시저장되었습니다. 공개 반영은 저장 버튼을 눌러 주세요.' : '발행 전 미리보기와 파일 연결을 확인해 주세요.')}</p>
    {preview && <article className="up-editor-preview">{value.image && <img src={value.image} alt="커버 미리보기" />}<div><h3>{value.title || '제목을 입력해 주세요'}</h3><p>{value.artist || value.location || value.exhibitionTitle}</p><p>{value.desc || value.description || value.curatorNote}</p><small>{value.status === 'draft' ? '비공개 임시본' : '공개 예정'}</small></div></article>}
    {kind === 'playlists' && <div className="up-publication-tools__row"><label>전시명<input value={value.exhibitionTitle || ''} onChange={(e) => setValue((v) => ({ ...v, exhibitionTitle: e.target.value }))} /></label><label>큐레이터 노트<textarea value={value.curatorNote || ''} onChange={(e) => setValue((v) => ({ ...v, curatorNote: e.target.value }))} /></label></div>}
    {kind === 'gatherings' && <div className="up-publication-tools__row"><label>현장 사진 URL<input type="url" value={value.memoryPhoto || ''} onChange={(e) => setValue((v) => ({ ...v, memoryPhoto: e.target.value }))} /></label><label>그날의 기록<textarea value={value.memoryNote || ''} onChange={(e) => setValue((v) => ({ ...v, memoryNote: e.target.value }))} /></label></div>}
    {!!original?.revisionHistory?.length && <details><summary>변경 이력 · 최근 {original.revisionHistory.length}개</summary>{[...original.revisionHistory].reverse().map((revision, index) => <div key={index}><span>{new Date(revision.savedAt?.toMillis?.() || 0).toLocaleString('ko-KR')} · {revision.data.title}</span><button type="button" onClick={() => { if (window.confirm('이전 내용으로 복원할까요? 현재 내용도 변경 이력에 남습니다.')) onRestore(revision.data); }}>이 버전 복원</button></div>)}</details>}
  </div>;
}
