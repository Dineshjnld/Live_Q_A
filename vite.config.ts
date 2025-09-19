import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        port: 5173,
        strictPort: true,
        proxy: {
          '/api': {
            target: 'http://localhost:5174',
            changeOrigin: true,
            secure: false
          }
        }
      }
    };
});
