import { useState } from 'react';
import { Check, LoaderCircle, RefreshCw, Terminal } from 'lucide-react';
import { agentRequest } from './client';
import type { AgentConfig, AgentInfo } from './client';

export function AgentSettings({ config, onChange }: { config: AgentConfig; onChange: (config: AgentConfig) => void }) {
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  async function check() {
    setChecking(true); setError(''); setInfo(null);
    try { setInfo(await agentRequest<AgentInfo>('detect', { executable: config.executable })); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setChecking(false); }
  }
  return <section className="agent-settings"><h2><Terminal size={17} />本地 AI Agent</h2>
    <div className="home-setting-row"><div><strong>Codex CLI</strong><p>使用本机 Codex 的登录和配置生成可编辑设计。</p></div><button type="button" className="home-secondary-button" disabled={checking} onClick={() => void check()}>{checking ? <LoaderCircle size={14} /> : <RefreshCw size={14} />}{checking ? '检测中…' : '检测连接'}</button></div>
    <label className="agent-setting-field">可执行文件路径<input value={config.executable} onChange={e => { onChange({ ...config, executable: e.currentTarget.value }); setInfo(null); }} placeholder="自动查找 codex，或填写绝对路径" /></label>
    <label className="agent-setting-field">模型<input value={config.model} maxLength={160} onChange={e => onChange({ ...config, model: e.currentTarget.value.trim() })} placeholder="留空使用 Codex 配置中的默认模型" /></label>
    <p className="home-field-hint">首次使用请在终端运行 <code>codex login</code>。模型名称需为当前 Codex 账号可用的模型。</p>
    {info && <div className={`agent-connection ${info.loggedIn ? 'is-connected' : ''}`} role="status"><Check size={15} /><div><strong>{info.version} · {info.loggedIn ? '已登录，可以生成' : '尚未登录，请先运行 codex login'}</strong><small>{info.path}</small></div></div>}
    {error && <p className="home-inline-error" role="alert">{error}</p>}
  </section>;
}
