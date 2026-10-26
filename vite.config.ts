import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname, 'src/frontend'),
  publicDir: path.resolve(import.meta.dirname, '../../public'),
  server: {
    host: '0.0.0.0', // Exposes dev server to your local network for mobile testing
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});