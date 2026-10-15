# UP improvement release · 2026-10-15

## Implemented

- Atomic Firestore achievement transitions, bounded daily history, event deduplication, Seoul dates, daily visit awards, unique daily likes, and historical milestone reconciliation.
- Admin profile level overrides now display consistently. Grants read the latest private profile in a transaction; annual settlement supports preview, progress, per-user failures and repeatable execution without changing an existing award date.
- Playlist items resolve by ID against current published tracks; deleted, hidden, inactive and draft tracks are excluded. Existing embedded playlist records remain readable.
- Real listening-time completion, consistent shuffle for app and lock-screen next, playlist-session counting, retry/error states and buffering timeout. Listening position and queue restore without autoplay.
- Full catalog expansion, all available genres, song stories, exhibition collections, shareable playlist/gathering links and downloadable local QR generation.
- Gathering photo and memory-note fields, distinct YouTube labeling, keyboard focus management and zoom support.
- Admin local drafts, leave-page warning, publication status, preview, media-link check, five retained revisions and restoration. Deleted records go to a recoverable draft/trash state.
- Admin and animation chunks split; screenshot capture loads on demand. Ranking subscriptions use four bounded top-30 queries instead of every user. Exact global listener ranking is not implied by this sampled display.
- Dependency security patches: npm audit reports zero vulnerabilities.

## Validation

- npm test: pure reward/catalog regression coverage.
- FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 npm test: local rules and concurrent play/playlist/like transaction integration.
- npm run lint: no errors. Two pre-existing React compiler warnings remain in unused decorative canvas components.
- npm run build: successful; application entry below 500 kB after splitting.
- Chromium 1440×1000 and 390×844: 9→24 catalog tracks, full player, 24 queue rows, Escape and focus restoration, QR generation, no horizontal overflow and no page errors.
- Real public content was read; no production user rewards or annual settlements were executed during verification.

## Pending external verification / activation

1. The new firestore.rules compiles and passes tests in the local demo-up emulator. Remote rule compilation was blocked by automatic approval review because sending the rule payload to Firebase project `unframe-playlist` requires explicit destination-specific approval. It is NOT deployed by a Git push or Netlify. Existing live rules therefore remain in effect until separately authorized deployment.
2. Existing server-authorized administrator accounts were preserved; the frontend now matches the three accounts already present in the live rules. No administrator was revoked or newly authorized server-side.
3. Safari/iPhone lock-screen, background next-track, Bluetooth, calls and cellular handoff require a real iPhone. Desktop Chromium is not evidence for those device behaviors.
4. XP/listening events are still client-reported. The rules improve access/field controls but do not make rewards tamper-proof. A trusted server event processor and audio delivery telemetry require a further backend deployment.
5. Draft/trash excludes content from public presentation; existing public content documents are still publicly readable at the database layer. Do not put secrets in editorial drafts. Truly private unpublished media needs a separate protected storage path and migration.
6. Official attendance stickers remain admin-issued; QR links open the archive and do not claim attendance or grant rewards automatically.
7. The current year's collectible catalog is 2026; settlement explicitly rejects unsupported years rather than creating invisible rewards.

## Recovery and operations

- No existing content migration or destructive data rewrite runs on deployment.
- A deleted record remains editable in Studio. Select it and restore the pre-deletion revision under Publication Tools.
- Local draft keys are `up:editor:<section>:<record-id>`; they are device-local, not a shared authoring system.
- Current public ranking visibility changes need the new server rules for reliable repeated updates.
