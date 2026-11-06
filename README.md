# UNFRAME PLAYLIST

UNFRAME PLAYLIST는 Vite + React 기반의 음악 아카이브 SPA입니다. 전시/브랜드 맥락의 사운드를 재생하고, 좋아요와 공유를 기록하며, 업적과 XP/레벨 시스템을 통해 사용자 아카이브를 축적하는 구조로 만들어져 있습니다. Firebase Auth와 Firestore를 중심으로 동작하며, 관리자 화면에서 트랙/플레이리스트/메인 구성과 일부 사용자 보상을 관리할 수 있습니다.

**프로젝트 개요**
이 프로젝트는 크게 네 가지 역할을 가집니다.

- 메인 홈 화면에서 트랙, 큐레이션 플레이리스트, 추천 섹션, 랭킹을 노출합니다.
- 아카이브 화면에서 사용자 프로필, 좋아요 목록, 스티커북, XP/레벨 상태를 보여줍니다.
- 재생 이벤트를 기반으로 Firestore에 청취 기록, XP, 업적 보상을 누적합니다.
- 관리자 화면에서 공개 데이터와 운영용 설정을 수정합니다.

**실행 방법**
필수 조건은 Node.js와 npm입니다.

```bash
npm install
npm run dev
```

프로덕션 빌드 확인:

```bash
npm run build
```

로컬 프리뷰:

```bash
npm run preview
```

Firebase 설정은 현재 `src/firebase.js`에 포함되어 있습니다.

**배포 전 확인**
- `npm run build`가 오류 없이 완료되는지 확인합니다.
- Firestore 공개 데이터 경로가 아래 문서 기준과 일치하는지 확인합니다.
- `public/_redirects`가 배포 환경에서 SPA 라우팅을 처리하는지 확인합니다.
- PWA 아이콘과 `public/manifest.json`이 최신 브랜딩과 맞는지 확인합니다.
- iOS Safari와 iOS 홈 화면 설치(PWA) 환경에서 오디오 재생을 각각 점검합니다.
- 새 이미지를 올렸다면 `npm run media:mirror`를 실행해 `public/media`와 `src/constants/mediaMirror.js`를 함께 커밋합니다.

**이미지 미러**
ImgBB 장애 안내 그림은 정상 이미지로 응답하기 때문에 `onError`로 걸러지지 않습니다. 그래서 발행된 ImgBB 이미지는 `public/media`에 복사해 Netlify에서 제공합니다. 공개 화면은 저장된 URL을 표시할 때만 이 복사본으로 바꾸고, Firestore 문서와 관리자 화면의 값은 그대로 둡니다. 복사 전의 새 이미지는 ImgBB에서 표시되므로 위 명령을 실행하기 전까지는 장애 영향을 받습니다.

**가사 자동 맞춤**
STUDIO의 곡 편집 화면에서 가사를 넣고 **가사 자동 맞춤**을 누르면 관리자 브라우저에서 줄별 시간값을 만듭니다. 서버나 외부 API를 쓰지 않으며, 처음 한 번 AI 모델(약 240MB)을 받습니다. 곡당 몇 분 걸립니다.

- 언어는 가사에서 판별하고, 틀리면 직접 고를 수 있습니다. 괄호 안 번역은 시간을 맞추지 않고 그대로 둡니다.
- "확인 필요" 줄을 들어 보고 ±0.1초 버튼이나 탭 모드(스페이스)로 고칩니다.
- **적용**은 입력칸만 바꿉니다. 곡 저장 버튼을 눌러야 저장됩니다.
- 파이어폭스는 WebGPU가 지나치게 느려서 WASM으로 처리합니다. 다른 브라우저는 WebGPU를 먼저 쓰고, 실패하면 WASM으로 넘어갑니다.
- 정확도 측정: 개발 서버에서 `/scripts/lyric-accuracy.html`을 엽니다.

**Firestore 사용량**
- 방문자의 곡 목록과 랭킹은 `/api/catalog`, `/api/ranking`의 CDN 캐시(최대 10분 지연)로 제공합니다. 실패하면 Firestore 직접 읽기로 전환합니다. 관리자는 실시간 구독을 유지합니다.
- 청취 기록은 60초마다 `server_state` 문서 1건만 씁니다. 누적 시간은 다음 재생·완주 등의 이벤트 때 월간 영수증에 합쳐집니다.
- 공개 랭킹 문서는 최대 10분 간격으로 갱신됩니다. 랭킹 공개 설정 변경과 업적 달성은 문서에 바로 반영되지만, 화면에는 CDN 캐시 때문에 최대 10분 늦게 보일 수 있습니다.

