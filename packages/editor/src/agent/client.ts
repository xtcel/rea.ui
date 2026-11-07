import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from '../platform';

/** API 提供商目标，由本地 Agent 直接发起 HTTP 请求。 */
export interface ApiTarget { name: string; protocol: 'openai' | 'anthropic' | 'gemini'; baseUrl: string; model: string; apiKey: string }
export interface AgentConfig { executable: string; model: string; command?: string; name?: string; provider?: ApiTarget }
export interface AgentInfo { path: string; version: string; loggedIn: boolean | null }
export interface ProjectContext { path: string; name: string; files: string[]; context: string; truncated: boolean }
export interface AgentStatus { id: string; state: 'running' | 'completed' | 'cancelled' | 'failed'; events: string[]; result: unknown; error: string | null; preview?: Record<string, string> | null; previewError?: string | null }
export const defaultAgentConfig: AgentConfig = { executable: '', model: '' };
export function isAgentConfig(v: unknown): v is AgentConfig {
  if (!v || typeof v !== 'object') return false;
  const config = v as Partial<AgentConfig>;
  if (typeof config.executable !== 'string' || typeof config.model !== 'string') return false;
  if (config.command !== undefined && typeof config.command !== 'string') return false;
  if (config.name !== undefined && typeof config.name !== 'string') return false;
  if (config.provider === undefined) return true;
  const provider = config.provider as Partial<ApiTarget>;
  return !!provider && typeof provider.protocol === 'string' && ['openai', 'anthropic', 'gemini'].includes(provider.protocol) &&
    typeof provider.baseUrl === 'string' && typeof provider.model === 'string' && typeof provider.apiKey === 'string';
}
export async function agentRequest<T>(method: string, payload: unknown = {}): Promise<T> {
  if (isDesktop()) return invoke<T>('local_agent_request', { method, payload });
  let response: Response;
  try { response = await fetch('/__rea/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, payload }) }); }
  catch { throw new Error('无法连接本地 Agent。请使用桌面版，或在本机运行 pnpm dev。'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('当前环境没有本地 Agent 桥接。请使用桌面版，或在本机运行 pnpm dev。');
  const value = await response.json() as { result: T; error?: string };
  if (!response.ok || value.error) throw new Error(value.error || '本地 Agent 请求失败。');
  return value.result;
}
export async function selectProject(): Promise<string | null> {
  if (!isDesktop()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const path = await open({ directory: true, multiple: false, title: '关联本地项目代码' });
  return typeof path === 'string' ? path : null;
}
