import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, ChevronRight, ChevronsUpDown, Clock3, FileText, Folder, FolderOpen, House, LayoutGrid, LayoutTemplate, List, LoaderCircle, Menu, Paperclip, Plus, Search, Settings2, Shapes, SlidersHorizontal, X } from 'lucide-react';
import type { DocumentSummary } from '@rea/storage';
import { EditorWorkspace } from '../EditorApp';
import { useDocument } from '../session/useDocument';
import { Dialog } from '../ui';
import { builtInSystems, defaultPreferences, isPreferences, isSystems, models, readStored, relativeDate, templates, writeStored } from './data';
import type { DesignSystem, Preferences, Section, View } from './data';
import { ProjectPreview, SystemPreview } from './Previews';

const navigation: { id: Section; label: string; icon: typeof House }[] = [
  { id: 'home', label: '首页', icon: House }, { id: 'projects', label: '全部项目', icon: Folder },
  { id: 'systems', label: '设计系统', icon: Shapes }, { id: 'templates', label: '模板', icon: LayoutTemplate },
  { id: 'settings', label: '设置', icon: Settings2 },
];
type ChatMessage = { id: string; text: string; model: string; context: string; files: string[] };

function IconControl({ label, children, onClick, pressed }: { label: string; children: ReactNode; onClick: () => void; pressed?: boolean }) {
  return <button type="button" className="home-icon-button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>{children}</button>;
}
function SelectControl({ label, value, onChange, children, icon }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; icon?: ReactNode }) {
  return <label className="home-select" title={label}>{icon}<select aria-label={label} value={value} onChange={event => onChange(event.currentTarget.value)}>{children}</select><ChevronDown size={12} /></label>;
}

