import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, Cpu, Info, KeyRound, LoaderCircle, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { agentRequest } from '../agent/client';
import type { AgentInfo, ProjectContext } from '../agent/client';
import { ProjectDialog } from '../agent/ProjectDialog';
import { defaultPreferences, isPreferences, readStored, writeStored } from '../home/data';
import type { Preferences } from '../home/data';
import { isDesktop } from '../platform';
import { useTheme } from '../session/theme';
import type { ThemePreference } from '../session/theme';
import { loadProviders, notifyProvidersChanged, saveProviders } from './providers';
import type { ApiProvider, CliProvider, ProvidersState } from './providers';

type Page = 'models' | 'general' | 'about';
type Check = { state: 'busy' | 'ok' | 'error'; text: string };

const PAGES: { id: Page; label: string; icon: typeof Cpu }[] = [
  { id: 'models', label: '模型与提供商', icon: Cpu },
  { id: 'general', label: '通用', icon: SlidersHorizontal },
  { id: 'about', label: '关于', icon: Info },
];

const COPY: Record<Page, { title: string; lead: string }> = {
  models: { title: '模型与提供商', lead: '选择生成本地设计时使用的模型。' },
  general: { title: '通用', lead: '调整工作空间的外观与操作习惯。' },
  about: { title: '关于', lead: '关于这个工作空间。' },
};

const VERSION = '0.1.0';

function platformName(): string {
  const platform = navigator.platform || navigator.userAgent;
  if (/mac/i.test(platform)) return 'macOS';
  if (/win/i.test(platform)) return 'Windows';
  if (/linux/i.test(platform)) return 'Linux';
  return platform;
}

/** 支持 #settings/general 这类深链，刷新后停留在同一页。 */
function pageFromHash(): Page {
  const value = location.hash.split('/')[1] ?? '';
  return value === 'general' || value === 'about' ? value : 'models';
}

function Row({ open, name, badge, meta, dot, onToggle, children }: {
  open: boolean; name: string; badge?: string; meta: string; dot: 'ready' | 'idle' | 'error'; onToggle: () => void; children: ReactNode;
}) {
  return <div className={`rs-row ${open ? 'is-open' : ''}`}>
    <button type="button" className="rs-row-head" aria-expanded={open} onClick={onToggle}>
      <span className={`rs-dot is-${dot}`} aria-hidden="true" />
      <span className="rs-row-title">{name}{badge && <em className="rs-badge">{badge}</em>}</span>
      <span className="rs-row-meta">{meta}</span>
      <ChevronDown size={14} className="rs-row-chevron" />
    </button>
    {open && <div className="rs-row-body">{children}</div>}
  </div>;
}

