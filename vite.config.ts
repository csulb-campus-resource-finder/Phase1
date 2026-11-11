import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname, 'src/frontend'),
  publicDir: path.resolve(import.meta.dirname, 'public'), // Adjust if your public folder is located elsewhere
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'), // Outputs build directly to root /dist folder for Express
    emptyOutDir: true,
  },
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