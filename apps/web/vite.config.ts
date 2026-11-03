import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { localAgentPlugin } from './localAgentPlugin.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), localAgentPlugin()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
