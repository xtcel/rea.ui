import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const pkgDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(pkgDir, '../..');

await build({
  configFile: false,
  root,
  logLevel: 'warn',
  build: {
    ssr: 'packages/reaui-mcp/src/index.ts',
    outDir: path.join(pkgDir, 'dist'),
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      output: { entryFileNames: 'reaui-mcp.mjs', format: 'es' },
    },
  },
  ssr: {
    noExternal: [/^@modelcontextprotocol\//, /^zod/],
  },
});

await copyFile(path.join(root, 'LICENSE'), path.join(pkgDir, 'LICENSE'));

console.log('已构建 packages/reaui-mcp/dist/reaui-mcp.mjs');
