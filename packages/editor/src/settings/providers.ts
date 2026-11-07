import type { AgentConfig } from '../agent/client';
import { readStored, writeStored } from '../home/data';

/** 本地 CLI 类型。`custom` 由用户填写命令与绝对路径。 */
export type CliKind = 'codex' | 'claude' | 'gemini' | 'custom';
/** HTTP 协议族：OpenAI 兼容、Anthropic Messages、Google Gemini。 */
export type ApiProtocol = 'openai' | 'anthropic' | 'gemini';

export interface CliProvider {
  id: string;
  kind: CliKind;
  name: string;
  /** PATH 中的可执行文件名称，例如 codex。 */
  command: string;
  /** 可选的绝对路径，优先于 `command`。 */
  executable: string;
  model: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  protocol: ApiProtocol;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface ProvidersState {
  /** 当前使用的提供商 `${cli|api}:${id}`。 */
  activeId: string;
  cli: CliProvider[];
  api: ApiProvider[];
}

export const CLI_PRESETS: CliProvider[] = [
  { id: 'cli:codex', kind: 'codex', name: 'Codex CLI', command: 'codex', executable: '', model: '' },
  { id: 'cli:claude', kind: 'claude', name: 'Claude Code', command: 'claude', executable: '', model: '' },
  { id: 'cli:gemini', kind: 'gemini', name: 'Gemini CLI', command: 'gemini', executable: '', model: '' },
  { id: 'cli:custom', kind: 'custom', name: '自定义 CLI', command: '', executable: '', model: '' },
];

export const API_PRESETS: ApiProvider[] = [
  { id: 'api:openai', name: 'OpenAI', protocol: 'openai', baseUrl: 'https://api.openai.com/v1', model: '', apiKey: '' },
  { id: 'api:anthropic', name: 'Anthropic', protocol: 'anthropic', baseUrl: 'https://api.anthropic.com', model: '', apiKey: '' },
  { id: 'api:gemini', name: 'Google Gemini', protocol: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com', model: '', apiKey: '' },
  { id: 'api:deepseek', name: 'DeepSeek', protocol: 'openai', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKey: '' },
  { id: 'api:qwen', name: '通义千问', protocol: 'openai', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: '', apiKey: '' },
  { id: 'api:zhipu', name: '智谱 GLM', protocol: 'openai', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: '', apiKey: '' },
  { id: 'api:moonshot', name: 'Moonshot Kimi', protocol: 'openai', baseUrl: 'https://api.moonshot.cn/v1', model: '', apiKey: '' },
  { id: 'api:ollama', name: 'Ollama 本地', protocol: 'openai', baseUrl: 'http://127.0.0.1:11434/v1', model: '', apiKey: '' },
  { id: 'api:custom', name: '自定义 API', protocol: 'openai', baseUrl: '', model: '', apiKey: '' },
];

export const PROVIDERS_KEY = 'providers';
const LEGACY_AGENT_KEY = 'agent';

export function defaultProviders(): ProvidersState {
  return { activeId: 'cli:codex', cli: CLI_PRESETS.map(item => ({ ...item })), api: API_PRESETS.map(item => ({ ...item })) };
}

export function providerTarget(state: ProvidersState): { type: 'cli'; provider: CliProvider } | { type: 'api'; provider: ApiProvider } | null {
  for (const provider of state.cli) if (provider.id === state.activeId) return { type: 'cli', provider };
  for (const provider of state.api) if (provider.id === state.activeId) return { type: 'api', provider };
  return null;
}

/** 本机接口可以不填密钥（例如 Ollama）。 */
const LOCAL_HOST = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i;

export function isApiTargetReady(target: { baseUrl: string; model: string; apiKey: string }): boolean {
  return !!(target.baseUrl.trim() && target.model.trim() && (target.apiKey.trim() || LOCAL_HOST.test(target.baseUrl.trim())));
}

export function isCliReady(provider: CliProvider): boolean {
  return !!(provider.executable.trim() || provider.command.trim());
}

export function isApiReady(provider: ApiProvider): boolean {
  return isApiTargetReady(provider);
}

/** 把配置解析为生成请求使用的 Agent 配置。 */
export function resolveAgentConfig(state: ProvidersState): AgentConfig {
  const target = providerTarget(state);
  if (!target) return { executable: '', model: '' };
  if (target.type === 'cli') {
    const provider = target.provider;
    return { executable: provider.executable.trim(), command: provider.command.trim() || undefined, name: provider.name, model: provider.model.trim() };
  }
  const provider = target.provider;
  return {
    executable: '',
    model: provider.model.trim(),
    provider: { name: provider.name, protocol: provider.protocol, baseUrl: provider.baseUrl.trim(), model: provider.model.trim(), apiKey: provider.apiKey.trim() },
  };
}
function text(value: unknown, max: number): value is string { return typeof value === 'string' && value.length <= max; }
function protocol(value: unknown): value is ApiProtocol { return value === 'openai' || value === 'anthropic' || value === 'gemini'; }
function kind(value: unknown): value is CliKind { return value === 'codex' || value === 'claude' || value === 'gemini' || value === 'custom'; }

function isCliProvider(value: unknown): value is CliProvider {
  const item = value as Partial<CliProvider> | null;
  return !!item && typeof item === 'object' && text(item.id, 64) && text(item.name, 80) && kind(item.kind) &&
    text(item.command, 200) && text(item.executable, 4000) && text(item.model, 160);
}
function isApiProvider(value: unknown): value is ApiProvider {
  const item = value as Partial<ApiProvider> | null;
  return !!item && typeof item === 'object' && text(item.id, 64) && text(item.name, 80) && protocol(item.protocol) &&
    text(item.baseUrl, 2000) && text(item.model, 160) && text(item.apiKey, 4000);
}
export function isProvidersState(value: unknown): value is ProvidersState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<ProvidersState>;
  return typeof state.activeId === 'string' && Array.isArray(state.cli) && Array.isArray(state.api) &&
    state.cli.every(isCliProvider) && state.api.every(isApiProvider);
}

/** 保留已保存的取值，同时补齐新增的预设项。 */
function merge(saved: ProvidersState): ProvidersState {
  const keep = <T extends { id: string }>(presets: T[], items: T[]): T[] => [
    ...presets.map(preset => ({ ...preset, ...(items.find(item => item.id === preset.id) ?? {}) })),
    ...items.filter(item => !presets.some(preset => preset.id === item.id)),
  ];
  const merged: ProvidersState = { activeId: saved.activeId, cli: keep(CLI_PRESETS, saved.cli), api: keep(API_PRESETS, saved.api) };
  if (!providerTarget(merged)) merged.activeId = 'cli:codex';
  return merged;
}

export function loadProviders(): ProvidersState {
  const stored = readStored<ProvidersState>(PROVIDERS_KEY, defaultProviders(), isProvidersState);
  const merged = merge(stored);
  // 旧版本只有 Codex 的一组配置，迁移为 CLI 提供商的初始值。
  const legacy = readStored<AgentConfig>(LEGACY_AGENT_KEY, { executable: '', model: '' }, (value): value is AgentConfig => {
    const item = value as Partial<AgentConfig> | null;
    return !!item && typeof item === 'object' && typeof item.executable === 'string' && typeof item.model === 'string';
  });
  if (legacy.executable.trim() || legacy.model.trim()) {
    const codex = merged.cli.find(item => item.id === 'cli:codex');
    if (codex && !codex.executable && !codex.model) {
      merged.cli = merged.cli.map(item => item.id === 'cli:codex' ? { ...item, executable: legacy.executable, model: legacy.model } : item);
    }
  }
  return merged;
}

export function saveProviders(state: ProvidersState): boolean {
  const saved = writeStored(PROVIDERS_KEY, state);
  // 兼容仍在读取 rea-home:agent 的旧入口。
  const config = resolveAgentConfig(state);
  writeStored(LEGACY_AGENT_KEY, { executable: config.executable, model: config.model });
  return saved && notifyProvidersChanged();
}

/** 设置窗口与主窗口是两份运行时状态，用广播与存储事件保持同步。 */
const CHANNEL_NAME = 'rea-settings';
const CHANGE_EVENT = 'rea:providers';
let channel: BroadcastChannel | null = null;

function broadcast(): BroadcastChannel | null {
  if (channel) return channel;
  try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { channel = null; }
  return channel;
}

export function notifyProvidersChanged(): boolean {
  try { broadcast()?.postMessage('providers'); } catch { /* 广播不可用时仍会写存储。 */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  return true;
}

export function subscribeProviders(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  let disposed = false;
  const emit = () => { if (!disposed) listener(); };
  const onStorage = (event: StorageEvent) => { if (event.key === `rea-home:${PROVIDERS_KEY}` || event.key === 'rea-theme' || event.key === 'rea-home:preferences') emit(); };
  const onFocus = () => emit();
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', onFocus);
  window.addEventListener(CHANGE_EVENT, emit);
  const bus = broadcast();
  const onMessage = () => emit();
  try { bus?.addEventListener('message', onMessage); } catch { /* 忽略不支持 message 的实现。 */ }
  return () => {
    disposed = true;
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener(CHANGE_EVENT, emit);
    try { bus?.removeEventListener('message', onMessage); } catch { /* noop */ }
  };
}

/** 生成前读取一次，避免使用另一个窗口尚未同步的内存副本。 */
export function currentAgentConfig(): AgentConfig {
  try { return resolveAgentConfig(loadProviders()); }
  catch { return { executable: '', model: '' }; }
}
