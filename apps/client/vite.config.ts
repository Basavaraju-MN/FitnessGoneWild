import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// While developing, photos kept in the database are sent by the API server
// (http://localhost:4000); in production it is the same site
const API_SERVER = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/hero-photo': API_SERVER,
      '/trip-photo': API_SERVER,
      '/about-photo': API_SERVER,
    },
  },
});
