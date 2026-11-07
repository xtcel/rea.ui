import { useEffect, useRef, useState } from 'react';import type { FormEvent, MouseEventHandler, ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronRight, ChevronsUpDown, Clock3, FileText, Folder, House, LayoutGrid, LayoutTemplate, List, LoaderCircle, Menu, Moon, Plus, Search, Settings2, Shapes, SlidersHorizontal, Sun, X } from 'lucide-react';
import type { DocumentSummary } from '@rea/storage';
import { EditorWorkspace } from '../EditorApp';
import { useDocument } from '../session/useDocument';
import { Dialog } from '../ui';
import { builtInSystems, defaultPreferences, isPreferences, isSystems, readStored, relativeDate, templates, writeStored } from './data';
import type { DesignSystem, Preferences, Section, View } from './data';
import { ProjectPreview, SystemPreview } from './Previews';
import { HomeComposer, ReferenceProjectsDialog } from './HomeComposer';
import { listenForOpenedFiles } from '../platform';
import { SettingsApp } from '../settings/SettingsApp';
import { openSettingsWindow } from '../settings/window';
import { loadProviders, notifyProvidersChanged, resolveAgentConfig, subscribeProviders } from '../settings/providers';
import { useTheme } from '../session/theme';
import { ProjectDialog } from '../agent/ProjectDialog';
import { SystemWorkbench } from '../agent/SystemWorkbench';
import { agentRequest } from '../agent/client';
import type { ProjectContext } from '../agent/client';
import { defaultTokens, resolvedSystem, withTokens } from '../agent/designSystem';
import { DesignAgentPanel } from '../agent/DesignAgentPanel';
import type { DesignRequest } from '../agent/DesignAgentPanel';

const navigation: { id: Section; label: string; icon: typeof House }[] = [
  { id: 'home', label: '首页', icon: House }, { id: 'projects', label: '全部项目', icon: Folder },
  { id: 'systems', label: '设计系统', icon: Shapes }, { id: 'templates', label: '模板', icon: LayoutTemplate },
];

function IconControl({ label, children, onClick, pressed }: { label: string; children: ReactNode; onClick: MouseEventHandler<HTMLButtonElement>; pressed?: boolean }) {
  return <button type="button" className="home-icon-button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>{children}</button>;
}
function SelectControl({ label, value, onChange, children, icon }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; icon?: ReactNode }) {
  return <label className="home-select" title={label}>{icon}<select aria-label={label} value={value} onChange={event => onChange(event.currentTarget.value)}>{children}</select><ChevronDown size={12} /></label>;
}

