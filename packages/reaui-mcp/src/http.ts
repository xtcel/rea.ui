import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createReauiServer } from './server';
import { SERVER_NAME, VERSION } from './version';

interface Session {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  /** 每个会话一个临时工作区，会话结束时删除。 */
  root: string;
  lastUsed: number;
}

export interface HttpOptions {
  port: number;
  host?: string;
  /** 设置后要求 `Authorization: Bearer <token>`。 */
  token?: string;
  /** 会话空闲多久后回收工作区，默认 1 小时。 */
  ttlMs?: number;
}

export interface RunningHttpServer {
  url: string;
  close: () => Promise<void>;
}

/**
 * 云端模式：Streamable HTTP。
 * 无状态能力服务——文档只存在于会话级临时目录，不做持久化存储。
 * 接入账号与计费时替换 workspace 的来源即可，工具实现不变。
 */
export async function startHttp(options: HttpOptions): Promise<RunningHttpServer> {
  const sessions = new Map<string, Session>();
  const ttlMs = options.ttlMs ?? 60 * 60 * 1000;
  const host = options.host ?? '127.0.0.1';

  async function dispose(id: string, session: Session): Promise<void> {
    sessions.delete(id);
    try {
      await session.transport.close();
    } catch {
      // 关闭失败不影响清理
    }
    try {
      await session.server.close();
    } catch {
      // 同上
    }
    await rm(session.root, { recursive: true, force: true }).catch(() => {});
  }

  async function createSession(): Promise<Session> {
    const root = await mkdtemp(path.join(tmpdir(), 'reaui-mcp-'));
    const server = createReauiServer({ root });
    const holder: { session?: Session } = {};
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: id => {
        if (holder.session) sessions.set(id, holder.session);
      },
    });
    const session: Session = { transport, server, root, lastUsed: Date.now() };
    holder.session = session;
    await server.connect(transport);
    return session;
  }

  function authorized(req: IncomingMessage): boolean {
    if (!options.token) return true;
    return req.headers.authorization === `Bearer ${options.token}`;
  }

  async function readBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return undefined;
    return JSON.parse(raw);
  }

  function send(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  const httpServer = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? host}`);

      if (url.pathname === '/health') {
        send(res, 200, { ok: true, name: SERVER_NAME, version: VERSION, sessions: sessions.size });
        return;
      }
      if (url.pathname !== '/mcp') {
        send(res, 404, { error: 'not found' });
        return;
      }
      if (!authorized(req)) {
        send(res, 401, { error: 'unauthorized' });
        return;
      }

      const header = req.headers['mcp-session-id'];
      const sessionId = Array.isArray(header) ? header[0] : header;
      const existing = sessionId ? sessions.get(sessionId) : undefined;

      if (req.method === 'DELETE') {
        if (existing && sessionId) await dispose(sessionId, existing);
        send(res, 200, { ok: true });
        return;
      }
      if (existing) {
        existing.lastUsed = Date.now();
        await existing.transport.handleRequest(req, res, req.method === 'POST' ? await readBody(req) : undefined);
        return;
      }
      if (req.method !== 'POST') {
        send(res, 400, { error: 'missing mcp-session-id' });
        return;
      }
      const body = await readBody(req);
      const session = await createSession();
      await session.transport.handleRequest(req, res, body);
    })().catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      if (!res.headersSent) send(res, 500, { error: message });
    });
  });

  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastUsed > ttlMs) void dispose(id, session);
    }
  }, 60_000);
  sweeper.unref();

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(options.port, host, () => resolve());
  });

  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : options.port;

  return {
    url: `http://${host}:${port}/mcp`,
    close: async () => {
      clearInterval(sweeper);
      for (const [id, session] of [...sessions]) await dispose(id, session);
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    },
  };
}
