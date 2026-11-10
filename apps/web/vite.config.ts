import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { localAgentPlugin } from './localAgentPlugin.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** 关于页展示的是随构建发布的配套版本，直接从各自的 package.json 取值，避免硬编码在发版时漂移。 */
function packageVersion(file: string): string {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, file), 'utf8')) as { version?: unknown };
  if (typeof pkg.version !== 'string' || !pkg.version) throw new Error(`${file} 缺少 version 字段。`);
  return pkg.version;
}

export default defineConfig({
  // 部署到子路径（如 GitHub Pages 项目站点）时用 REA_BASE=/<repo>/ 覆盖。
  base: process.env.REA_BASE ?? '/',
  define: {
    __REAUI_EDITOR_VERSION__: JSON.stringify(packageVersion('package.json')),
    __REAUI_CLI_VERSION__: JSON.stringify(packageVersion('packages/reaui-cli/package.json')),
  },
  plugins: [react(), tailwindcss(), localAgentPlugin()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
