import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Always load .env / .env.local from this project root (not the shell cwd)
  const env = loadEnv(mode, rootDir, '');

  return {
    root: rootDir,
    envDir: rootDir,
    logLevel: 'error',
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    define: {
      __APP_GOOGLE_MAPS_API_KEY__: JSON.stringify(
        (env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
      ),
    },
  };
});