**주요 폴더/파일 구조**
- `src/App.jsx`: 앱 셸, 라우팅, 전역 상태, 플레이어, 토스트, 업적 팝업 조립
- `src/pages/Home.jsx`: 메인 홈 화면
- `src/pages/Archive.jsx`: 사용자 아카이브/프로필 화면
- `src/pages/Admin.jsx`: 운영용 관리자 화면
- `src/pages/About.jsx`: 브랜드/프로젝트 소개 화면
- `src/hooks/useAppBoot.js`: 인증 부트스트랩과 기본 UI 상태 초기화
- `src/hooks/useAppDataSync.js`: Firestore 구독 및 공개/개인 데이터 동기화
- `src/hooks/usePlayerEngine.js`: 재생 시작, 다음곡/이전곡, Media Session 연동
- `src/hooks/useShareCard.js`: 공유 카드 이미지 생성 및 Web Share 처리
- `src/store.js`: XP/업적/스트릭/이벤트 처리 엔진
- `src/levels.js`: 레벨 테이블과 XP 기반 레벨 계산
- `src/components/AudioPlayer.jsx`: 미니 플레이어/풀 플레이어 전환
- `public/manifest.json`: PWA 메타데이터

**Firestore 스키마 요약**
앱은 `artifacts/{appId}`를 기준 루트로 사용합니다.

- `artifacts/{appId}/public/data/tracks/{trackId}`
  공개 트랙 문서
  예시 필드: `title`, `artist`, `image`, `description`, `tag`, `audioUrl`, `lyrics`, `createdAt`, `isHidden`
- `artifacts/{appId}/public/data/playlists/{playlistId}`
  공개 플레이리스트 문서
  예시 필드: `title`, `desc`, `image`, `items`, `trackIds`, `createdAt`
- `artifacts/{appId}/public/data/featured/directors_pick`
  홈 디렉터 추천 영역 데이터
- `artifacts/{appId}/public/data/site_config/main_texts`
  사이트 소개 문구 및 히어로 슬라이드 설정
- `artifacts/{appId}/public_stats/{uid}`
  랭킹/공개 프로필용 집계 데이터
  예시 필드: `displayName`, `nickname`, `profileImg`, `listenCount`, `shareCount`, `xp`, `levelKey`, `level`, `levelName`, `levelColor`
- `artifacts/{appId}/users/{uid}/profile/stats`
  개인 프로필/보상/카운터 문서
  예시 필드: `listenCount`, `shareCount`, `rewards`, `xp`, `levelKey`, `level`, `nickname`, `nicknameUpdatedCount`, `streak`, `counters`, `timeFlags`
- `artifacts/{appId}/users/{uid}/likes/{trackId}`
  사용자 좋아요 컬렉션

**Pring Desktop Pet Curation Fields**
UP tracks 문서는 Pring Desktop Pet의 UP Mini Player / Pring Pick에서도 함께 사용됩니다.

- Admin Track Editor에서 `moods`, `timeSlots`, `useCases`, `energy`, `language`, `tags`, `priority`, `isActive`, `curatorNote`를 관리합니다.
- `isActive === false`인 곡은 Pring 쪽 추천에서 제외될 수 있습니다.
- `priority`가 높을수록 Pring Pick에서 우선 추천될 수 있습니다.
- 큐레이션 필드는 기존 트랙 저장 구조를 유지한 채 선택적으로 보강됩니다.

**Admin 기능 요약**
- 트랙 생성, 수정, 삭제
- 플레이리스트 생성, 수정, 삭제
- 디렉터 추천/사이트 문구/히어로 슬라이드 편집
- 공개 유저 목록 조회 및 검색
- 특정 유저 닉네임/레벨명 오버라이드 저장
- 업적/콜렉티브 스티커 지급 및 회수
- 연간 정산용 운영 UI

**iOS Safari/PWA 오디오 관련 Known Issue**
- iOS PWA lockscreen playback may behave inconsistently. Safari tab is currently the primary supported playback environment.
- iOS 홈 화면 설치 상태에서는 잠금 화면 컨트롤, 백그라운드 재생 상태, 트랙 전환 반영이 브라우저 탭 환경보다 불안정할 수 있습니다.
- 현재 기준으로 가장 안정적인 재생 환경은 iOS Safari 탭에서 직접 여는 방식입니다.

**앞으로의 리팩터링 우선순위**
- `App.jsx`에 집중된 전역 상태와 이벤트 연결 코드를 단계적으로 정리
- `Home.jsx`, `Archive.jsx`, `Admin.jsx`의 대형 페이지 파일 책임 축소
- 닉네임/레벨 오버라이드/공개 프로필 필드 규칙 완전 통일
- 플레이어 props 인터페이스 정리와 미사용 상태 정리
- Firestore 문서 스키마와 관리자 입력 구조의 타입/검증 보강
- README를 운영 절차와 실제 배포 환경 기준으로 계속 최신화
