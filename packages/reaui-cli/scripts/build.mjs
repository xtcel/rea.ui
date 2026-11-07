import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const cliDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(cliDir, '../..');

await build({
  configFile: false,
  root,
  logLevel: 'warn',
  build: {
    ssr: 'packages/reaui-cli/src/cli.ts',
    outDir: path.join(cliDir, 'dist'),
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      output: { entryFileNames: 'reaui.mjs', format: 'es' },
    },
  },
  ssr: {
    noExternal: [/^@rea\//, /^tailwindcss/],
  },
});

// npm 会自动打包包内 LICENSE，把仓库根许可同步过来。
await copyFile(path.join(root, 'LICENSE'), path.join(cliDir, 'LICENSE'));

console.log('已构建 packages/reaui-cli/dist/reaui.mjs');
