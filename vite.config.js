import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  // 리소스 경로를 루트로 설정하여 서브도메인 배포 시 안정성 확보
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // 'src' 폴더를 '@'로 간편하게 참조할 수 있도록 설정 (import 시 편리함)
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // 개발 서버 실행 시 자동으로 브라우저 열기
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 프로덕션 빌드 시 콘솔 로그 제거 (보안 및 성능)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // 큰 라이브러리는 별도의 파일로 분리하여 로딩 성능 최적화 (Code Splitting)
        manualChunks: {
          vendor: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})