import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronDown, ChevronUp, Hand, Play, Upload, Wand2, X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { getDirectLink } from '../../utils/PlayerUtils';
import { alignLyrics, detectLanguage, formatLrcTime, nudgeLine, prepareLyrics, stampLine, toLrc } from '../../utils/lyricAlign';
import { decodeForSpeech } from '../../utils/lyricAudio';
import { transcribeLyrics } from '../../utils/lyricSyncClient';

const LANGUAGES = [['korean', '한국어'], ['japanese', '일본어'], ['english', '영어'], ['french', '프랑스어'], ['italian', '이탈리아어'], ['spanish', '스페인어']];
const KNOWN_LANGUAGES = new Set(LANGUAGES.map(([value]) => value));
const LOW_MATCH = 0.4;

export default function LyricSyncPanel({ audioUrl, lyrics, language: trackLanguage, onApply, onClose }) {
  const detected = useMemo(() => detectLanguage(lyrics, KNOWN_LANGUAGES.has(trackLanguage) ? trackLanguage : undefined), [lyrics, trackLanguage]);
  const prepared = useMemo(() => prepareLyrics(lyrics), [lyrics]);
  const [language, setLanguage] = useState(detected.language || '');
  const [stage, setStage] = useState('setup'); // setup | running | review
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [lines, setLines] = useState([]);
  const [overallMatch, setOverallMatch] = useState(null);
  const [file, setFile] = useState(null);
  const [tapIndex, setTapIndex] = useState(null);
  const runRef = useRef(null);
  const stoppedRef = useRef(false);
  const dialogRef = useRef(null);
  const audioRef = useRef(null);
  const listRef = useRef(null);

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const stop = useCallback(() => { stoppedRef.current = true; runRef.current?.cancel(); }, []);
  const close = useCallback(() => { stop(); onClose(); }, [onClose, stop]);
  useDialogFocus(dialogRef, true, close);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (stage !== 'running') return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [stage]);

  const start = async () => {
    stoppedRef.current = false;
    setError(null); setStage('running'); setProgress('음원을 받는 중입니다.');
    try {
      const audio = await decodeForSpeech(file || audioUrl);
      if (stoppedRef.current) return;
      setProgress('AI 모델을 준비하는 중입니다.');
      const run = transcribeLyrics({
        audio,
        language,
        onProgress: (update) => setProgress(update.stage === 'model' ? `AI 모델을 받는 중입니다 (${update.percent}%). 처음 한 번만 받습니다.` : '노래를 듣고 있습니다. 곡당 몇 분 걸릴 수 있습니다.'),
      });
      runRef.current = run;
      const words = await run.promise;
      runRef.current = null;
      const result = alignLyrics(prepared, words);
      setLines(result.lines); setOverallMatch(result.matchRate); setStage('review');
    } catch (err) {
      runRef.current = null;
      if (err.code === 'CANCELLED') { setStage('setup'); return; }
      setError({ message: err.message, blocked: err.code === 'AUDIO_BLOCKED' });
      setStage('setup');
    }
  };

  const startManually = () => {
    setError(null); setOverallMatch(null);
    setLines(prepared.map((line) => ({ ...line, time: 0, matchRate: 0, needsReview: true })));
    setTapIndex(0); setStage('review');
  };

  const playFrom = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    audio.play().catch(() => setError({ message: '음원을 재생하지 못했습니다. 음원 파일을 직접 선택해 주세요.', blocked: true }));
  };

  const showLine = (index) => listRef.current?.querySelector(`[data-line="${index}"]`)?.scrollIntoView({ block: 'center' });

  const jumpToNextFlagged = (from = -1) => {
    const next = lines.findIndex((line, i) => i > from && line.needsReview);
    const target = next >= 0 ? next : lines.findIndex((line) => line.needsReview);
    if (target >= 0) showLine(target);
  };

  useEffect(() => {
    if (tapIndex === null) return undefined;
    const onKey = (event) => {
      if (event.code !== 'Space' || event.target.closest?.('input, select, textarea')) return;
      event.preventDefault();
      event.stopPropagation();
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) { audio.play().catch(() => {}); return; }
      setLines((current) => stampLine(current, tapIndex, audio.currentTime));
      setTapIndex((index) => (index + 1 < lines.length ? index + 1 : null));
      showLine(tapIndex + 1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tapIndex, lines.length]);

  const flaggedCount = lines.filter((line) => line.needsReview).length;
  const audioSource = fileUrl || getDirectLink(audioUrl);

  // Rendered on the body: the studio's glass panels would otherwise trap a fixed overlay.
  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="가사 자동 맞춤" className="up-lyric-sync">
      <div className="up-lyric-sync__sheet">
        <header className="up-lyric-sync__head">
          <h2><Wand2 aria-hidden="true" /> 가사 자동 맞춤</h2>
          <button type="button" onClick={close} aria-label="닫기"><X aria-hidden="true" /></button>
        </header>

        {error && (
          <div className="up-lyric-sync__alert" role="alert">
            <AlertTriangle aria-hidden="true" />
            <div>
              <p>{error.message}</p>
              {stage === 'setup' && <button type="button" onClick={startManually}><Hand aria-hidden="true" /> 탭으로 직접 맞추기</button>}
            </div>
          </div>
        )}

        {stage === 'setup' && (
          <div className="up-lyric-sync__setup">
            <p>가사 {prepared.length}줄의 시간을 맞춥니다. 괄호 안 번역은 시간을 맞추지 않고 그대로 둡니다.</p>
            <label>
              <span>가사 언어{detected.certain ? '' : ' (확인해 주세요)'}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="" disabled>언어 선택</option>
                {LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {(error?.blocked || file) && (
              <label>
                <span><Upload aria-hidden="true" /> 음원 파일 직접 선택</span>
                <input type="file" accept="audio/*" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(null); }} />
              </label>
            )}
            <small>처음 한 번 AI 모델(약 240MB)을 받습니다. 음원과 가사는 이 브라우저 안에서만 처리합니다.</small>
            <div className="up-lyric-sync__actions">
              <button type="button" className="is-primary" disabled={!language} onClick={start}><Wand2 aria-hidden="true" /> 자동 맞춤 시작</button>
              <button type="button" onClick={startManually}><Hand aria-hidden="true" /> 탭으로 직접 맞추기</button>
            </div>
          </div>
        )}

        {stage === 'running' && (
          <div className="up-lyric-sync__running" role="status" aria-live="polite">
            <span className="up-lyric-sync__spinner" aria-hidden="true" />
            <p>{progress}</p>
            <button type="button" onClick={() => { stop(); setStage('setup'); }}>취소</button>
          </div>
        )}

        {stage === 'review' && (
          <>
            {overallMatch !== null && overallMatch < LOW_MATCH && (
              <div className="up-lyric-sync__alert" role="alert">
                <AlertTriangle aria-hidden="true" />
                <div>
                  <p>인식된 내용이 가사와 많이 다릅니다. 언어를 확인해 다시 시도하거나 탭으로 맞춰 주세요.</p>
                  <button type="button" onClick={() => setStage('setup')}>언어 바꿔 다시 시도</button>
                </div>
              </div>
            )}
            <audio ref={audioRef} src={audioSource} controls preload="metadata" className="up-lyric-sync__audio" aria-label="곡 듣기" />
            <div className="up-lyric-sync__toolbar">
              <span>{flaggedCount ? `확인 필요 ${flaggedCount}줄` : '확인 필요 없음'}</span>
              {flaggedCount > 0 && <button type="button" onClick={() => jumpToNextFlagged()}>다음 확인 줄로</button>}
              <button type="button" aria-pressed={tapIndex !== null} onClick={() => setTapIndex((index) => (index === null ? 0 : null))}><Hand aria-hidden="true" /> {tapIndex === null ? '탭 모드 켜기' : '탭 모드 끄기'}</button>
            </div>
            {tapIndex !== null && <p className="up-lyric-sync__hint">스페이스로 재생을 시작하고, 줄이 시작될 때 스페이스를 누르세요. 곡 처음부터 맞출 때는 재생 위치를 0으로 돌려 주세요.</p>}
            <ol className="up-lyric-sync__lines" ref={listRef}>
              {lines.map((line, index) => (
                <li key={`${index}-${line.text}`} data-line={index} className={`${line.needsReview ? 'needs-review' : ''} ${tapIndex === index ? 'is-tapping' : ''}`}>
                  <button type="button" className="up-lyric-sync__play" onClick={() => playFrom(line.time)} aria-label={`${line.text} 듣기`}><Play aria-hidden="true" /></button>
                  <time>{formatLrcTime(line.time)}</time>
                  <span className="up-lyric-sync__text">{line.text}{line.needsReview && <em>확인 필요</em>}</span>
                  <span className="up-lyric-sync__nudge">
                    <button type="button" onClick={() => setLines((current) => nudgeLine(current, index, -0.1))} aria-label={`${line.text} 0.1초 앞으로`}><ChevronUp aria-hidden="true" /></button>
                    <button type="button" onClick={() => setLines((current) => nudgeLine(current, index, 0.1))} aria-label={`${line.text} 0.1초 뒤로`}><ChevronDown aria-hidden="true" /></button>
                  </span>
                </li>
              ))}
            </ol>
            <div className="up-lyric-sync__actions">
              <button type="button" className="is-primary" onClick={() => { onApply(toLrc(lines)); onClose(); }}>가사 입력칸에 적용</button>
              <button type="button" onClick={close}>취소</button>
            </div>
            <small>적용한 뒤 곡 저장 버튼을 눌러야 저장됩니다. 이전 가사는 변경 이력에 남습니다.</small>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
