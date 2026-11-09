import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import protocol from '../../../docs/agent-protocol.md?raw';
import { registerTools } from './tools';
import { INSTRUCTIONS, SERVER_NAME, VERSION } from './version';

export interface ServerOptions {
  /** 工作区根目录；本地是用户目录，云端是会话临时目录。 */
  root: string;
}

export function createReauiServer(options: ServerOptions): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: VERSION }, { instructions: INSTRUCTIONS });

  registerTools(server, { root: options.root });

  server.registerResource(
    'agent-protocol',
    'reaui://protocol',
    {
      title: 'REA UI agent design protocol',
      description:
        'Complete contract for producing a valid .reaui document: document structure, allowed primitives, static-only prop rules, Tailwind conventions, hard limits and every validation error code.',
      mimeType: 'text/markdown',
    },
    async uri => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: protocol }],
    }),
  );

  return server;
}
