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
