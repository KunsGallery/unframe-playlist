import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { callApi } from './api';

// The server credential has no Auth-admin role, so listening data is erased by the server
// and the sign-in account by the listener's own fresh session.
export async function deleteMyAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error('Google 로그인 후 이용할 수 있습니다.');
  await reauthenticateWithPopup(user, new GoogleAuthProvider());
  await callApi('listener-library', { action: 'delete-account', confirm: 'DELETE' });
  try { await deleteUser(user); } catch { await signOut(auth); }
  try {
    localStorage.removeItem(`up:daily:${user.uid}`);
    localStorage.removeItem('up:listening');
  } catch { /* Storage is optional. */ }
}
