// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 🔧 важно для корректных путей на Vercel
  build: {
    outDir: 'dist'
  }
});
