import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production build is served at thefitnessgonewild.in/admin/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
  },
}));
