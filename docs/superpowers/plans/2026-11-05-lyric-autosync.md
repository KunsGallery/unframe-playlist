# 가사 자동 맞춤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** STUDIO에서 가사를 넣고 버튼을 누르면 줄별 시간값 초안이 만들어지고, 검토 후 기존 저장 흐름으로 저장한다.

**Architecture:** 관리자 브라우저의 Web Worker에서 Whisper로 단어별 시간을 얻고, 순수 함수 모듈이 입력 가사와 문자 단위로 정렬한다. 서버, Firestore 구조, 재생 화면은 바꾸지 않는다.

**Tech Stack:** React 19, Vite 7, `@huggingface/transformers`, Web Audio API, `node:test`

**Spec:** `docs/superpowers/specs/2026-11-05-lyric-autosync-design.md`

**참고 구현:** 시험 코드의 정렬 로직을 옮겨 온다. 시험 코드는 임시 폴더에 있어 사라질 수 있으므로, 알고리즘은 Task 1에 적어 둔다.

## Global Constraints

- 모델: `onnx-community/whisper-small_timestamped`, `dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }`
- `return_timestamps: 'word'`, `chunk_length_s: 30`, `stride_length_s: 5`, `task: 'transcribe'`
- 음원: 16kHz 모노, highpass 200Hz, lowpass 3800Hz
- 줄 일치율 30% 미만은 보간하고 "확인 필요"로 표시한다.
- 전체 일치율 40% 미만이면 언어 확인을 안내한다.
- 결과 형식은 `[mm:ss.xx] 가사`이고, 구간 표시 줄은 결과에 넣지 않는다.
- `@huggingface/transformers`는 버튼을 누른 뒤에만 불러온다. 방문자 번들에 들어가면 안 된다.
- 음원과 가사를 외부로 보내지 않는다.
- 적용은 입력칸만 바꾼다. Firestore에는 기존 저장 버튼으로만 저장한다.

## Review Focus

- 재실행: 시간값이 이미 있는 가사를 다시 맞춰도 시간표가 중복되지 않아야 한다.
- 반복 후렴: 같은 가사가 여러 번 나와도 줄 시간이 뒤로 갈수록 늘어나야 한다.
- 일본어·이탈리아어 등 비한글 문자: 정규화 후에도 글자가 사라지지 않아야 한다.
- 인식 결과 없음: 연주 구간만 있거나 Whisper가 빈 결과를 내도 오류 없이 전 줄을 "확인 필요"로 표시해야 한다.
- 빈 줄과 구간 표시: 줄 수 계산과 정렬에서 빠져도 나머지 줄 순서가 유지되어야 한다.

---

### Task 1: 정렬 모듈

**Files:**
- Create: `src/utils/lyricAlign.js`
- Test: `tests/lyricAlign.test.js`

