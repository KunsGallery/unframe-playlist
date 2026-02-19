import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react()],
  define: {
    // 파이어베이스 설정을 문자열 형태로 주입
    __firebase_config: JSON.stringify({
      apiKey: "AIzaSyC_2CzowR-eA7m9dffHheEmOxWM0PKE6Is",
      authDomain: "unframe-playlist.firebaseapp.com",
      projectId: "unframe-playlist",
      storageBucket: "unframe-playlist.firebasestorage.app",
      messagingSenderId: "875707095707",
      appId: "1:875707095707:web:0ece5489c652a6d4a0843e",
    }),
    __app_id: JSON.stringify('unframe-playlist-v1')
  }
})