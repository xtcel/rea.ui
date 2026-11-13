import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { runCli } from './cli';
import { addManifestPage, PAGE_ID_PATTERN, pageFile, readManifest } from './manifest';
import { ensureDir, relativeTo, resolveInRoot } from './paths';

export interface ToolContext {
  /** 工作区根目录：本地是用户指定目录，云端是会话临时目录。 */
  root: string;
}

type ToolReturn = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

function reply(value: unknown, isError = false): ToolReturn {
  const result: ToolReturn = { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
  if (isError) result.isError = true;
  return result;
}

function failure(error: unknown): ToolReturn {
  const message = error instanceof Error ? error.message : String(error);
  return reply({ ok: false, error: message }, true);
}

/** CLI 的 --json 输出前可能带日志行，从第一个 `{` 开始解析。 */
function parseJsonOutput(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) return undefined;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return undefined;
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/** Pass package content to the CLI without shell interpolation or a permanent sidecar. */
async function withSystemFile<T>(root: string, source: string | undefined, run: (args: string[]) => Promise<T>): Promise<T> {
  if (source === undefined) return run([]);
  await mkdir(root, { recursive: true });
  const file = path.join(root, `.reaui-system-${crypto.randomUUID()}.json`);
  try { await writeFile(file, source, 'utf8'); return await run(['--system', file]); }
  finally { await rm(file, { force: true }); }
}

export function registerTools(server: McpServer, context: ToolContext): void {
  const { root } = context;

  server.registerTool('reaui_get_system', {
    title: 'Read the project design system', description: 'Read the complete embedded project system, or null when none is set. This project snapshot is authoritative for generation.',
    inputSchema: { path: z.string().describe('Project directory or .reaui file relative to the workspace root') },
  }, async input => {
    try {
      const target = resolveInRoot(root, input.path);
      const result = await runCli(['system', 'get', relativeTo(root, target), '--json'], root);
      return reply(parseJsonOutput(result.stdout) ?? { error: result.stderr || result.stdout }, result.code !== 0);
    } catch (error) { return failure(error); }
  });
  server.registerTool('reaui_set_system', {
    title: 'Set or remove the project design system', description: 'Adopt a complete reaui-design-system package in a project directory. Pass null to remove. Validates all page/component token references before writing; does not publish a library version.',
    inputSchema: { path: z.string().describe('Project directory relative to the workspace root'), system: z.string().nullable().describe('Full JSON package including schemaVersion, revision and hash; null removes the system') },
  }, async input => {
    try {
      const target = resolveInRoot(root, input.path);
      const result = await withSystemFile(root, input.system ?? undefined, args => runCli(['system', input.system === null ? 'remove' : 'set', relativeTo(root, target), ...args, '--json'], root));
      return reply(parseJsonOutput(result.stdout) ?? { error: result.stderr || result.stdout }, result.code !== 0);
    } catch (error) { return failure(error); }
  });

  server.registerTool('reaui_audit', {
    title: 'Audit design editability', description: 'Read-only heuristic suggestions for hierarchy, names, component reuse and editable SVG geometry. Separate from format validation.',
    inputSchema: { path: z.string(), strict: z.boolean().optional() },
  }, async input => {
    try {
      const target = resolveInRoot(root, input.path);
      const result = await runCli(['audit', relativeTo(root, target), '--json', ...(input.strict ? ['--strict'] : [])], root);
      return reply(parseJsonOutput(result.stdout) ?? { ok: false, error: result.stderr || result.stdout }, result.code !== 0);
    } catch (error) { return failure(error); }
  });

  server.registerTool('reaui_init_components', {
    title: 'Initialize reusable components', description: 'Add a catalog to an existing document directory; upgrades v2 to v3, keeps v4, never overwrites existing definitions.',
    inputSchema: { path: z.string() },
  }, async input => {
    try {
      const target = resolveInRoot(root, input.path);
      const result = await runCli(['components', 'init', relativeTo(root, target), '--json'], root);
      return reply(parseJsonOutput(result.stdout) ?? { ok: false, error: result.stderr || result.stdout }, result.code !== 0);
    } catch (error) { return failure(error); }
  });

  server.registerTool(
    'reaui_init',
    {
      title: 'Create a design document',
      description:
        'Create a minimal valid .reaui document (rea.json + one page TSX) at the given path. Use this before writing page content. Returns the created path and exit code.',
      inputSchema: {
        path: z.string().describe('Document directory, relative to the workspace root, e.g. "demo"'),
        name: z.string().describe('Human readable document name'),
        pageId: z.string().optional().describe('First page id, lowercase kebab-case. Defaults to "main"'),
        pageName: z.string().optional().describe('Display name of the first page'),
        width: z.number().int().positive().optional().describe('Desktop artboard width, default 1440'),
        height: z.number().int().positive().optional().describe('Desktop artboard height, default 1024'),
        system: z.string().optional().describe('Optional complete reaui-design-system JSON package embedded before page generation'),
        components: z.boolean().optional().describe('Initialize a reusable component catalog (v3, or retain v4 with a system)'),
      },
    },
    async input => {
      try {
        const target = resolveInRoot(root, input.path);
        const args = ['init', relativeTo(root, target), '--name', input.name];
        if (input.pageId) args.push('--page', input.pageId);
        if (input.pageName) args.push('--page-name', input.pageName);
        if (input.width) args.push('--width', String(input.width));
        if (input.height) args.push('--height', String(input.height));
        if (input.components) args.push('--components');
        const result = await withSystemFile(root, input.system, extra => runCli([...args, ...extra], root));
        if (result.code !== 0) return reply({ ok: false, exitCode: result.code, error: result.stdout || result.stderr }, true);
        return reply({ ok: true, path: relativeTo(root, target), output: result.stdout.trim() });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'reaui_write_page',
    {
      title: 'Write a page and validate it',
      description:
        'Write TSX source for one page, add it to the manifest if new, then validate immediately and return structured errors. This is the main tool for generating design content: the page must only use @rea/design primitives with static props and Tailwind className.',
      inputSchema: {
        path: z.string().describe('Document directory, relative to the workspace root'),
        pageId: z.string().describe('Page id, lowercase kebab-case; written to pages/<pageId>.page.tsx'),
        source: z
          .string()
          .describe('Full page source. Must default-export a <Page> that only uses @rea/design primitives'),
      },
    },
    async input => {
      try {
        if (!PAGE_ID_PATTERN.test(input.pageId)) {
          return reply({ ok: false, error: `页面 id 不合法：${input.pageId}，要求小写字母开头，只含小写字母、数字和连字符` }, true);
        }
        const docDir = resolveInRoot(root, input.path);
        if (!(await exists(path.join(docDir, 'rea.json')))) {
          return reply({ ok: false, error: `${input.path} 不是有效的文档目录，请先调用 reaui_init` }, true);
        }
        const relative = pageFile(input.pageId);
        await mkdir(path.join(docDir, 'pages'), { recursive: true });
        await writeFile(path.join(docDir, relative), input.source.endsWith('\n') ? input.source : `${input.source}\n`, 'utf8');

        const manifest = await readManifest(docDir);
        const added = !manifest.pages.some(page => page.id === input.pageId);
        if (added) await addManifestPage(docDir, { id: input.pageId, file: relative });

        const validation = await runCli(['validate', relativeTo(root, docDir), '--json'], root);
        const parsed = parseJsonOutput(validation.stdout);
        return reply({
          ok: validation.code === 0,
          pageId: input.pageId,
          file: relative,
          addedToManifest: added,
          validation: parsed ?? { raw: validation.stdout.trim() },
          ...(validation.code === 0 ? {} : { exitCode: validation.code }),
        }, validation.code !== 0);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'reaui_validate',
    {
      title: 'Validate a document',
      description:
        'Validate a document directory or a .reaui file. Returns structured errors with code, path, message and hint. Passing validation means the REA UI editor will open the file.',
      inputSchema: {
        path: z.string().describe('Document directory or .reaui file, relative to the workspace root'),
      },
    },
    async input => {
      try {
        const target = resolveInRoot(root, input.path);
        const result = await runCli(['validate', relativeTo(root, target), '--json'], root);
        const parsed = parseJsonOutput(result.stdout);
        if (!parsed) return reply({ ok: false, exitCode: result.code, error: result.stdout || result.stderr }, true);
        return reply({ ...(parsed as Record<string, unknown>), exitCode: result.code }, result.code !== 0);
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'reaui_pack',
    {
      title: 'Pack a document into .reaui',
      description:
        'Pack a validated document directory into a single .reaui file (ZIP). Only call after validation passes. Returns the output path and byte size.',
      inputSchema: {
        path: z.string().describe('Document directory, relative to the workspace root'),
        out: z.string().optional().describe('Output .reaui path. Defaults to <path>.reaui next to the directory'),
        force: z.boolean().optional().describe('Overwrite an existing file'),
      },
    },
    async input => {
      try {
        const target = resolveInRoot(root, input.path);
        const outPath = input.out ? resolveInRoot(root, input.out) : `${target}.reaui`;
        const args = ['pack', relativeTo(root, target), '--out', relativeTo(root, outPath)];
        if (input.force) args.push('--force');
        const result = await runCli(args, root);
        if (result.code !== 0) return reply({ ok: false, exitCode: result.code, error: result.stdout || result.stderr }, true);
        const info = await stat(outPath);
        return reply({ ok: true, output: relativeTo(root, outPath), bytes: info.size, message: result.stdout.trim() });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'reaui_unpack',
    {
      title: 'Unpack a .reaui file',
      description: 'Unpack a .reaui file into a document directory so pages can be edited one by one.',
      inputSchema: {
        file: z.string().describe('.reaui file path, relative to the workspace root'),
        out: z.string().describe('Target directory for the unpacked document'),
        force: z.boolean().optional().describe('Write into a non-empty directory'),
      },
    },
    async input => {
      try {
        const file = resolveInRoot(root, input.file);
        const outDir = resolveInRoot(root, input.out);
        const args = ['unpack', relativeTo(root, file), '--out', relativeTo(root, outDir)];
        if (input.force) args.push('--force');
        const result = await runCli(args, root);
        if (result.code !== 0) return reply({ ok: false, exitCode: result.code, error: result.stdout || result.stderr }, true);
        return reply({ ok: true, out: relativeTo(root, outDir), message: result.stdout.trim() });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'reaui_preview',
    {
      title: 'Render a self-contained HTML preview',
      description:
        'Render a validated document into a single self-contained preview.html with inline CSS. Useful for showing the result to a human without opening the editor.',
      inputSchema: {
        path: z.string().describe('Document directory, relative to the workspace root'),
        out: z.string().optional().describe('Output HTML path, defaults to preview.html in the workspace root'),
      },
    },
    async input => {
      try {
        const target = resolveInRoot(root, input.path);
        const outPath = input.out ? resolveInRoot(root, input.out) : path.join(root, 'preview.html');
        const result = await runCli(['preview', relativeTo(root, target), '--out', relativeTo(root, outPath)], root);
        if (result.code !== 0) return reply({ ok: false, exitCode: result.code, error: result.stdout || result.stderr }, true);
        const info = await stat(outPath);
        return reply({ ok: true, output: relativeTo(root, outPath), bytes: info.size, message: result.stdout.trim() });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'reaui_diff',
    {
      title: 'Compare two design sources',
      description: 'Compare two document directories and report what changed, so an agent can confirm it only touched the intended scope.',
      inputSchema: {
        before: z.string().describe('Baseline document directory'),
        after: z.string().describe('Modified document directory'),
      },
    },
    async input => {
      try {
        const before = resolveInRoot(root, input.before);
        const after = resolveInRoot(root, input.after);
        const result = await runCli(['diff', relativeTo(root, before), relativeTo(root, after)], root);
        if (result.code !== 0) return reply({ ok: false, exitCode: result.code, error: result.stdout || result.stderr }, true);
        return reply({ ok: true, report: result.stdout.trim() });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    'reaui_create_design',
    {
      title: 'Create a complete design in one call',
      description:
        'End-to-end: create the document, write every page, add pages to the manifest, validate, then pack into a .reaui file. Returns validation errors without packing if any page is invalid. Use this for the common "generate a multi-page design" request; use reaui_write_page for iterative edits.',
      inputSchema: {
        path: z.string().describe('Document directory, relative to the workspace root'),
        name: z.string().describe('Document name'),
        pages: z
          .array(
            z.object({
              id: z.string().describe('Page id, lowercase kebab-case'),
              name: z.string().describe('Display name'),
              source: z.string().describe('Full page TSX source'),
            }),
          )
          .min(1)
          .describe('One or more pages, written in order'),
        width: z.number().int().positive().optional().describe('Desktop artboard width, default 1440'),
        height: z.number().int().positive().optional().describe('Desktop artboard height, default 1024'),
        system: z.string().optional().describe('Optional complete reaui-design-system JSON package; pages can reference its --rea-ds-* variables'),
        components: z.string().optional().describe('Optional complete static components/main.components.tsx source'),
        out: z.string().optional().describe('Output .reaui path, defaults to <path>.reaui'),
      },
    },
    async input => {
      try {
        const docDir = resolveInRoot(root, input.path);
        const [first] = input.pages;
        if (!first) return reply({ ok: false, error: '至少需要一个页面' }, true);
        for (const page of input.pages) {
          if (!PAGE_ID_PATTERN.test(page.id)) return reply({ ok: false, error: `页面 id 不合法：${page.id}` }, true);
        }
        const duplicate = input.pages.find((page, index) => input.pages.findIndex(item => item.id === page.id) !== index);
        if (duplicate) return reply({ ok: false, error: `页面 id 重复：${duplicate.id}` }, true);

        const initArgs = ['init', relativeTo(root, docDir), '--name', input.name, '--page', first.id, '--page-name', first.name];
        if (input.width) initArgs.push('--width', String(input.width));
        if (input.height) initArgs.push('--height', String(input.height));
        if (input.components !== undefined) initArgs.push('--components');
        const init = await withSystemFile(root, input.system, extra => runCli([...initArgs, ...extra], root));
        if (init.code !== 0) return reply({ ok: false, stage: 'init', exitCode: init.code, error: init.stdout || init.stderr }, true);

        if (input.components !== undefined) {
          await mkdir(path.join(docDir, 'components'), { recursive: true });
          await writeFile(path.join(docDir, 'components/main.components.tsx'), input.components, 'utf8');
        }

        await mkdir(path.join(docDir, 'pages'), { recursive: true });
        for (const page of input.pages) {
          const relative = pageFile(page.id);
          await writeFile(path.join(docDir, relative), page.source.endsWith('\n') ? page.source : `${page.source}\n`, 'utf8');
          await addManifestPage(docDir, { id: page.id, file: relative });
        }

        const validation = await runCli(['validate', relativeTo(root, docDir), '--json'], root);
        const parsed = parseJsonOutput(validation.stdout);
        if (validation.code !== 0) {
          return reply({ ok: false, stage: 'validate', path: relativeTo(root, docDir), validation: parsed ?? { raw: validation.stdout.trim() } }, true);
        }

        const outPath = input.out ? resolveInRoot(root, input.out) : `${docDir}.reaui`;
        const packArgs = ['pack', relativeTo(root, docDir), '--out', relativeTo(root, outPath), '--force'];
        const packed = await runCli(packArgs, root);
        if (packed.code !== 0) return reply({ ok: false, stage: 'pack', exitCode: packed.code, error: packed.stdout || packed.stderr }, true);

        const info = await stat(outPath);
        return reply({
          ok: true,
          path: relativeTo(root, docDir),
          reaui: relativeTo(root, outPath),
          bytes: info.size,
          pages: input.pages.map(page => page.id),
          validation: parsed,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );
}

/** 读取工作区内的文本文件，供资源使用。 */
export async function readWorkspaceText(root: string, relative: string): Promise<string> {
  return readFile(resolveInRoot(root, relative), 'utf8');
}

export { ensureDir };
