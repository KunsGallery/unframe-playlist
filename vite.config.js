import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // 서브도메인이나 하위 경로 배포 시 리소스 경로를 명확히 하기 위해 '/'를 명시합니다.
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // 로컬 개발 시 포트 고정 (필요 시)
    port: 5173,
    strictPort: true,
  },
  build: {
    // 빌드 시 결과물이 생성될 폴더명 확인
    outDir: 'dist',
    // 캐시 문제를 방지하기 위해 파일 해싱을 강제합니다.
    assetsDir: 'assets',
  }
})