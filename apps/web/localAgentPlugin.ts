import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Development-only, same-origin bridge. Production desktop invokes the same Rust service. */
export function localAgentPlugin(): Plugin {
  let bridge: ChildProcessWithoutNullStreams | undefined;
  let sequence = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  function stop() {
    bridge?.stdin.end(); bridge = undefined;
    for (const item of pending.values()) item.reject(new Error('本地 Agent 桥接已断开，请重试。'));
    pending.clear();
  }
  function request(method: string, payload: unknown) {
    if (!bridge) {
      const child = spawn('cargo', ['run', '--quiet', '-p', 'rea-local-agent'], { cwd: fileURLToPath(new URL('../../', import.meta.url)), stdio: 'pipe' });
      bridge = child;
      createInterface({ input: child.stdout }).on('line', line => {
        try {
          const message = JSON.parse(line) as { id: number; result?: unknown; error?: string };
          const item = pending.get(message.id);
          if (!item) return;
          pending.delete(message.id);
          if (message.error) item.reject(new Error(message.error)); else item.resolve(message.result);
        } catch { /* Only JSON protocol responses are used. */ }
      });
      child.stderr.on('data', data => { process.stderr.write(data); });
      child.on('error', stop);
      child.on('close', () => { if (bridge === child) stop(); });
    }
    return new Promise((resolve, reject) => {
      const id = ++sequence; pending.set(id, { resolve, reject });
      bridge!.stdin.write(`${JSON.stringify({ id, method, payload })}\n`, error => {
        if (error) { pending.delete(id); reject(error); }
      });
    });
  }
  return {
    name: 'rea-local-agent',
    configureServer(server) {
      server.httpServer?.once('close', stop);
      server.middlewares.use('/__rea/agent', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        const host = req.headers.host ?? '';
        const local = /^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host);
        const sameOrigin = !req.headers.origin || req.headers.origin === `http://${host}`;
        if (!local || !sameOrigin || req.headers['sec-fetch-site'] === 'cross-site') {
          res.statusCode = 403; res.end(JSON.stringify({ error: '本地 Agent 仅允许同源本地请求。' })); return;
        }
        if (req.method !== 'POST' || !req.headers['content-type']?.startsWith('application/json')) {
          res.statusCode = 405; res.end(JSON.stringify({ error: '请使用 JSON POST 请求。' })); return;
        }
        try {
          let body = '';
          for await (const chunk of req) {
            body += String(chunk);
            if (Buffer.byteLength(body) > 3_000_000) throw new Error('请求内容超过限制。');
          }
          const input = JSON.parse(body) as { method: string; payload: unknown };
          const result = await request(input.method, input.payload);
          res.end(JSON.stringify({ result }));
        } catch (error) {
          res.statusCode = 400; res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}
