#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

let server;
try {
  server = await createServer({
    root,
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    ssr: { noExternal: [/^@rea\//] },
  });
} catch (error) {
  console.error(`无法启动 reaui CLI 运行时：${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

try {
  const module = await server.ssrLoadModule('/packages/reaui-cli/src/cli.ts');
  process.exitCode = (await module.main(process.argv.slice(2))) ?? 0;
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 2;
} finally {
  await server.close();
}
