import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyC_2CzowR-eA7m9dffHheEmOxWM0PKE6Is",
  authDomain: "unframe-playlist.firebaseapp.com",
  projectId: "unframe-playlist",
  storageBucket: "unframe-playlist.firebasestorage.app",
  messagingSenderId: "875707095707",
  appId: "1:875707095707:web:0ece5489c652a6d4a0843e",
};

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true' && ['localhost', '127.0.0.1'].includes(location.hostname);
const app = initializeApp(useEmulators ? { ...firebaseConfig, projectId: 'demo-up', apiKey: 'demo-up-key' } : firebaseConfig);
export const appCheck = import.meta.env.VITE_APP_CHECK_SITE_KEY && !['localhost', '127.0.0.1'].includes(location.hostname)
  ? initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true }) : null;

export const auth = getAuth(app);
export const db = getFirestore(app);
if (useEmulators) { connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8088); }

export const appId = 'unframe-playlist-v1';
export const ADMIN_EMAILS = ['gallerykuns@gmail.com', 'cybog2004@gmail.com', 'sylove887@gmail.com'];
