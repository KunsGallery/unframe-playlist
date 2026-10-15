import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { createAchievementEngine } from '../src/store.js';
import assert from 'node:assert/strict';

test('Firestore protects admin settings and rejects new unauthorized fields', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const environment = await initializeTestEnvironment({ projectId: 'demo-up', firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') } });
  try {
    await environment.clearFirestore();
    const owner = environment.authenticatedContext('listener', { email: 'listener@example.com', firebase: { sign_in_provider: 'google.com' } }).firestore();
    const stranger = environment.authenticatedContext('stranger').firestore();
    const admin = environment.authenticatedContext('admin', { email: 'gallerykuns@gmail.com', firebase: { sign_in_provider: 'google.com' } }).firestore();
    const profile = (db) => doc(db, 'artifacts/up/users/listener/profile/stats');
    const stats = (db) => doc(db, 'artifacts/up/public_stats/listener');
    await assertSucceeds(setDoc(profile(owner), { xp: 0, nickname: 'Listener' }));
    await assertFails(updateDoc(profile(owner), { levelOverrideName: 'Admin' }));
    await assertFails(updateDoc(profile(stranger), { nickname: 'Hijacked' }));
    await assertSucceeds(updateDoc(profile(admin), { levelOverrideName: 'Family' }));
    await assertSucceeds(updateDoc(profile(owner), { xp: 10 }));
    const engine = createAchievementEngine({ db: owner, appId: 'up', uid: 'listener' });
    await Promise.all([
      engine.processEvent({ type: 'track_play_start', trackId: 'song-a', eventId: 'simultaneous-play' }),
      engine.processEvent({ type: 'playlist_play', playlistKey: 'list-a', eventId: 'simultaneous-playlist' }),
      engine.processEvent({ type: 'like_added', trackId: 'song-a', likedCount: 1, eventId: 'simultaneous-like' }),
    ]);
    const saved = (await getDoc(profile(owner))).data();
    assert.equal(saved.counters.listens, 1); assert.equal(saved.counters.playlistPlays['list-a'], 1);
    assert.ok(saved.rewards.some((r) => r.id === 'first_listen')); assert.ok(saved.rewards.some((r) => r.id === 'first_like'));
    assert.equal(saved.levelOverrideName, 'Family');
    await assertSucceeds(setDoc(stats(owner), { likedCount: 1, updatedAt: 1, rewardCount: 0 }));
    await assertFails(updateDoc(stats(owner), { isRankingHidden: true }));
    await assertFails(updateDoc(stats(owner), { unexpectedField: 'not allowed' }));
    await assertSucceeds(updateDoc(stats(admin), { isRankingHidden: true }));
    await assertFails(setDoc(doc(owner, 'artifacts/up/public/data/tracks/unauthorized'), { title: 'Not allowed' }));
    await assertSucceeds(setDoc(doc(admin, 'artifacts/up/public/data/tracks/authorized'), { title: 'Allowed' }));
  } finally { await environment.cleanup(); }
});