**Interfaces:**
- Produces:
  - `prepareLyrics(text: string) -> Array<{ text: string }>`: 시간값을 지우고 빈 줄과 `[Verse 1]`처럼 대괄호만 있는 줄을 뺀다.
  - `detectLanguage(text: string, fallback?: string) -> { language: string | null, certain: boolean }`: 값은 `korean`, `japanese`, `english`, `french`, `italian`, `spanish`.
  - `alignLyrics(lines, words) -> { lines: Array<{ text, time, matchRate, needsReview }>, matchRate: number }`: `words`는 `{ text, timestamp: [start, end | null] }[]`.
  - `toLrc(lines) -> string`, `formatLrcTime(seconds) -> 'mm:ss.xx'`.
  - `nudgeLine(lines, index, delta) -> lines`: 앞뒤 줄 시간을 넘지 않게 조정한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('prepareLyrics removes timestamps and section markers', () => {
  assert.deepEqual(prepareLyrics('[Verse 1]\n[00:38.15] 조용한 밤\n\n[00:40.78] 심장이 뛰어').map((l) => l.text), ['조용한 밤', '심장이 뛰어']);
});
test('re-running on timed lyrics does not stack timestamps', () => {
  const words = [{ text: '조용한', timestamp: [10, 11] }, { text: '밤', timestamp: [11, 12] }];
  const lrc = toLrc(alignLyrics(prepareLyrics('[00:01.00] 조용한 밤'), words).lines);
  assert.equal(lrc, '[00:10.00] 조용한 밤');
});
test('detectLanguage reads script, and is unsure about short latin text', () => {
  assert.equal(detectLanguage('조용한 밤의 끝에서').language, 'korean');
  assert.equal(detectLanguage('まだ灯りのある部屋').language, 'japanese');
  assert.equal(detectLanguage('nella stanza senza voce e la sera di me').language, 'italian');
  assert.equal(detectLanguage('la vie').certain, false);
});
test('repeated chorus stays in time order', () => {
  const words = ['후렴', '가사', '다른', '줄', '후렴', '가사'].map((text, i) => ({ text, timestamp: [i * 5, i * 5 + 1] }));
  const { lines } = alignLyrics([{ text: '후렴 가사' }, { text: '다른 줄' }, { text: '후렴 가사' }], words);
  assert.deepEqual(lines.map((l) => Math.round(l.time)), [0, 10, 20]);
});
test('unmatched line is interpolated and flagged', () => {
  const words = [{ text: '하나', timestamp: [10, 11] }, { text: '셋', timestamp: [30, 31] }];
  const { lines } = alignLyrics([{ text: '하나' }, { text: '전혀 없는 줄' }, { text: '셋' }], words);
  assert.equal(lines[1].needsReview, true); assert.equal(Math.round(lines[1].time), 20);
});
test('no recognized words flags every line without throwing', () => {
  const { lines, matchRate } = alignLyrics([{ text: '가사' }, { text: '둘째' }], []);
  assert.equal(matchRate, 0); assert.ok(lines.every((l) => l.needsReview));
});
test('non-Hangul text survives normalization', () => {
  const words = [{ text: 'stanza', timestamp: [3, 4] }, { text: 'よる', timestamp: [8, 9] }];
  assert.ok(alignLyrics([{ text: 'Stanza!' }, { text: 'よる' }], words).lines.every((l) => !l.needsReview));
});
test('format and nudge keep lines ordered', () => {
  assert.equal(formatLrcTime(75.5), '01:15.50');
  const lines = [{ text: 'a', time: 10 }, { text: 'b', time: 10.05 }];
  assert.equal(nudgeLine(lines, 1, -1)[1].time, 10);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/lyricAlign.test.js`
Expected: FAIL, `lyricAlign.js`를 찾을 수 없음

- [ ] **Step 3: 구현**

정규화는 `s.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '')`이다. 정렬 알고리즘:
- 인식 단어를 문자로 펼치고, 각 문자의 시간은 단어 구간을 글자 수로 나눠 정한다. `end`가 없으면 `start + 0.3`을 쓴다.
- 가사 문자열 `a`와 인식 문자열 `b`를 Needleman-Wunsch로 전역 정렬한다. 일치 +2, 불일치 -1, 간격 -1이다. 첫 행과 마지막 행의 `b` 간격 비용은 0으로 둬서 앞뒤의 인식 잡음을 무시한다. 메모리는 `Int32Array`와 `Uint8Array`를 쓴다.
- 줄 시간은 처음 일치한 문자의 시간에서 `줄 안 문자 위치 * 0.2`초를 뺀다.
- 일치율 0.3 미만인 줄은 앞뒤 신뢰 줄 사이를 보간한다. 앞뒤 중 하나만 있으면 줄당 3초 간격으로 잡고, 둘 다 없으면 0으로 둔다.
- 마지막에 앞 줄보다 빠른 시간을 앞 줄 시간으로 올려 순서를 보장한다.

라틴 언어 판별은 언어별 자주 쓰는 단어 목록을 세어 가장 많은 언어를 고른다. 단어가 8개 미만이거나 1위와 2위 차이가 작으면 `certain: false`이다.

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/lyricAlign.test.js`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/lyricAlign.js tests/lyricAlign.test.js
git commit -m "Add lyric alignment module"
```

### Task 2: 브라우저 분석과 측정 (진행 여부 판단 지점)

**Files:**
- Create: `src/utils/lyricAudio.js`, `src/workers/lyricSync.worker.js`, `src/utils/lyricSyncClient.js`, `scripts/lyric-accuracy.html`
- Modify: `package.json`, `public/_headers`

**Interfaces:**
- Consumes: `prepareLyrics`, `alignLyrics` (Task 1)
- Produces:
  - `decodeForSpeech(source: string | Blob) -> Promise<Float32Array>`: 16kHz 모노 필터 적용. 음원을 못 받으면 `code: 'AUDIO_BLOCKED'` 오류를 던진다.
  - `transcribeLyrics({ audio: Float32Array, language: string, onProgress({ stage, percent }) }) -> { promise: Promise<words>, cancel(): void }`

- [ ] **Step 1: 구현**

`OfflineAudioContext(1, length, 16000)`에 biquad 필터 2개를 연결한다. Worker는 WebGPU를 먼저 시도하고 실패하면 WASM을 쓴다. 메시지는 `{ type: 'progress' | 'done' | 'error' }`이다. `_headers`의 report-only CSP `connect-src`에 `https://huggingface.co https://*.huggingface.co https://*.hf.co`를 추가하고, onnxruntime WASM 파일은 Vite 에셋으로 제공한다(`env.backends.onnx.wasm.wasmPaths`).

- [ ] **Step 2: 번들 분리 확인**

Run: `npm run build`
Expected: 초기 `index` 청크에 `onnxruntime`이나 `transformers`가 없다. `grep -l onnxruntime dist/assets/*.js`에 Worker 청크만 나온다.

- [ ] **Step 3: 8곡 측정**

`scripts/lyric-accuracy.html`을 개발 서버로 열어 시간값이 있는 8곡을 분석하고 손으로 맞춘 시간과 비교한다.
Expected: 전체 1초 이내 90% 이상, 곡당 10분 이내. 곡별 결과를 스펙의 시험 표에 추가한다.

- [ ] **Step 4: 판단**

기준에 못 미치면 **여기서 멈추고** 측정값을 보고해 방식을 다시 정한다. 화면 작업으로 넘어가지 않는다.

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json public/_headers src/utils/lyricAudio.js src/utils/lyricSyncClient.js src/workers/lyricSync.worker.js scripts/lyric-accuracy.html docs/superpowers/specs/2026-11-05-lyric-autosync-design.md
git commit -m "Run lyric transcription in a browser worker"
```

### Task 3: 검토 화면과 탭 모드

**Files:**
- Create: `src/components/admin/LyricSyncPanel.jsx`
- Modify: `src/utils/lyricAlign.js`
- Test: `tests/lyricAlign.test.js`

**Interfaces:**
- Consumes: Task 1, Task 2의 함수
- Produces: `<LyricSyncPanel audioUrl lyrics language onApply={(lrc: string) => void} onClose />`, `stampLine(lines, index, seconds) -> lines`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test('tap stamp cannot move a line before the previous one', () => {
  const lines = [{ text: 'a', time: 10 }, { text: 'b', time: 20 }];
  assert.equal(stampLine(lines, 1, 5)[1].time, 10);
  assert.equal(stampLine(lines, 1, 15)[1].time, 15);
});
```

- [ ] **Step 2: 실패 확인 후 `stampLine` 구현, 통과 확인**

Run: `node --test tests/lyricAlign.test.js`
Expected: 처음 FAIL, 구현 후 PASS

- [ ] **Step 3: 패널 구현**

스펙의 흐름과 오류 처리 표대로 만든다. 언어 선택, 단계별 진행과 취소, 줄 목록(시간, 듣기, ±0.1초, "확인 필요"), 다음 확인 줄로 이동, 탭 모드(스페이스), `AUDIO_BLOCKED`일 때 파일 선택, 전체 일치율 40% 미만 안내를 포함한다. 패널을 닫거나 언마운트하면 `cancel()`을 호출한다. 분석 중 페이지 이탈은 `beforeunload`로 경고한다.

- [ ] **Step 4: 브라우저 확인**

시간값 없는 곡으로 분석, 줄 수정, 탭 모드, 취소, 잘못된 언어 재시도를 확인한다. 1440px과 390px에서 가로 넘침이 없어야 한다.

- [ ] **Step 5: 커밋**

```bash
git add src/components/admin/LyricSyncPanel.jsx src/utils/lyricAlign.js tests/lyricAlign.test.js
git commit -m "Add lyric sync review panel"
```

### Task 4: STUDIO 연결

**Files:**
- Modify: `src/components/admin/TrackManager.jsx:466-476`, `README.md`

**Interfaces:**
- Consumes: `<LyricSyncPanel />` (Task 3), `newTrack.audioUrl`, `newTrack.lyrics`, `newTrack.language`, `newTrack.instrumental`

- [ ] **Step 1: 버튼과 패널 연결**

`React.lazy`로 패널을 불러온다. 음원 주소나 가사가 없거나 연주곡이면 버튼을 누를 수 없게 하고 이유를 표시한다. 시간값이 있는 가사를 덮어쓸 때는 `confirm`을 받는다. `onApply`는 `setNewTrack`으로 입력칸만 바꾼다. README에 사용법을 추가한다.

- [ ] **Step 2: 전체 확인**

Run: `npm run lint && npm run build && npm run test:emulator`
Expected: 오류 0개, 테스트 전부 통과

- [ ] **Step 3: 실제 사용 확인**

시간값이 없는 5곡(Pressure Makes Light, 青い午後の硝子, 우리는 낡은 신발끈을 묶고, 벤치 위의 작은 오후, Milk Blue Morning)으로 적용까지 해 보고, 재생 화면에서 줄이 맞게 넘어가는지 확인한다. 저장은 사용자가 결정한다.

- [ ] **Step 4: 커밋**

```bash
git add src/components/admin/TrackManager.jsx README.md
git commit -m "Connect lyric auto-sync to the studio"
```
