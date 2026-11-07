import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { localAgentPlugin } from './localAgentPlugin.ts';

export default defineConfig({
  // 部署到子路径（如 GitHub Pages 项目站点）时用 REA_BASE=/<repo>/ 覆盖。
  base: process.env.REA_BASE ?? '/',
  plugins: [react(), tailwindcss(), localAgentPlugin()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
