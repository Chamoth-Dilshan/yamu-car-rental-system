import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const clientEnv = loadEnv(mode, process.cwd(), '');
  const serverEnv = loadEnv(mode, path.resolve(process.cwd(), '../server'), '');
  const serverPort = serverEnv.PORT || '5001';
  const proxyTarget = clientEnv.VITE_PROXY_TARGET || `http://127.0.0.1:${serverPort}`;

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        '/api': proxyTarget,
        '/uploads': proxyTarget
      }
    }
  };
});

