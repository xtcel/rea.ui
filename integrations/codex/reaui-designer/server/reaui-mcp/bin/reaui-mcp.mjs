#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'dist', 'reaui-mcp.mjs');

const argv = process.argv.slice(2);

function flag(name) {
  const index = argv.findIndex(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index < 0) return undefined;
  const arg = argv[index];
  if (arg.includes('=')) return arg.slice(arg.indexOf('=') + 1);
  const next = argv[index + 1];
  return next && !next.startsWith('--') ? next : true;
}

if (flag('help') || argv.includes('-h')) {
  console.log(`reaui-mcp - MCP server for REA UI

Usage:
  reaui-mcp                      stdio transport, workspace defaults to the current directory
  reaui-mcp --root <dir>         stdio transport with an explicit workspace root
  reaui-mcp --http               Streamable HTTP transport on 127.0.0.1:8787
  reaui-mcp --http --port 8080   choose the port
  reaui-mcp --http --host 0.0.0.0 --token <secret>   expose publicly with bearer auth

Options:
  --root <dir>     workspace directory (stdio mode), defaults to cwd
  --http           serve over Streamable HTTP instead of stdio
  --port <n>       HTTP port, default 8787
  --host <addr>    HTTP bind address, default 127.0.0.1
  --token <secret> require Authorization: Bearer <secret> (HTTP mode)
  --ttl <minutes>  idle session lifetime in minutes, default 60
  --version        print the version
  --help           print this help
`);
  process.exit(0);
}

if (!existsSync(dist)) {
  console.error('缺少构建产物，请先运行：pnpm --filter @xtcel/reaui-mcp build');
  process.exit(2);
}

const module = await import(pathToFileURL(dist).href);

if (flag('version')) {
  console.log(module.VERSION);
  process.exit(0);
}

const http = Boolean(flag('http'));

try {
  if (http) {
    const port = Number(flag('port') ?? 8787);
    const host = typeof flag('host') === 'string' ? flag('host') : '127.0.0.1';
    const token = typeof flag('token') === 'string' ? flag('token') : undefined;
    const ttlMinutes = Number(flag('ttl') ?? 60);
    const server = await module.startHttp({ port, host, token, ttlMs: ttlMinutes * 60_000 });
    console.error(`[reaui-mcp] listening on ${server.url}${token ? ' (bearer auth)' : ''}`);
    const shutdown = async () => {
      await server.close();
      process.exit(0);
    };
    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
  } else {
    const root = path.resolve(process.cwd(), typeof flag('root') === 'string' ? flag('root') : '.');
    const server = module.createReauiServer({ root });
    await module.startStdio(server);
    console.error(`[reaui-mcp] workspace ${root}`);
  }
} catch (error) {
  console.error(`[reaui-mcp] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
