import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Puerto 5174 para poder correr el portal de clientes y el admin-panel (5173)
// al mismo tiempo sin que choquen.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  preview: { port: 5174 },
});
