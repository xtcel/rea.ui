import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { DocumentSession } from '@rea/document';
import { exportReaui } from '@rea/storage';
import { attachmentContext, generatedDocument, uiPrompt, uiSchema } from './generation';
import { agentSystem, parseGeneratedSystem, systemSchema } from './designSystem';
import type { AgentInfo, AgentStatus, ProjectContext } from './client';

it.skipIf(process.env.REA_CODEX_SMOKE !== '1')('generates a design system and editable UI with real local Codex and ReaUI_App.reaui', async () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const child = spawn('cargo', ['run', '--quiet', '-p', 'rea-local-agent'], { cwd: root, stdio: 'pipe' });
  let sequence = 0;
  const requests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    const message = JSON.parse(line); const request = requests.get(message.id); if (!request) return;
    requests.delete(message.id); if (message.error) request.reject(new Error(message.error)); else request.resolve(message.result);
  });
  child.stderr.on('data', bytes => process.stderr.write(bytes));
  const request = <T>(method: string, payload: unknown = {}) => new Promise<T>((resolve, reject) => {
    const id = ++sequence; requests.set(id, { resolve: value => resolve(value as T), reject });
    child.stdin.write(`${JSON.stringify({ id, method, payload })}\n`);
  });
  async function generate(prompt: string, schema: unknown): Promise<unknown> {
    const { id } = await request<{ id: string }>('start', { prompt, schema, projectPath: root });
    let lastEvent = '';
    for (;;) {
      const job = await request<AgentStatus>('status', { id });
      const event = job.events.at(-1) ?? '';
      if (event !== lastEvent) { console.log(event); lastEvent = event; }
      if (job.state === 'completed') return job.result;
      if (job.state === 'failed' || job.state === 'cancelled') throw new Error(job.error ?? job.state);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  try {
    const info = await request<AgentInfo>('detect'); expect(info.loggedIn).toBe(true); console.log(info.version);
    const context = await request<ProjectContext>('project', { path: root }); expect(context.files).toContain('DESIGN.md');
    const systemResult = await generate(`提取 REA UI 项目的设计系统。仅输出 JSON，不修改文件。使用中文，颜色六位 hex，fontSize 10-32、spacing 2-24、radius 0-40，组件覆盖按钮、输入框、卡片与导航。名称为 REA UI 本地生成。参考：${context.context}`, systemSchema);
    const system = parseGeneratedSystem(systemResult, root); system.published = true;
    const reference = await attachmentContext([new File([await readFile(`${root}/ReaUI_App.reaui`)], 'ReaUI_App.reaui')]);
    const result = await generate(uiPrompt('参考 REA UI 应用设计稿，为 REA UI 设计一个 1440×1024 的「AI 设计任务」工作台页面：左侧导航、顶部标题与新建任务按钮、一个设计需求输入区、三个最近任务列表。选择设计系统和关联本地项目的入口必须清晰。仅一页，约 40-65 个图层，保持参考稿紧凑清晰的风格。', agentSystem(system), context, reference), uiSchema);
    const generated = generatedDocument(result);
    const session = new DocumentSession(generated.document.files);
    expect(session.pages.size).toBe(1);
    const first = [...session.pages.values()][0];
    expect(first.page.nodes.size).toBeGreaterThan(12);
    const bytes = await exportReaui(generated.document);
    const output = `${root}/examples/ai-generated`;
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/Codex_Workspace.reaui`, bytes);
    await writeFile(`${output}/design-system.json`, `${JSON.stringify(system, null, 2)}\n`);
    await writeFile(`${output}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Saved ${first.page.nodes.size} editable layers to examples/ai-generated/Codex_Workspace.reaui`);
  } finally { child.stdin.end(); lines.close(); }
}, 660_000);