export function HomeApp() {
  const model = useDocument();
  const theme = useTheme();
  const [section, setSection] = useState<Section>('home');
  const [inEditor, setInEditor] = useState(false);
  const latestModel = useRef(model);
  latestModel.current = model;
  const ready = !!model.current;
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    let disposed = false;
    let stop: (() => void) | undefined;
    void listenForOpenedFiles(async file => {
      await latestModel.current.importFile(file);
      setInEditor(true);
    }, message => { setError(message); latestModel.current.setNotice(message); }, controller.signal).then(unlisten => {
      if (disposed) unlisten(); else stop = unlisten;
    }).catch(error => { const message = `文件打开初始化失败：${String(error)}`; setError(message); latestModel.current.setNotice(message); });
    return () => { disposed = true; controller.abort(); stop?.(); };
  }, [ready]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>(() => readStored('recent-projects', [], (value): value is string[] => Array.isArray(value) && value.every(id => typeof id === 'string')));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [views, setViews] = useState<Record<'projects' | 'systems', View>>(() => readStored('views', { projects: 'grid', systems: 'grid' }, (v): v is Record<'projects' | 'systems', View> => !!v && typeof v === 'object' && 'projects' in v && 'systems' in v && ['grid', 'list'].includes(String(v.projects)) && ['grid', 'list'].includes(String(v.systems))));
  const [preferences, setPreferences] = useState(() => readStored('preferences', defaultPreferences, isPreferences));
  const [customSystems, setCustomSystems] = useState<DesignSystem[]>(() => readStored('systems', [], isSystems));
  const [selectedSystem, setSelectedSystem] = useState(() => readStored('selected-system', 'rea', (v): v is string => typeof v === 'string'));
  const [agentConfig, setAgentConfig] = useState(() => resolveAgentConfig(loadProviders()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => subscribeProviders(() => {
    // 设置窗口改动后同步当前窗口：提供商、创作偏好与当前模型。
    setAgentConfig(resolveAgentConfig(loadProviders()));
    setPreferences(current => {
      const next = readStored('preferences', defaultPreferences, isPreferences);
      return JSON.stringify(current) === JSON.stringify(next) ? current : next;
    });
  }), []);
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [preparing, setPreparing] = useState(false);
  const sending = useRef(false);
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [referenceProjects, setReferenceProjects] = useState<DocumentSummary[]>([]);
  const [designRequest, setDesignRequest] = useState<{ documentId: string; request: DesignRequest } | null>(null);
  const [dialog, setDialog] = useState<'project' | 'directory' | 'references' | null>(null);
  const [activeSystem, setActiveSystem] = useState<DesignSystem | null>(null);
  const [newName, setNewName] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLElement>(null);
  const systems = [...builtInSystems, ...customSystems];
  const currentSystem = systems.find(item => item.id === selectedSystem) ?? systems[0];
  const usableSystems = systems.filter(item => resolvedSystem(item).published);
  const activeNav = navigation.find(item => item.id === section)!;
  const recentDocuments = [...documents].sort((a, b) => {
    const first = recentIds.indexOf(a.id), second = recentIds.indexOf(b.id);
    return (first < 0 ? Infinity : first) - (second < 0 ? Infinity : second) || b.updatedAt.localeCompare(a.updatedAt);
  });

  useEffect(() => {
    const id = model.current?.manifest.id;
    if (!id) return;
    setRecentIds(previous => {
      if (previous[0] === id) return previous;
      const next = [id, ...previous.filter(item => item !== id)].slice(0, 20);
      writeStored('recent-projects', next); return next;
    });
  }, [model.current?.manifest.id]);
  useEffect(() => { writeStored('selected-system', selectedSystem); }, [selectedSystem]);
  useEffect(() => {
    if (!/^(\/|[a-z]:\\)/i.test(preferences.directory)) return;
    let active = true;
    void agentRequest<ProjectContext>('project', { path: preferences.directory }).then(p => { if (active) setProject(p); }).catch(() => {});
    return () => { active = false; };
  }, [preferences.directory]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void model.storage.listDocuments().then(items => { if (active) { setDocuments(items); setLoading(false); } }).catch(() => { if (active) { setError('无法读取本地项目，请刷新页面重试。'); setLoading(false); } });
    return () => { active = false; };
  }, [model.storage, model.current, inEditor]);
  useEffect(() => {
    const dialog = mobileDialog.current;
    if (mobileMenu && dialog && !dialog.open) dialog.showModal();
    if (!mobileMenu && dialog?.open) dialog.close();
    const closeOnDesktop = () => { if (window.innerWidth > 760) setMobileMenu(false); };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, [mobileMenu]);

  function navigate(next: Section) {
    setSection(next); setSearch(''); setSort('recent'); setMobileMenu(false); content.current?.scrollTo(0, 0);
  }
  async function openSettings() {
    setMobileMenu(false);
    if (await openSettingsWindow() === 'in-app') setSettingsOpen(true);
  }
  function updatePreferences(next: Partial<Preferences>) {
    const updated = { ...preferences, ...next }; setPreferences(updated);
    if (!writeStored('preferences', updated)) setError('浏览器未能保存设置；本次会话仍可继续使用。');
    window.dispatchEvent(new CustomEvent('rea:preferences'));
    notifyProvidersChanged();
  }
  function changeView(view: View) {
    if (section !== 'projects' && section !== 'systems') return;
    const next = { ...views, [section]: view }; setViews(next); writeStored('views', next);
  }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  function openProject(id: string) { setMobileMenu(false); void run(async () => { await model.open(id); setInEditor(true); }); }
  function showCreate(kind: 'project' | 'system') {
    if (kind === 'system') {
      navigate('systems');
      setActiveSystem(withTokens({ id: crypto.randomUUID(), name: '新设计系统', description: '', color: defaultTokens.primary, colors: [], published: false }, defaultTokens));
    } else { setNewName(''); setDialog('project'); }
  }
  function createProject(event: FormEvent) {
    event.preventDefault(); if (!newName.trim()) return;
    void run(async () => { await model.create(newName.trim()); setDialog(null); setInEditor(true); });
  }
  function saveSystem(system: DesignSystem) {
    const next = [...customSystems.filter(item => item.id !== system.id), system];
    if (!writeStored('systems', next)) throw new Error('未能保存设计系统，请检查本地存储后重试。');
    setCustomSystems(next); setActiveSystem(system);
    if (!system.published && selectedSystem === system.id) setSelectedSystem('rea');
  }
  async function send() {
    if (!prompt.trim() || sending.current || busy) return;
    sending.current = true; setPreparing(true);
    const text = prompt.trim();
    setError('');
    try {
      const document = await model.create(text.split('\n')[0].slice(0, 48));
      setDesignRequest({ documentId: document.id, request: { id: crypto.randomUUID(), text, attachments, references: referenceProjects, system: currentSystem, project } });
      setPrompt(''); setAttachments([]); setReferenceProjects([]); setInEditor(true);
    } catch (error) {
      const reply = error instanceof Error ? error.message : String(error);
      setError(reply);
    } finally { sending.current = false; setPreparing(false); }
  }
  function useTemplate(value: string) { navigate('home'); setPrompt(value); requestAnimationFrame(() => composer.current?.focus()); }

  async function openComponentAssets(){if(!model.current)return;await model.storage.setMeta('editor-open-assets',{documentId:model.current.manifest.id});setInEditor(true);}
  if (inEditor) return <EditorWorkspace model={model} onHome={() => { setDesignRequest(null); setInEditor(false); navigate('home'); }} agent={canvas => <DesignAgentPanel model={model} canvas={canvas} initialRequest={designRequest && designRequest.documentId === model.current?.manifest.id ? designRequest.request : undefined} config={agentConfig} systems={usableSystems} system={currentSystem} onSystem={setSelectedSystem} project={project} onProject={next => { setProject(next); updatePreferences({ directory: next?.path ?? '' }); }} sendKey={preferences.sendKey} />} />;

  const filteredDocuments = documents.filter(doc => doc.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'zh-CN') : b.updatedAt.localeCompare(a.updatedAt));
  const filteredSystems = systems.filter(system => `${system.name} ${system.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'zh-CN') : 0);
  const navContent = <>
    <div className="home-brand"><button type="button" onClick={() => navigate('home')} aria-label="REA UI 首页"><span className="home-wordmark">rea<span /></span><span className="home-brand-label">设计工作空间</span></button><span className="home-mobile-close"><IconControl label="关闭导航" onClick={() => setMobileMenu(false)}><X size={18} /></IconControl></span></div>
    <nav className="home-navigation" aria-label="主导航">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`home-nav-item ${section === id ? 'is-active' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === 'projects' && <span className="home-nav-count">{documents.length}</span>}</button>)}<button type="button" className="home-nav-item home-nav-settings" onClick={() => void openSettings()}><Settings2 size={18} /><span>设置</span></button></nav>
    <div className="home-recent-nav"><button type="button" className="home-recent-heading" aria-expanded={recentExpanded} aria-controls="home-sidebar-recents" onClick={() => setRecentExpanded(!recentExpanded)}><Clock3 size={15} /><span>最近项目</span><ChevronDown size={13} className={recentExpanded ? '' : 'is-collapsed'} /></button>{recentExpanded && <div id="home-sidebar-recents">{recentDocuments.slice(0, 5).map(doc => <button type="button" key={doc.id} disabled={busy} className="home-recent-item" onClick={() => openProject(doc.id)} title={doc.name}><FileText size={15} /><span>{doc.name}</span></button>)}{!documents.length && <p className="home-sidebar-empty">{loading ? '正在读取项目…' : '创建项目后会显示在这里'}</p>}</div>}</div>
    <button type="button" className="home-workspace-switch" onClick={() => void openSettings()}><span className="home-workspace-avatar">R</span><span><strong>本地工作空间</strong><small>你的灵感，保存在此</small></span><ChevronsUpDown size={14} /></button>
  </>;

  function projectCollection(items: DocumentSummary[], home = false) {
    const view = home ? 'grid' : views.projects;
    return <div className={`home-collection is-${view}`} aria-label={home ? '最近项目列表' : '项目列表'} aria-busy={loading || busy}>
      {items.map((doc, index) => <button type="button" className="home-project-card" key={doc.id} disabled={busy} onClick={() => openProject(doc.id)}>
        <ProjectPreview kind={index % 2 === 0 ? 'starter' : 'dashboard'} illustrative />
        <div className="home-card-info"><span className="home-card-title">{doc.name}</span><span className="home-card-description">{view === 'list' ? '本地项目 · 示意封面' : relativeDate(doc.updatedAt)}</span></div>
        {view === 'list' && <time className="home-list-time" dateTime={doc.updatedAt}>{relativeDate(doc.updatedAt)}</time>}
        <ArrowUpRight size={16} className="home-card-arrow" />
      </button>)}
      {home && <button type="button" className="home-new-project" onClick={() => showCreate('project')}><span><Plus size={23} /></span><strong>开始一个新项目</strong><small>把下一个想法变成现实</small></button>}
    </div>;
  }

  const composerUI = <HomeComposer inputRef={composer} prompt={prompt} onPrompt={setPrompt} onSend={() => void send()} onStop={() => {}} sendKey={preferences.sendKey} running={false} preparing={preparing} busy={busy} systems={usableSystems} selectedSystem={currentSystem.id} onSystem={setSelectedSystem} config={agentConfig} onAgentSettings={() => void openSettings()} project={project} onProject={() => setDialog('directory')} attachments={attachments} onAttach={() => attachmentInput.current?.click()} onRemoveAttachment={index => setAttachments(files => files.filter((_, i) => i !== index))} references={referenceProjects} onReferences={() => setDialog('references')} onRemoveReference={id => setReferenceProjects(items => items.filter(doc => doc.id !== id))} />;

  return <div className="home-shell">
    <a className="home-skip-link" href="#home-content">跳转到内容</a>
    <aside className="home-sidebar">{!mobileMenu && navContent}</aside>
    <dialog ref={mobileDialog} className="home-mobile-nav" aria-label="工作空间导航" onCancel={event => { event.preventDefault(); setMobileMenu(false); }} onClick={event => { if (event.target === event.currentTarget) setMobileMenu(false); }}><div className="home-mobile-nav-inner">{mobileMenu && navContent}</div></dialog>
    <div className="home-main"><header className="home-topbar"><span className="home-mobile-menu"><IconControl label="打开导航" onClick={() => setMobileMenu(true)}><Menu size={20} /></IconControl></span><span className="home-breadcrumb">工作空间<ChevronRight size={13} /><strong>{activeNav.label}</strong></span><span className="home-local-indicator"><i />本地工作空间</span><IconControl label={theme.resolved === 'dark' ? '切换到浅色模式' : '切换到深色模式'} onClick={event => theme.toggle(event.currentTarget)}>{theme.resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</IconControl></header>
      <main ref={content} id="home-content" className="home-content" tabIndex={-1}>
        {error && <div className="home-error" role="alert"><span>{error}</span><IconControl label="关闭错误提示" onClick={() => setError('')}><X size={16} /></IconControl></div>}
        {section === 'systems' && activeSystem ? <SystemWorkbench onOpenComponents={()=>void openComponentAssets()} key={activeSystem.id} system={activeSystem} config={agentConfig} project={project} onProject={() => setDialog('directory')} isBuiltIn={builtInSystems.some(s => s.id === activeSystem.id)} onClose={() => setActiveSystem(null)} onSave={saveSystem} onUse={system => { saveSystem(system); setSelectedSystem(system.id); setActiveSystem(null); navigate('home'); }} onDelete={customSystems.some(s => s.id === activeSystem.id) ? () => { const next = customSystems.filter(s => s.id !== activeSystem.id); if (!writeStored('systems', next)) { setError('无法保存删除操作，请重试。'); return; } setCustomSystems(next); if (selectedSystem === activeSystem.id) setSelectedSystem('rea'); setActiveSystem(null); } : undefined} /> : section === 'home' ? <div className="home-overview">
          <section className="home-idea" aria-labelledby="home-idea-title">
            <div className="home-idea-heading"><span className="home-idea-mark" aria-hidden="true"><Shapes size={25} strokeWidth={1.5} /></span><h1 id="home-idea-title">从一个想法，开始设计。</h1><p>说说你想创造什么，其余的我们一起完成。</p></div>
            {composerUI}
            {<div className="home-prompt-suggestions">{templates.map(template => <button type="button" key={template.id} onClick={() => { setPrompt(template.prompt); composer.current?.focus(); }}><LayoutTemplate size={13} /><span>{template.id === 'website' ? '设计一个产品官网' : template.id === 'dashboard' ? '搭建数据看板' : '创建移动端页面'}</span><ArrowUpRight size={12} /></button>)}</div>}
          </section>
          <section className="home-recent-projects" aria-labelledby="home-recent-title"><header className="home-section-heading"><div><h2 id="home-recent-title">最近项目</h2><p>继续上次的创作，或者开启新的可能。</p></div><button type="button" className="home-text-button" onClick={() => navigate('projects')}>全部项目 <ArrowRight size={14} /></button></header>{loading ? <div className="home-loading" role="status"><LoaderCircle size={17} />正在读取本地项目…</div> : projectCollection(recentDocuments.slice(0, 2), true)}</section>
          <footer className="home-overview-footer"><span>每个好设计，都始于一个想法。</span><span>REA UI</span></footer>
        </div> : <section className="home-library">
          <div className="home-page-heading"><div><h1>{activeNav.label}</h1><p>{section === 'projects' ? '把灵感留在这里，随时回来继续。' : section === 'systems' ? '用一致的设计语言，让每一次创作更从容。' : '从一个好的起点，开始你的下一个设计。'}</p></div>{section !== 'templates' && <button type="button" className="home-primary-button" disabled={busy} onClick={() => showCreate(section === 'systems' ? 'system' : 'project')}><Plus size={16} />{section === 'systems' ? '新建设计系统' : '新建项目'}</button>}</div>
          <div className="home-library-toolbar">{section==='systems'&&<button type="button" className="home-secondary-button" onClick={()=>void openComponentAssets()}>本地组件资源</button>}<label className="home-search"><Search size={16} /><input aria-label={`搜索${activeNav.label}`} placeholder={section === 'projects' ? '搜索项目…' : section === 'systems' ? '搜索设计系统…' : '搜索模板…'} value={search} onChange={event => setSearch(event.currentTarget.value)} />{search && <button type="button" aria-label="清空搜索" onClick={() => setSearch('')}><X size={14} /></button>}</label><div className="home-toolbar-right">{section !== 'templates' && <><SelectControl label="排序方式" value={sort} onChange={setSort} icon={<SlidersHorizontal size={13} />}><option value="recent">{section === 'projects' ? '最近更新' : '默认排序'}</option><option value="name">名称排序</option></SelectControl><span className="home-control-divider" /><div className="home-view-switch" role="group" aria-label="显示方式"><IconControl label="网格视图" pressed={views[section] === 'grid'} onClick={() => changeView('grid')}><LayoutGrid size={16} /></IconControl><IconControl label="列表视图" pressed={views[section] === 'list'} onClick={() => changeView('list')}><List size={17} /></IconControl></div></>}</div></div>
          <div className="home-library-count">{section === 'projects' ? `${filteredDocuments.length} 个项目` : section === 'systems' ? `${filteredSystems.length} 个设计系统` : '示例模板 · 点击填入设计需求'}</div>
          {section === 'projects' ? loading ? <div className="home-loading" role="status"><LoaderCircle size={18} />正在读取本地项目…</div> : filteredDocuments.length ? projectCollection(filteredDocuments) : <EmptyState search={search} label="项目" onClear={() => setSearch('')} onCreate={() => showCreate('project')} />
            : section === 'systems' ? filteredSystems.length ? <div className={`home-collection is-${views.systems}`} aria-label="设计系统列表">{filteredSystems.map(system => <button type="button" key={system.id} className="home-project-card home-system-card" onClick={() => setActiveSystem(system)}><SystemPreview system={system} /><div className="home-card-info"><span className="home-card-title">{system.name}{currentSystem.id === system.id && <span className="home-current-badge">当前使用</span>}</span><span className="home-card-description">{resolvedSystem(system).published ? system.description : `草稿 · ${system.description || '等待配置'}`}</span></div><ArrowUpRight className="home-card-arrow" size={16} /></button>)}</div> : <EmptyState search={search} label="设计系统" onClear={() => setSearch('')} onCreate={() => showCreate('system')} />
              : <div className="home-collection is-grid">{templates.filter(template => template.name.includes(search) || template.description.includes(search)).map(template => <button type="button" key={template.id} className="home-project-card" onClick={() => useTemplate(template.prompt)}><ProjectPreview kind={template.id} /><div className="home-card-info"><span className="home-card-title">{template.name}<span className="home-example-badge">示例</span></span><span className="home-card-description">{template.description}</span></div><ArrowUpRight className="home-card-arrow" size={16} /></button>)}{!templates.some(template => template.name.includes(search) || template.description.includes(search)) && <EmptyState search={search} label="模板" onClear={() => setSearch('')} />}</div>}
        </section>}
      </main>
    </div>
    <input ref={attachmentInput} hidden type="file" multiple accept=".reaui,.md,.txt,.css,.json,.tsx,.jsx,.ts,.js" aria-label="选择参考文件" onChange={event => { const files = Array.from(event.currentTarget.files ?? []); if (attachments.length + referenceProjects.length + files.length > 6) setError('参考文件和引用项目合计最多 6 项。'); else setAttachments(items => [...items, ...files]); event.currentTarget.value = ''; }} />
    {dialog === 'references' && <ReferenceProjectsDialog documents={documents} selected={referenceProjects} limit={Math.max(0, 6 - attachments.length)} onConfirm={next => { setReferenceProjects(next); setDialog(null); }} onClose={() => setDialog(null)} />}
    {dialog === 'directory' && <ProjectDialog project={project} initialPath={preferences.directory} onSelect={next => { setProject(next); updatePreferences({ directory: next?.path || '' }); setDialog(null); }} onClose={() => setDialog(null)} />}
    {dialog === 'project' && <Dialog title="新建项目" onClose={() => { if (!busy) setDialog(null); }}><form className="home-create-form" onSubmit={createProject}><label>项目名称<input autoFocus value={newName} maxLength={120} disabled={busy} placeholder="给你的新想法起个名字" onChange={event => setNewName(event.currentTarget.value)} required /></label>{error && <p className="home-inline-error" role="alert">{error}</p>}<div className="home-dialog-actions"><button type="button" className="home-secondary-button" disabled={busy} onClick={() => setDialog(null)}>取消</button><button type="submit" className="home-primary-button" disabled={busy || !newName.trim()}>{busy ? <LoaderCircle size={15} /> : <Plus size={15} />}{busy ? '正在创建…' : '创建并打开'}</button></div></form></Dialog>}
    {busy && <div className="home-busy" role="status"><LoaderCircle size={15} />正在处理项目…</div>}
    {settingsOpen && <div className="rs-overlay"><SettingsApp onClose={() => setSettingsOpen(false)} /></div>}
  </div>;
}

function EmptyState({ search, label, onClear, onCreate }: { search: string; label: string; onClear: () => void; onCreate?: () => void }) {
  return <div className="home-empty"><Search size={27} strokeWidth={1.5} /><h2>{search ? `没有找到相关${label}` : `还没有${label}`}</h2><p>{search ? '换个关键词，或清除搜索后查看全部。' : `从创建第一个${label}开始。`}</p><button type="button" className="home-secondary-button" onClick={search ? onClear : onCreate}>{search ? '清除搜索' : `新建${label}`}{search ? <X size={14} /> : <Plus size={14} />}</button></div>;
}