export function SettingsApp({ onClose }: { onClose?: () => void }) {
  const theme = useTheme();
  const [page, setPage] = useState<Page>(pageFromHash);
  const [providers, setProviders] = useState<ProvidersState>(loadProviders);
  const [preferences, setPreferences] = useState<Preferences>(() => readStored('preferences', defaultPreferences, isPreferences));
  const [open, setOpen] = useState('');
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [error, setError] = useState('');
  const [directory, setDirectory] = useState(false);

  useEffect(() => { document.title = '设置 · REA UI'; }, []);
  useEffect(() => {
    const sync = () => setPage(pageFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  function select(next: Page) {
    setPage(next);
    history.replaceState(null, '', `#settings/${next}`);
    document.querySelector('.rs-body')?.scrollTo(0, 0);
  }

  const ready = useMemo(() => new Map([
    ...providers.cli.map(provider => [provider.id, !!(provider.executable.trim() || provider.command.trim())] as const),
    ...providers.api.map(provider => [provider.id, !!(provider.baseUrl.trim() && provider.model.trim())] as const),
  ]), [providers]);

  function commit(next: ProvidersState) {
    setProviders(next);
    if (!saveProviders(next)) setError('无法保存配置，请检查本地存储权限。');
  }
  function patchCli(id: string, patch: Partial<CliProvider>) {
    commit({ ...providers, cli: providers.cli.map(item => item.id === id ? { ...item, ...patch } : item) });
  }
  function patchApi(id: string, patch: Partial<ApiProvider>) {
    commit({ ...providers, api: providers.api.map(item => item.id === id ? { ...item, ...patch } : item) });
  }
  function updatePreference(patch: Partial<Preferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    if (!writeStored('preferences', next)) setError('无法保存设置，请检查本地存储权限。');
    notifyProvidersChanged();
    window.dispatchEvent(new CustomEvent('rea:preferences'));
  }

  async function detectCli(provider: CliProvider) {
    setChecks(current => ({ ...current, [provider.id]: { state: 'busy', text: '正在检测…' } }));
    try {
      const info = await agentRequest<AgentInfo>('detect', { executable: provider.executable, command: provider.command, kind: provider.kind });
      const login = info.loggedIn === null ? '可执行' : info.loggedIn ? '已登录' : '尚未登录';
      setChecks(current => ({ ...current, [provider.id]: { state: info.loggedIn === false ? 'error' : 'ok', text: `${info.version} · ${login}` } }));
    } catch (error) {
      setChecks(current => ({ ...current, [provider.id]: { state: 'error', text: error instanceof Error ? error.message : String(error) } }));
    }
  }
  async function testApi(provider: ApiProvider) {
    setChecks(current => ({ ...current, [provider.id]: { state: 'busy', text: '正在连接…' } }));
    try {
      const result = await agentRequest<{ message: string }>('test', { provider });
      setChecks(current => ({ ...current, [provider.id]: { state: 'ok', text: result.message } }));
    } catch (error) {
      setChecks(current => ({ ...current, [provider.id]: { state: 'error', text: error instanceof Error ? error.message : String(error) } }));
    }
  }

  const target = providers.cli.find(item => item.id === providers.activeId) ?? providers.api.find(item => item.id === providers.activeId);

  return <div className="rs-shell">
    <aside className="rs-nav">
      <header className="rs-nav-head">
        <strong>设置</strong>
        {onClose && <button type="button" className="rs-icon-button" aria-label="关闭设置" title="关闭设置" onClick={onClose}><X size={16} /></button>}
      </header>
      <nav className="rs-nav-list" aria-label="设置分类">
        {PAGES.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`rs-nav-item ${page === id ? 'is-active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => select(id)}>
          <Icon size={16} /><span>{label}</span>
        </button>)}
      </nav>
      <footer className="rs-nav-foot">REA UI · v{VERSION}</footer>
    </aside>

    <main className="rs-main">
      <header className="rs-head"><h1>{COPY[page].title}</h1><p>{COPY[page].lead}</p></header>
      <div className="rs-body">
        {error && <div className="rs-error" role="alert"><span>{error}</span><button type="button" aria-label="关闭提示" onClick={() => setError('')}><X size={14} /></button></div>}

        {page === 'models' && <>
          <section className="rs-card">
            <div className="rs-active">
              <span className="rs-active-mark" aria-hidden="true">{target ? target.name.slice(0, 1) : '—'}</span>
              <div className="rs-active-text"><small>当前使用</small><strong>{target ? `${target.name}${target.model ? ` · ${target.model}` : ''}` : '未选择提供商'}</strong></div>
              <label className="rs-select"><select aria-label="当前使用的模型" value={providers.activeId} onChange={event => commit({ ...providers, activeId: event.currentTarget.value })}>
                <optgroup label="本地 CLI">{providers.cli.map(item => <option key={item.id} value={item.id}>{item.name}{ready.get(item.id) ? '' : '（未配置）'}</option>)}</optgroup>
                <optgroup label="API 提供商">{providers.api.map(item => <option key={item.id} value={item.id}>{item.name}{ready.get(item.id) ? '' : '（未配置）'}</option>)}</optgroup>
              </select><ChevronDown size={13} /></label>
            </div>
          </section>

          <section className="rs-section" aria-label="本地 CLI">
            <h2>本地 CLI</h2>
            <div className="rs-list">
              {providers.cli.map(provider => {
                const check = checks[provider.id];
                const isOpen = open === provider.id;
                return <Row key={provider.id} open={isOpen} name={provider.name} badge={providers.activeId === provider.id ? '使用中' : undefined}
                  meta={provider.executable || provider.command || '未配置'}
                  dot={providers.activeId === provider.id && ready.get(provider.id) ? 'ready' : check?.state === 'error' ? 'error' : 'idle'}
                  onToggle={() => setOpen(isOpen ? '' : provider.id)}>
                  <label>可执行文件路径<input value={provider.executable} maxLength={4000} spellCheck={false} placeholder={`例：/opt/homebrew/bin/${provider.command || 'my-agent'}`} onChange={event => patchCli(provider.id, { executable: event.currentTarget.value })} /></label>
                  {provider.kind === 'custom' && <label>命令名称<input value={provider.command} maxLength={200} spellCheck={false} placeholder="例：my-agent" onChange={event => patchCli(provider.id, { command: event.currentTarget.value })} /></label>}
                  <label>模型<input value={provider.model} maxLength={160} spellCheck={false} placeholder="例：gpt-5-codex" onChange={event => patchCli(provider.id, { model: event.currentTarget.value })} /></label>
                  <div className="rs-row-actions">
                    <button type="button" className="rs-secondary" disabled={!ready.get(provider.id) || check?.state === 'busy'} onClick={() => void detectCli(provider)}>{check?.state === 'busy' ? <LoaderCircle size={14} className="rs-spin" /> : <RefreshCw size={14} />}检测连接</button>
                    {providers.activeId !== provider.id && <button type="button" className="rs-secondary" disabled={!ready.get(provider.id)} onClick={() => commit({ ...providers, activeId: provider.id })}><Check size={14} />设为当前</button>}
                    {check && <span className={`rs-check is-${check.state}`} role="status">{check.text}</span>}
                  </div>
                </Row>;
              })}
            </div>
          </section>

          <section className="rs-section" aria-label="API 提供商">
            <h2>API 提供商</h2>
            <div className="rs-list">
              {providers.api.map(provider => {
                const check = checks[provider.id];
                const isOpen = open === provider.id;
                return <Row key={provider.id} open={isOpen} name={provider.name} badge={providers.activeId === provider.id ? '使用中' : undefined}
                  meta={provider.model ? `${provider.model} · ${provider.baseUrl.replace(/^https?:\/\//, '')}` : provider.baseUrl.replace(/^https?:\/\//, '') || '未配置'}
                  dot={providers.activeId === provider.id && ready.get(provider.id) && (provider.apiKey || /^http:\/\/(127\.0\.0\.1|localhost)/i.test(provider.baseUrl)) ? 'ready' : check?.state === 'error' ? 'error' : 'idle'}
                  onToggle={() => setOpen(isOpen ? '' : provider.id)}>
                  <label>接口地址<input value={provider.baseUrl} maxLength={2000} spellCheck={false} placeholder="例：https://api.openai.com/v1" onChange={event => patchApi(provider.id, { baseUrl: event.currentTarget.value })} /></label>
                  <div className="rs-row-grid">
                    <label>模型<input value={provider.model} maxLength={160} spellCheck={false} placeholder="例：gpt-5.1" onChange={event => patchApi(provider.id, { model: event.currentTarget.value })} /></label>
                    <label>API Key<input type="password" value={provider.apiKey} maxLength={4000} spellCheck={false} autoComplete="off" placeholder="例：sk-…" onChange={event => patchApi(provider.id, { apiKey: event.currentTarget.value })} /></label>
                  </div>
                  {provider.id === 'api:custom' && <label>协议<select value={provider.protocol} onChange={event => patchApi(provider.id, { protocol: event.currentTarget.value as ApiProvider['protocol'] })}><option value="openai">OpenAI 兼容</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select></label>}
                  <div className="rs-row-actions">
                    <button type="button" className="rs-secondary" disabled={!ready.get(provider.id) || check?.state === 'busy'} onClick={() => void testApi(provider)}>{check?.state === 'busy' ? <LoaderCircle size={14} className="rs-spin" /> : <KeyRound size={14} />}测试连接</button>
                    {providers.activeId !== provider.id && <button type="button" className="rs-secondary" disabled={!ready.get(provider.id)} onClick={() => commit({ ...providers, activeId: provider.id })}><Check size={14} />设为当前</button>}
                    {check && <span className={`rs-check is-${check.state}`} role="status">{check.text}</span>}
                  </div>
                </Row>;
              })}
            </div>
          </section>
        </>}

        {page === 'general' && <>
          <section className="rs-section" aria-label="外观">
            <h2>外观</h2>
            <div className="rs-group"><div className="rs-field-row"><div><strong>界面主题</strong></div><label className="rs-select"><select aria-label="界面主题" value={theme.preference} onChange={event => theme.setPreference(event.currentTarget.value as ThemePreference, event.currentTarget)}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select><ChevronDown size={13} /></label></div></div>
          </section>
          <section className="rs-section" aria-label="创作">
            <h2>创作</h2>
            <div className="rs-group">
              <div className="rs-field-row"><div><strong>发送快捷键</strong></div><label className="rs-select"><select aria-label="发送快捷键" value={preferences.sendKey} onChange={event => updatePreference({ sendKey: event.currentTarget.value as Preferences['sendKey'] })}><option value="enter">Enter 发送</option><option value="command">⌘ / Ctrl + Enter 发送</option></select><ChevronDown size={13} /></label></div>
              <div className="rs-field-row"><div><strong>显示标尺</strong></div><input type="checkbox" aria-label="显示标尺" checked={preferences.showRulers ?? false} onChange={event => updatePreference({ showRulers: event.currentTarget.checked })} /></div>
              <div className="rs-field-row"><div><strong>显示参考线</strong></div><input type="checkbox" aria-label="显示参考线" checked={preferences.showGuides ?? true} onChange={event => updatePreference({ showGuides: event.currentTarget.checked })} /></div>
            </div>
          </section>
          <section className="rs-section" aria-label="关联项目">
            <h2>关联项目代码</h2>
            <div className="rs-group"><div className="rs-field-row"><div><strong>{preferences.directory || '尚未关联本地项目'}</strong></div><button type="button" className="rs-secondary" onClick={() => setDirectory(true)}>{isDesktop() ? '浏览…' : '选择'}</button></div></div>
          </section>
        </>}

        {page === 'about' && <section className="rs-section" aria-label="关于">
          <div className="rs-about">
            <div className="rs-about-mark" aria-hidden="true">R</div>
            <div><strong>REA UI</strong><small>React 单源设计编辑器 · v{VERSION}</small></div>
          </div>
          <dl className="rs-about-list">
            <div><dt>运行平台</dt><dd>{isDesktop() ? `桌面版 · ${platformName()}` : `浏览器 · ${platformName()}`}</dd></div>
            <div><dt>文档格式</dt><dd>.reaui（ZIP）</dd></div>
            <div><dt>本地存储</dt><dd>项目保存在本地工作空间，可导出 .reaui 备份</dd></div>
            <div><dt>模型调用</dt><dd>{target ? `${target.name}${target.model ? ` · ${target.model}` : ''}` : '未配置'}</dd></div>
          </dl>
        </section>}
      </div>
    </main>

    {directory && <ProjectDialog project={null} initialPath={preferences.directory} onSelect={(next: ProjectContext | null) => { updatePreference({ directory: next?.path ?? '' }); setDirectory(false); }} onClose={() => setDirectory(false)} />}
  </div>;
}
