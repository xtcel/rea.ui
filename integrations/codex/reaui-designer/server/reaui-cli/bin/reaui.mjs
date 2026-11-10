#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.join(here, '..', 'dist', 'reaui.mjs');
const source = path.join(here, '..', 'src', 'cli.ts');
const argv = process.argv.slice(2);

// 发布包只含 dist：直接运行打包产物，零运行时依赖。
// 仓库内保留了 src：走 Vite 加载 TS，改源码后无需重新构建。
if (existsSync(bundle) && !existsSync(source)) {
  try {
    const { main } = await import(pathToFileURL(bundle).href);
    process.exitCode = (await main(argv)) ?? 0;
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 2;
  }
} else {
  const { createServer } = await import('vite');
  const root = path.resolve(here, '../../..');

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
    process.exitCode = (await module.main(argv)) ?? 0;
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 2;
  } finally {
    await server.close();
  }
}
