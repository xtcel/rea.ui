import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { DocumentSession } from '@rea/document';
import { emptyDocument, exportReaui } from '@rea/storage';
import { builtInSystems } from '../home/data';
import { designSources, workspacePrompt, workspaceSchema } from './generation';
import type { AgentInfo, AgentStatus } from './client';

it.skipIf(process.env.REA_WORKSPACE_SMOKE !== '1')('edits a real Codex file workspace and validates live source snapshots', async () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const child = spawn('cargo', ['run', '--quiet', '-p', 'rea-local-agent'], { cwd: root, stdio: 'pipe' });
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let sequence = 0, jobId = '';
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    const value = JSON.parse(line), target = pending.get(value.id);
    if (!target) return;
    pending.delete(value.id);
    if (value.error) target.reject(new Error(value.error)); else target.resolve(value.result);
  });
  child.stderr.on('data', data => process.stderr.write(data));
  const request = <T>(method: string, payload: unknown = {}) => new Promise<T>((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve: value => resolve(value as T), reject });
    child.stdin.write(`${JSON.stringify({ id, method, payload })}\n`);
  });
  try {
    const info = await request<AgentInfo>('detect'); expect(info.loggedIn).toBe(true);
    const document = emptyDocument('AI 文件工作区验证');
    let session = new DocumentSession(document.files), liveUpdates = 0, signature = '';
    const prompt = workspacePrompt('设计一个中文登录页，1440×1024，10–20 个图层。必须分两次保存：先完成画框和标题并立即写入页面，再完成表单和按钮后第二次保存。保留现有 Page designId，使用静态设计原语。', builtInSystems[0], null, '', '', document.files);
    jobId = (await request<{ id: string }>('start', { prompt, schema: workspaceSchema, files: designSources(document.files) })).id;
    const started = Date.now();
    for (;;) {
      const status = await request<AgentStatus>('status', { id: jobId });
      if (status.preview && !status.previewError && JSON.stringify(status.preview) !== signature) {
        signature = JSON.stringify(status.preview);
        try {
          const next = session.replaceSources(designSources(status.preview), 'AI 设计', 'smoke-turn');
          if (status.state === 'running' && next.rev !== session.rev) liveUpdates++;
          session = next;
        } catch { /* An incomplete intermediate file must never publish. */ }
      }
      if (status.state === 'failed' || status.state === 'cancelled') throw new Error(status.error ?? status.state);
      if (status.state === 'completed') {
        expect(status.previewError).toBeNull();
        expect(status.preview).toBeTruthy();
        new DocumentSession(status.preview!);
        expect(session.pages.get('main')!.page.nodes.size).toBeGreaterThan(8);
        expect(liveUpdates).toBeGreaterThan(0);
        expect(session.past).toHaveLength(1);
        expect(session.undo().files).toEqual(document.files);
        const output = `${root}/test-results/agent-workspace/real-codex`;
        await mkdir(output, { recursive: true });
        await writeFile(`${output}/Live_Workspace.reaui`, await exportReaui({ files: { ...session.files } }));
        await writeFile(`${output}/result.json`, JSON.stringify({ liveUpdates, layers: session.pages.get('main')!.page.nodes.size, summary: status.result }, null, 2));
        console.log(`Real Codex: ${liveUpdates} live source updates, ${session.pages.get('main')!.page.nodes.size} editable layers`);
        break;
      }
      if (Date.now() - started > 240_000) throw new Error('真实 Agent 验证超时。');
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  } finally {
    if (jobId) await request('cancel', { id: jobId }).catch(() => {});
    child.stdin.end(); lines.close();
  }
}, 260_000);
