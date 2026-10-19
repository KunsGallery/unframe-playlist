import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, getDocs, collection } from 'firebase/firestore';
test('server-authoritative rules prevent reward forgery, private draft leaks and ranking exposure', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-up', firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  try {
    await env.clearFirestore();
    const owner = env.authenticatedContext('listener', { email: 'listener@example.com', firebase: { sign_in_provider: 'google.com' } }).firestore();
    const guest = env.unauthenticatedContext().firestore();
    const stranger = env.authenticatedContext('stranger').firestore();
    const admin = env.authenticatedContext('admin', { email: 'gallerykuns@gmail.com', firebase: { sign_in_provider: 'google.com' } }).firestore();
    const profile = 'artifacts/up/users/listener/profile/stats';
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), profile), { xp: 100, nickname: 'Listener', nicknameUpdatedCount: 0, rewards: [] });
      await setDoc(doc(ctx.firestore(), 'artifacts/up/public/data/tracks/published'), { title: 'Public', status: 'published', audioUrl: 'https://example.com/a.mp3' });
      await setDoc(doc(ctx.firestore(), 'artifacts/up/editorial/data/tracks/draft'), { title: 'Secret draft', revisionHistory: [{ secret: true }] });
      await setDoc(doc(ctx.firestore(), 'artifacts/up/public_stats/listener'), { xp: 100 });
    });
    for (const payload of [{ xp: 999999 }, { rewards: ['annual_gold'] }, { counters: { listens: 999 } }, { rankingOptIn: true }, { levelOverrideName: 'Admin' }]) await assertFails(updateDoc(doc(owner, profile), payload));
    await assertSucceeds(updateDoc(doc(owner, profile), { nicknamePrompted: true }));
    await assertSucceeds(updateDoc(doc(owner, profile), { nickname: 'New Name', nicknameUpdatedCount: 1 }));
    await assertFails(updateDoc(doc(owner, profile), { nickname: 'Again', nicknameUpdatedCount: 1 }));
    await assertFails(updateDoc(doc(owner, profile), { nicknameUpdatedCount: 0 }));
    await assertFails(getDoc(doc(stranger, profile)));
    await assertSucceeds(updateDoc(doc(admin, profile), { xp: 101 }));
    await assertFails(getDoc(doc(guest, 'artifacts/up/editorial/data/tracks/draft')));
    await assertSucceeds(getDoc(doc(admin, 'artifacts/up/editorial/data/tracks/draft')));
    await assertSucceeds(getDocs(collection(guest, 'artifacts/up/public/data/tracks')));
    await assertFails(setDoc(doc(admin, 'artifacts/up/public/data/tracks/unsafe-history'), { title: 'Draft leak', status: 'published', isPublished: true, revisionHistory: [{ secret: true }] }));
    await assertFails(setDoc(doc(admin, 'artifacts/up/public/data/tracks/unsafe-draft'), { title: 'Draft', status: 'draft', isPublished: false }));
    await assertSucceeds(setDoc(doc(admin, 'artifacts/up/public/data/tracks/safe'), { title: 'Public', status: 'published', isPublished: true, audioUrl: 'https://example.com/a.mp3' }));
    await assertFails(getDoc(doc(guest, 'artifacts/up/public_stats/listener')));
    await assertFails(setDoc(doc(owner, 'artifacts/up/leaderboard/listener'), { xp: 9999 }));
    await assertSucceeds(getDocs(collection(guest, 'artifacts/up/leaderboard')));
    await assertFails(getDocs(collection(guest, 'artifacts/up/shared_playlists')));
    await assertFails(getDoc(doc(owner, 'artifacts/up/server_state/listener')));
    await assertFails(setDoc(doc(owner, 'artifacts/up/users/listener/playlists/hacked'), { trackIds: ['other'] }));
    await assertSucceeds(setDoc(doc(owner, 'artifacts/up/users/listener/likes/published'), { likedAt: Date.now() }));
    await assertFails(setDoc(doc(owner, 'artifacts/up/users/listener/likes/draft'), { likedAt: Date.now() }));
  } finally { await env.cleanup(); }
});
