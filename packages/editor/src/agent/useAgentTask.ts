import { useEffect, useRef, useState } from 'react';
import { agentRequest } from './client';
import type { AgentConfig, AgentStatus } from './client';

export function useAgentTask() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [running, setRunning] = useState(false);
  const active = useRef<{ id?: string; cancelled: boolean } | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; const task = active.current; if (task) { task.cancelled = true; if (task.id) void agentRequest('cancel', { id: task.id }).catch(() => {}); } }; }, []);
  async function cancel() {
    const task = active.current;
    if (!task) return;
    task.cancelled = true;
    if (task.id) { const next = await agentRequest<AgentStatus>('cancel', { id: task.id }); if (mounted.current) setStatus(next); }
  }
  async function generate(prompt: string, schema: unknown, config: AgentConfig, projectPath = '', workspace?: { files: Record<string, string>; onStatus: (status: AgentStatus) => void }): Promise<unknown> {
    if (active.current) throw new Error('请等待当前生成完成。');
    const task = { cancelled: false, id: undefined as string | undefined }; active.current = task;
    setRunning(true); setStatus({ id: '', state: 'running', events: ['正在启动 Codex CLI…'], result: null, error: null });
    try {
      const { id } = await agentRequest<{ id: string }>('start', { ...config, projectPath, prompt, schema, ...(workspace ? { files: workspace.files } : {}) }); task.id = id;
      if (task.cancelled) await agentRequest('cancel', { id });
      while (true) {
        const next = await agentRequest<AgentStatus>('status', { id });
        if (task.cancelled || !mounted.current) { await agentRequest('cancel', { id }); throw new Error('已取消生成。'); }
        if (mounted.current) setStatus(next);
        workspace?.onStatus(next);
        if (next.state === 'completed') { if (task.cancelled) throw new Error('已取消生成。'); return next.result; }
        if (next.state === 'cancelled') throw new Error('已取消生成。');
        if (next.state === 'failed') throw new Error(next.error || 'Codex 生成失败，请重试。');
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (error) {
      if (task.id) await agentRequest('cancel', { id: task.id }).catch(() => {});
      throw error;
    } finally { active.current = null; if (mounted.current) setRunning(false); }
  }
  return { status, running, generate, cancel };
}
