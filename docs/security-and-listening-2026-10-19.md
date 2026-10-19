# UP security and listening tools — 2026-10-19

## Scope

Keep the Google email administrator allow-list and the existing bright UP / LP player identity. iPhone background audio, collaborative playlists, attendance rewards, and listening parties are out of scope.

## Implemented in source

- Netlify authenticated server events own XP, rewards, counts, session completion and monthly receipts. Client clocks, requested XP and supplied like counts are ignored. Transactions deduplicate event IDs; server time bounds listening pulses; catalog duration is required for completion.
- Firestore clients cannot write reward/XP/counters/ranking projections. Own nickname (one change), prompt state and validated profile images remain editable. Legacy reward balances are preserved, not retroactively certified.
- Private `editorial/data/{kind}` source documents contain drafts and bounded revision history; `public/data/{kind}` contains an allow-listed projection. Save/restore/trash updates both atomically.
- Legacy `public_stats` becomes administrator-only. New `leaderboard` contains opt-in public fields only. Opt-out deletes the projection, including under concurrent events. Administrator hide deletes it immediately and remains authoritative.
- Authenticated upload proxy: 2.5 MB, JPG/PNG/WebP magic-byte validation, timeout, six requests/user/hour. No upload secret in browser source.
- Authenticated request limits use atomic Firestore counters; trusted Netlify client-IP header only. Expired counters are reused; `expiresAt` is bookkeeping, not a claim that paid Firestore TTL is enabled.
- App Check client/server support and telemetry are in place. Provider registered in monitoring mode; enforcement deliberately remains off until normal-client metrics are reviewed. Anonymous catalog and OG reads remain available.
- Static security headers enforce frame/object/base protection, referrer, MIME and permissions policies. Full CSP is report-only with a privacy-minimized report endpoint. OG/share functions reject unpublished or legacy history-bearing documents and no longer require inline scripts.
- Personal playlists: default private, up to 50 lists and 100 currently published UP tracks/list; ordered editing, playback and revocable link sharing. Shared projection has no owner identity. Owner access is checked server-side.
- Release details and optional release/production date, release number, credits, version, artwork and liner notes; admin editor fields included.
- Exhibition journey: entrance/artwork/exit, curator-provided stage notes; unspecified tracks go to artwork. Empty stages are explicitly empty, never invented.
- UP Radio: three deterministic, curation-aware programs composed exclusively from published UP tracks. It is a finite curated queue, not a live broadcast or an AI recommendation service.
- Artist/exhibition follows with opt-in in-app new-release notices; no unsolicited email or push. New publications refresh matching notices. Draft-to-public transition records publication time.
- Monthly receipt: new server-observed plays, bounded listening seconds, repeat tracks, exhibition listening and completions; only up to 13 months retained. No invented historical minutes or claims of physical attendance. Text sharing and personal JSON export included.

## External deployment status / approvals

- Firebase remains Spark (billing disabled). A dedicated `up-netlify-server` service account with `roles/datastore.user` was authorized and created; no Editor/Owner/Auth-admin role granted.
- Netlify free plan rejected function-only environment scopes. The owner separately approved build/server scope on 2026-10-19; the dedicated credential and upload key are now privately stored for production/dev only, not untrusted deploy-preview contexts. Keys from failed storage attempts were revoked.
- The public reCAPTCHA Enterprise site key and Firebase App Check provider are registered. No billing or enforcement was activated.
- ImgBB's previously exposed key has been moved server-side, but **migration does not revoke its historical exposure**. The provider account owner must regenerate/revoke it in ImgBB; do not rewrite Git history as a substitute. Never paste a replacement secret in chat.
- Billing alerts cannot be created without a billing account. Do not attach billing automatically. Review Spark quotas and Netlify credit notifications in their consoles. Rate limits are abuse mitigation, not a guaranteed cost ceiling.

## Safe rollout order

1. Obtain approved Netlify scope; put `FIREBASE_SERVICE_ACCOUNT`, `IMGBB_API_KEY` and `APP_CHECK_ENFORCE=false` in private non-`VITE_` variables. Netlify free plan makes these available to trusted builds as well as functions. Do not expose them through Vite `define`, logging or committed `.env` files.
2. `scripts/migrate-security.mjs` defaults to dry-run. Review counts; run `--apply --durations=scripts/data/track-durations-2026-10-19.json` only with a privately supplied server credential. It copies every source document to a private backup before replacing/removing its public projection. It preserves existing editorial sources and only applies measured lengths when the source URL hash still matches.
3. Backfill measured `durationSeconds` into the private source and public projection. Read-only metadata check found 21/24 ordinary tracks readable; three Archive.org AAC test files did not expose a finite browser duration. Do not guess these durations or issue completion rewards for them.
4. Verify private copy counts and public allow-lists, then deploy client/functions and the Firestore rules together in a maintenance window. Old open clients may need a refresh after protected writes switch to server endpoints.
5. Verify unauthenticated mutations fail; signed-in likes/playlists/receipts work; opt-out projections disappear; drafts/history are unavailable over public REST; sharing previews still work; production headers are present; no server keys appear in `dist`.
6. Review App Check and CSP reports with real clients before enforcement. Revise allow-lists for valid media endpoints instead of broadly allowing scripts. Keep OG requests outside App Check enforcement.

## Rollback / operations

- Private migration backups: `artifacts/unframe-playlist-v1/security_backups/{timestamp}/{kind}/{id}`. These are not accessible to client SDKs. Keep the backup ID in deployment records; restore via a trusted administrator process after inspecting exact IDs.
- Do not roll back to owner-writable XP or publicly readable profiles. A UI rollback must retain the hardened data policy and pause new writes if incompatible.
- Rotate the dedicated service-account key on a regular schedule and on any suspected exposure. Store replacement in Netlify, verify a new deploy, then revoke the old key. No automated rotation or scheduled monitoring has been enabled.
- Watch `api_error`, `app_check`, `csp_violation` logs without logging ID tokens, uploaded bodies or full blocked URLs. Inspect quota/429 trends before raising limits.

## Verification

- Production content migration backup: `2026-10-19T02-56-22.124Z`. Preserved 24 tracks, 1 official playlist, 4 gathering playlists in private editorial sources and sanitized public projections; no unsafe public fields found. Measured duration backfill matched 21 source URLs. Three AAC test-file durations remain unverified; no lengths guessed.

- Node tests cover reward transitions, public projection, curation, server auth/validation, Firestore privacy and emulator server integration.
- Emulator UI flow checked at 1440px and 390px: playlist create/share, release details, follows, exhibition stages, ranking opt-in/out, no page errors/overflow. Synthetic QA content stays in `demo-up` only.
- Build and lint checked. Two pre-existing inline-class React compiler warnings remain in AboutCanvas/WaveBackground; no new lint errors. npm audit: zero vulnerabilities after patching the UUID dependency.
- UI detector findings are existing Inter/grid/player-progress styles; the new features preserve the incumbent identity rather than redesigning it.
- Final UI review: **ship**. Readable non-obstructing feedback and persisted extension contract findings both resolved. No remaining material UI findings from that review.
