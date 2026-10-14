import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build is served at thefitnessgonewild.in/admin/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  plugins: [react()],
  // ExcelJS (~930 kB) is its own chunk, loaded only when exporting to Excel
  build: { chunkSizeWarningLimit: 1000 },
  server: {
    port: 5175,
    strictPort: true,
  },
}));