export function HomeApp() {
  const model = useDocument();
  const [section, setSection] = useState<Section>('home');
  const [inEditor, setInEditor] = useState(false);
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
  const [selectedSystem, setSelectedSystem] = useState('rea');
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dialog, setDialog] = useState<'project' | 'system' | 'directory' | null>(null);
  const [activeSystem, setActiveSystem] = useState<DesignSystem | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#356af0');
  const composer = useRef<HTMLTextAreaElement>(null);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const directoryInput = useRef<HTMLInputElement>(null);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const systems = [...builtInSystems, ...customSystems];
  const currentSystem = systems.find(item => item.id === selectedSystem) ?? systems[0];
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
  useEffect(() => { if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight; }, [messages.length, section]);

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

  function navigate(next: Section) { setSection(next); setSearch(''); setSort('recent'); setMobileMenu(false); content.current?.scrollTo(0, 0); }
  function updatePreferences(next: Partial<Preferences>) {
    const updated = { ...preferences, ...next }; setPreferences(updated);
    if (!writeStored('preferences', updated)) setError('浏览器未能保存设置；本次会话仍可继续使用。');
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
  function showCreate(kind: 'project' | 'system') { setNewName(''); setNewDescription(''); setNewColor('#356af0'); setDialog(kind); }
  function createProject(event: FormEvent) {
    event.preventDefault(); if (!newName.trim()) return;
    void run(async () => { await model.create(newName.trim()); setDialog(null); setInEditor(true); });
  }
  function createSystem(event: FormEvent) {
    event.preventDefault(); if (!newName.trim()) return;
    const next = [...customSystems, { id: crypto.randomUUID(), name: newName.trim(), description: newDescription.trim() || '自定义设计系统', color: newColor, colors: [newColor, '#f1f3f6', '#30343b', '#656d79', '#e5e7eb'] }];
    setCustomSystems(next);
    if (!writeStored('systems', next)) setError('浏览器未能保存设计系统；本次会话仍可使用。');
    setDialog(null);
  }
  function send() {
    if (!prompt.trim()) return;
    setMessages(items => [...items, { id: crypto.randomUUID(), text: prompt.trim(), model: preferences.model, context: `${currentSystem.name}${preferences.directory ? ` · ${preferences.directory}` : ''}`, files: attachments.map(file => file.name) }]);
    setPrompt(''); setAttachments([]);
  }
  function useTemplate(value: string) { navigate('home'); setPrompt(value); requestAnimationFrame(() => composer.current?.focus()); }

  if (inEditor) return <EditorWorkspace model={model} onHome={() => { setInEditor(false); navigate('home'); }} />;

  const filteredDocuments = documents.filter(doc => doc.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'zh-CN') : b.updatedAt.localeCompare(a.updatedAt));
  const filteredSystems = systems.filter(system => `${system.name} ${system.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'zh-CN') : 0);
  const navContent = <>
    <div className="home-brand"><button type="button" onClick={() => navigate('home')} aria-label="REA UI 首页"><span className="home-wordmark">rea<span /></span><span className="home-brand-label">设计工作空间</span></button><span className="home-mobile-close"><IconControl label="关闭导航" onClick={() => setMobileMenu(false)}><X size={18} /></IconControl></span></div>
    <nav className="home-navigation" aria-label="主导航">{navigation.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`home-nav-item ${section === id ? 'is-active' : ''}`} aria-current={section === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === 'projects' && <span className="home-nav-count">{documents.length}</span>}</button>)}</nav>
    <div className="home-recent-nav"><button type="button" className="home-recent-heading" aria-expanded={recentExpanded} aria-controls="home-sidebar-recents" onClick={() => setRecentExpanded(!recentExpanded)}><Clock3 size={15} /><span>最近项目</span><ChevronDown size={13} className={recentExpanded ? '' : 'is-collapsed'} /></button>{recentExpanded && <div id="home-sidebar-recents">{recentDocuments.slice(0, 5).map(doc => <button type="button" key={doc.id} disabled={busy} className="home-recent-item" onClick={() => openProject(doc.id)} title={doc.name}><FileText size={15} /><span>{doc.name}</span></button>)}{!documents.length && <p className="home-sidebar-empty">{loading ? '正在读取项目…' : '创建项目后会显示在这里'}</p>}</div>}</div>
    <button type="button" className="home-workspace-switch" onClick={() => navigate('settings')}><span className="home-workspace-avatar">R</span><span><strong>本地工作空间</strong><small>你的灵感，保存在此</small></span><ChevronsUpDown size={14} /></button>
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

  const composerUI = <>
    <form className="home-composer" onSubmit={event => { event.preventDefault(); send(); }}>
      <textarea ref={composer} aria-label="描述你的设计想法" placeholder="描述你的想法，让我们一起把它变成设计…" value={prompt} maxLength={12000} rows={3} onChange={event => setPrompt(event.currentTarget.value)} onKeyDown={event => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.shiftKey || event.altKey) return;
        if (preferences.sendKey === 'command' ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey) { event.preventDefault(); send(); }
      }} />
      {attachments.length > 0 && <div className="home-attachments">{attachments.map((file, index) => <span key={`${file.name}-${index}`}><Paperclip size={12} /><span>{file.name}</span><button type="button" aria-label={`移除附件 ${file.name}`} onClick={() => setAttachments(files => files.filter((_, i) => i !== index))}><X size={12} /></button></span>)}</div>}
      <div className="home-composer-toolbar"><div className="home-composer-context"><IconControl label="添加附件" onClick={() => attachmentInput.current?.click()}><Plus size={19} /></IconControl><span className="home-control-divider" /><SelectControl label="选择设计系统" value={selectedSystem} onChange={setSelectedSystem} icon={<Shapes size={14} />}>{systems.map(system => <option key={system.id} value={system.id}>{system.name}</option>)}</SelectControl><button type="button" className="home-directory-button" title={preferences.directory || '选择工作目录'} onClick={() => setDialog('directory')}><FolderOpen size={14} /><span>{preferences.directory || '工作目录'}</span><ChevronDown size={12} /></button></div><div className="home-composer-send"><SelectControl label="选择模型" value={preferences.model} onChange={model => updatePreferences({ model })}>{models.map(name => <option key={name}>{name}</option>)}</SelectControl><button type="submit" className="home-send-button" disabled={!prompt.trim()} aria-label="发送消息" title="发送消息"><ArrowUp size={18} /></button></div></div>
    </form>
    <p className="home-composer-note"><span>{preferences.sendKey === 'enter' ? 'Enter 发送，Shift + Enter 换行' : '⌘ / Ctrl + Enter 发送'}</span><span>AI 对话界面预览</span></p>
  </>;

  return <div className="home-shell">
    <a className="home-skip-link" href="#home-content">跳转到内容</a>
    <aside className="home-sidebar">{!mobileMenu && navContent}</aside>
    <dialog ref={mobileDialog} className="home-mobile-nav" aria-label="工作空间导航" onCancel={event => { event.preventDefault(); setMobileMenu(false); }} onClick={event => { if (event.target === event.currentTarget) setMobileMenu(false); }}><div className="home-mobile-nav-inner">{mobileMenu && navContent}</div></dialog>
    <div className="home-main"><header className="home-topbar"><span className="home-mobile-menu"><IconControl label="打开导航" onClick={() => setMobileMenu(true)}><Menu size={20} /></IconControl></span><span className="home-breadcrumb">工作空间<ChevronRight size={13} /><strong>{activeNav.label}</strong></span><span className="home-local-indicator"><i />本地工作空间</span></header>
      <main ref={content} id="home-content" className="home-content" tabIndex={-1}>
        {error && <div className="home-error" role="alert"><span>{error}</span><IconControl label="关闭错误提示" onClick={() => setError('')}><X size={16} /></IconControl></div>}
        {section === 'home' ? <div className="home-overview">
          <section className={`home-idea ${messages.length ? 'has-conversation' : ''}`} aria-labelledby="home-idea-title">
            <div className="home-idea-heading"><span className="home-idea-mark" aria-hidden="true"><Shapes size={25} strokeWidth={1.5} /></span><h1 id="home-idea-title">从一个想法，开始设计。</h1><p>说说你想创造什么，其余的我们一起完成。</p></div>
            {messages.length > 0 && <div ref={conversation} className="home-conversation" role="log" aria-label="对话预览">{messages.map(message => <div key={message.id} className="home-conversation-turn"><div className="home-user-message"><p>{message.text}</p>{message.files.length > 0 && <small><Paperclip size={12} />{message.files.join('、')}</small>}<small>{message.model} · {message.context}</small></div><div className="home-ai-message"><span className="home-ai-avatar">r</span><div><strong>REA <small>界面预览</small></strong><p>已收到你的想法。AI 生成暂未接入，你可以继续补充需求，或创建空白项目开始设计。</p><button type="button" className="home-text-button" onClick={() => showCreate('project')}>创建空白项目 <ArrowRight size={14} /></button></div></div></div>)}</div>}
            {composerUI}
            {!messages.length && <div className="home-prompt-suggestions">{templates.map(template => <button type="button" key={template.id} onClick={() => { setPrompt(template.prompt); composer.current?.focus(); }}><LayoutTemplate size={13} /><span>{template.id === 'website' ? '设计一个产品官网' : template.id === 'dashboard' ? '搭建数据看板' : '创建移动端页面'}</span><ArrowUpRight size={12} /></button>)}</div>}
          </section>
          <section className="home-recent-projects" aria-labelledby="home-recent-title"><header className="home-section-heading"><div><h2 id="home-recent-title">最近项目</h2><p>继续上次的创作，或者开启新的可能。</p></div><button type="button" className="home-text-button" onClick={() => navigate('projects')}>全部项目 <ArrowRight size={14} /></button></header>{loading ? <div className="home-loading" role="status"><LoaderCircle size={17} />正在读取本地项目…</div> : projectCollection(recentDocuments.slice(0, 2), true)}</section>
          <footer className="home-overview-footer"><span>每个好设计，都始于一个想法。</span><span>REA UI</span></footer>
        </div> : section === 'settings' ? <section className="home-library"><div className="home-page-heading"><div><h1>设置</h1><p>让工作空间更贴合你的创作习惯。</p></div></div><div className="home-settings">
          <section><h2>创作偏好</h2><div className="home-setting-row"><div><label htmlFor="home-default-model">默认模型</label><p>用于新对话的模型选项，当前仅作界面预览。</p></div><select id="home-default-model" value={preferences.model} onChange={event => updatePreferences({ model: event.currentTarget.value })}>{models.map(name => <option key={name}>{name}</option>)}</select></div><div className="home-setting-row"><div><label htmlFor="home-send-key">发送快捷键</label><p>选择你习惯的消息发送方式。</p></div><select id="home-send-key" value={preferences.sendKey} onChange={event => updatePreferences({ sendKey: event.currentTarget.value as Preferences['sendKey'] })}><option value="enter">Enter 发送</option><option value="command">⌘ / Ctrl + Enter 发送</option></select></div><div className="home-setting-row"><div><strong>工作目录</strong><p>{preferences.directory || '尚未选择工作目录'}</p></div><button type="button" className="home-secondary-button" onClick={() => setDialog('directory')}><FolderOpen size={15} />选择目录</button></div></section>
          <section><h2>关于工作空间</h2><div className="home-setting-row"><div><strong>本地存储</strong><p>项目保存在此浏览器中，可在编辑器中导出 .reaui 备份。</p></div><span className="home-setting-tag"><Check size={13} />本地工作空间</span></div><div className="home-setting-row"><div><strong>REA UI</strong><p>React 单源设计编辑器</p></div><span className="home-muted">v0.1.0</span></div></section>
        </div></section> : <section className="home-library">
          <div className="home-page-heading"><div><h1>{activeNav.label}</h1><p>{section === 'projects' ? '把灵感留在这里，随时回来继续。' : section === 'systems' ? '用一致的设计语言，让每一次创作更从容。' : '从一个好的起点，开始你的下一个设计。'}</p></div>{section !== 'templates' && <button type="button" className="home-primary-button" disabled={busy} onClick={() => showCreate(section === 'systems' ? 'system' : 'project')}><Plus size={16} />{section === 'systems' ? '新建设计系统' : '新建项目'}</button>}</div>
          <div className="home-library-toolbar"><label className="home-search"><Search size={16} /><input aria-label={`搜索${activeNav.label}`} placeholder={section === 'projects' ? '搜索项目…' : section === 'systems' ? '搜索设计系统…' : '搜索模板…'} value={search} onChange={event => setSearch(event.currentTarget.value)} />{search && <button type="button" aria-label="清空搜索" onClick={() => setSearch('')}><X size={14} /></button>}</label><div className="home-toolbar-right">{section !== 'templates' && <><SelectControl label="排序方式" value={sort} onChange={setSort} icon={<SlidersHorizontal size={13} />}><option value="recent">{section === 'projects' ? '最近更新' : '默认排序'}</option><option value="name">名称排序</option></SelectControl><span className="home-control-divider" /><div className="home-view-switch" role="group" aria-label="显示方式"><IconControl label="网格视图" pressed={views[section] === 'grid'} onClick={() => changeView('grid')}><LayoutGrid size={16} /></IconControl><IconControl label="列表视图" pressed={views[section] === 'list'} onClick={() => changeView('list')}><List size={17} /></IconControl></div></>}</div></div>
          <div className="home-library-count">{section === 'projects' ? `${filteredDocuments.length} 个项目` : section === 'systems' ? `${filteredSystems.length} 个设计系统` : '示例模板 · 点击填入设计需求'}</div>
          {section === 'projects' ? loading ? <div className="home-loading" role="status"><LoaderCircle size={18} />正在读取本地项目…</div> : filteredDocuments.length ? projectCollection(filteredDocuments) : <EmptyState search={search} label="项目" onClear={() => setSearch('')} onCreate={() => showCreate('project')} />
            : section === 'systems' ? filteredSystems.length ? <div className={`home-collection is-${views.systems}`} aria-label="设计系统列表">{filteredSystems.map(system => <button type="button" key={system.id} className="home-project-card home-system-card" onClick={() => setActiveSystem(system)}><SystemPreview system={system} /><div className="home-card-info"><span className="home-card-title">{system.name}{currentSystem.id === system.id && <span className="home-current-badge">当前使用</span>}</span><span className="home-card-description">{system.description}</span></div><ArrowUpRight className="home-card-arrow" size={16} /></button>)}</div> : <EmptyState search={search} label="设计系统" onClear={() => setSearch('')} onCreate={() => showCreate('system')} />
              : <div className="home-collection is-grid">{templates.filter(template => template.name.includes(search) || template.description.includes(search)).map(template => <button type="button" key={template.id} className="home-project-card" onClick={() => useTemplate(template.prompt)}><ProjectPreview kind={template.id} /><div className="home-card-info"><span className="home-card-title">{template.name}<span className="home-example-badge">示例</span></span><span className="home-card-description">{template.description}</span></div><ArrowUpRight className="home-card-arrow" size={16} /></button>)}{!templates.some(template => template.name.includes(search) || template.description.includes(search)) && <EmptyState search={search} label="模板" onClear={() => setSearch('')} />}</div>}
        </section>}
      </main>
    </div>
    <input ref={attachmentInput} hidden type="file" multiple aria-label="选择附件" onChange={event => { const files = Array.from(event.currentTarget.files ?? []); setAttachments(items => [...items, ...files]); event.currentTarget.value = ''; }} />
    <input ref={directoryInput} hidden type="file" {...{ webkitdirectory: '', directory: '' }} aria-label="选择本地工作目录" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) { updatePreferences({ directory: file.webkitRelativePath.split('/')[0] }); setDialog(null); } event.currentTarget.value = ''; }} />
    {dialog && <Dialog title={dialog === 'project' ? '新建项目' : dialog === 'system' ? '新建设计系统' : '选择工作目录'} onClose={() => { if (!busy) setDialog(null); }}>
      {dialog === 'directory' ? <div className="home-directory-dialog"><FolderOpen size={30} /><p>为你的下一个设计选择一个工作目录。</p><p className="home-muted">当前仅记录所选文件夹的名称，用于界面预览。项目仍保存在此浏览器中。</p>{preferences.directory && <div className="home-selected-directory"><Folder size={16} />{preferences.directory}</div>}<div className="home-dialog-actions">{preferences.directory && <button type="button" className="home-secondary-button" onClick={() => { updatePreferences({ directory: '' }); setDialog(null); }}>清除选择</button>}<button type="button" className="home-primary-button" onClick={() => directoryInput.current?.click()}><FolderOpen size={15} />浏览文件夹</button></div><p className="home-field-hint">请选择包含文件的文件夹；当前浏览器无法识别空文件夹。</p></div>
        : <form className="home-create-form" onSubmit={dialog === 'project' ? createProject : createSystem}><label>{dialog === 'project' ? '项目名称' : '设计系统名称'}<input autoFocus value={newName} maxLength={120} disabled={busy} placeholder={dialog === 'project' ? '给你的新想法起个名字' : '例如：品牌设计系统'} onChange={event => setNewName(event.currentTarget.value)} required /></label>{dialog === 'system' && <><label>描述<input value={newDescription} maxLength={160} placeholder="简单描述它的风格与用途" onChange={event => setNewDescription(event.currentTarget.value)} /></label><label className="home-color-field">主色<input type="color" value={newColor} onChange={event => setNewColor(event.currentTarget.value)} /><span>{newColor.toUpperCase()}</span></label><p className="home-field-hint">此阶段保存名称、描述与配色，组件编辑将在后续接入。</p></>}{error && <p className="home-inline-error" role="alert">{error}</p>}<div className="home-dialog-actions"><button type="button" className="home-secondary-button" disabled={busy} onClick={() => setDialog(null)}>取消</button><button type="submit" className="home-primary-button" disabled={busy || !newName.trim()}>{busy ? <LoaderCircle size={15} /> : <Plus size={15} />}{busy ? '正在创建…' : dialog === 'project' ? '创建并打开' : '创建设计系统'}</button></div></form>}
    </Dialog>}
    {activeSystem && <Dialog title={activeSystem.name} onClose={() => setActiveSystem(null)}><div className="home-system-detail"><SystemPreview system={activeSystem} /><p>{activeSystem.description}</p><p className="home-muted">配色预设用于首页选择与预览，暂不更改画布中的现有样式。</p><div className="home-system-color-values">{activeSystem.colors.map((color, i) => <span key={i}><i style={{ background: color }} />{color.toUpperCase()}</span>)}</div><div className="home-dialog-actions"><button type="button" className="home-primary-button" onClick={() => { setSelectedSystem(activeSystem.id); setActiveSystem(null); navigate('home'); }}><Check size={15} />用于新对话</button></div></div></Dialog>}
    {busy && <div className="home-busy" role="status"><LoaderCircle size={15} />正在处理项目…</div>}
  </div>;
}

function EmptyState({ search, label, onClear, onCreate }: { search: string; label: string; onClear: () => void; onCreate?: () => void }) {
  return <div className="home-empty"><Search size={27} strokeWidth={1.5} /><h2>{search ? `没有找到相关${label}` : `还没有${label}`}</h2><p>{search ? '换个关键词，或清除搜索后查看全部。' : `从创建第一个${label}开始。`}</p><button type="button" className="home-secondary-button" onClick={search ? onClear : onCreate}>{search ? '清除搜索' : `新建${label}`}{search ? <X size={14} /> : <Plus size={14} />}</button></div>;
}
