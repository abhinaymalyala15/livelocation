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
      // Bind IPv4 so http://127.0.0.1:5173 works (Node default localhost can be IPv6-only on Windows).
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
        '/socket.io': { target: 'http://127.0.0.1:3001', changeOrigin: true, ws: true },
      },
    },
    define: {
      __APP_GOOGLE_MAPS_API_KEY__: JSON.stringify(
        (env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
      ),
    },
  };
});
