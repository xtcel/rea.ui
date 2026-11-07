import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Check, ChevronDown, ChevronRight, CornerDownRight, Folder, Link, LoaderCircle, Palette, Paperclip, Plus, Search, Sparkles, Square, SquareTerminal, Upload, X } from 'lucide-react';
import type { DocumentSummary } from '@rea/storage';
import { Dialog } from '../ui';
import { agentRequest } from '../agent/client';
import type { AgentConfig, AgentInfo, ProjectContext } from '../agent/client';
import type { DesignSystem } from './data';
import type { AgentRef } from '../agent/sessions';
import { isApiTargetReady } from '../settings/providers';

const refContainers = new Set(['Frame', 'Group', 'Instance', 'Slot', 'SlotContent']);

interface ComposerProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  prompt: string; onPrompt: (value: string) => void; onSend: () => void; onStop: () => void;
  sendKey: 'enter' | 'command'; running: boolean; preparing: boolean; busy: boolean;
  systems: DesignSystem[]; selectedSystem: string; onSystem: (id: string) => void;
  config: AgentConfig; onAgentSettings: () => void; project: ProjectContext | null; onProject: () => void;
  attachments: File[]; onAttach: () => void; onRemoveAttachment: (index: number) => void;
  references: DocumentSummary[]; onReferences: () => void; onRemoveReference: (id: string) => void;
  elements?: readonly AgentRef[]; onRemoveElement?: (ref: AgentRef) => void; onToggleElement?: (ref: AgentRef) => void;
}

const unavailableActions = [
  { label: '插件', Icon: Sparkles, submenu: true },
  { label: '从 Figma 导入', Icon: Upload },
  { label: '连接器', Icon: Link, submenu: true },
  { label: 'MCP', Icon: Link, submenu: true },
];

function AddContextMenu({ anchor, onClose, onAttach, onReferences, onProject }: {
  anchor: HTMLButtonElement; onClose: (restoreFocus?: boolean) => void; onAttach: () => void; onReferences: () => void; onProject: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });
  useLayoutEffect(() => {
    function place() {
      const menu = ref.current;
      if (!menu) return;
      const trigger = anchor.getBoundingClientRect(), bounds = menu.getBoundingClientRect();
      const below = innerHeight - trigger.bottom - 16;
      const top = below < bounds.height && trigger.top > below ? trigger.top - bounds.height - 8 : trigger.bottom + 8;
      setPosition({ left: Math.max(12, Math.min(trigger.left, innerWidth - bounds.width - 12)), top: Math.max(12, Math.min(top, innerHeight - bounds.height - 12)), ready: true });
    }
    place();
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node) && !anchor.contains(event.target as Node)) onClose(); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, onClose]);
  useEffect(() => {
    if (position.ready) ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }, [position.ready]);
  const actions = [{ label: '附加文件', Icon: Paperclip, action: onAttach }, { label: '引用其他项目', Icon: Folder, action: onReferences }, { label: '关联本地代码', Icon: Folder, action: onProject }];
  return createPortal(<div ref={ref} role="menu" aria-label="添加设计上下文" className="composer-context-menu" style={{ left: position.left, top: position.top, visibility: position.ready ? 'visible' : 'hidden' }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(true); }
    if (event.key === 'Tab') onClose(true);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')], index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }}>
    {actions.map(({ label, Icon, action }) => <button key={label} type="button" role="menuitem" onClick={() => { onClose(); action(); }}><Icon size={18} /><span>{label}</span></button>)}
    {unavailableActions.map(({ label, Icon, submenu }) => <button key={label} type="button" role="menuitem" disabled title="暂未接入"><Icon size={18} /><span>{label}</span><small>暂未接入</small>{submenu && <ChevronRight size={15} />}</button>)}
  </div>, document.body);
}

export function HomeComposer(props: ComposerProps) {
  const { inputRef, prompt, onPrompt, onSend, onStop, sendKey, running, preparing, busy, systems, selectedSystem, onSystem, config, onAgentSettings, project, onProject, attachments, onAttach, onRemoveAttachment, references, onReferences, onRemoveReference, elements = [], onRemoveElement, onToggleElement } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const [connection, setConnection] = useState<'checking' | 'connected' | 'signed-out' | 'unavailable'>('checking');
  const [connectionError, setConnectionError] = useState('');
  const addButton = useRef<HTMLButtonElement>(null);
  const systemId = useId();
  useEffect(() => {
    let active = true;
    setConnection('checking'); setConnectionError('');
    if (config.provider) {
      const ready = isApiTargetReady(config.provider);
      setConnection(ready ? 'connected' : 'signed-out');
      if (!ready) setConnectionError('请在设置中补全接口地址、模型与 API Key。');
      return () => { active = false; };
    }
    void agentRequest<AgentInfo>('detect', { executable: config.executable, command: config.command }).then(info => { if (active) setConnection(info.loggedIn === false ? 'signed-out' : 'connected'); }).catch(error => { if (active) { setConnection('unavailable'); setConnectionError(error instanceof Error ? error.message : String(error)); } });
    return () => { active = false; };
  }, [config.executable, config.command, config.provider?.baseUrl, config.provider?.model, config.provider?.apiKey]);
  useLayoutEffect(() => {
    function resize() {
      const input = inputRef.current;
      if (!input) return;
      input.style.height = 'auto';
      input.style.height = `${Math.max(84, Math.min(input.scrollHeight, 260))}px`;
      input.style.overflowY = input.scrollHeight > 260 ? 'auto' : 'hidden';
    }
    resize(); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [inputRef, prompt]);
  const connectionLabel = { checking: '正在检测连接', connected: '已连接', 'signed-out': '尚未登录', unavailable: '未连接' }[connection];
  const agentName = config.provider?.name ?? config.name ?? 'Codex CLI';
  const agentModel = config.model || (config.provider ? '未设置模型' : 'Codex 默认模型');
  const closeMenu = useCallback((restoreFocus = false) => { setMenuOpen(false); if (restoreFocus) addButton.current?.focus({ preventScroll: true }); }, []);
  return <>
    <form className="home-composer" onSubmit={event => { event.preventDefault(); onSend(); }}>
      <div className="home-composer-surface">
        {(elements.length > 0 || attachments.length > 0 || references.length > 0) && <div className="home-composer-chips" aria-label="设计参考">{elements.map(element => <span key={`${element.pageId}:${element.designId}`} className="is-element"><Sparkles size={13} /><span title={`引用元素：${element.name} · ${element.subtree ? '含子级' : '仅自身'}`}>{element.name}</span>{refContainers.has(element.kind) && <button type="button" className={`chip-scope ${element.subtree ? 'is-on' : ''}`} disabled={running || preparing} title={element.subtree ? '包含子级，点击改为仅自身' : '仅自身，点击包含子级'} aria-label={`${element.name} ${element.subtree ? '包含子级' : '仅自身'}`} onClick={() => onToggleElement?.(element)}><CornerDownRight size={11} /></button>}<button type="button" disabled={running || preparing} aria-label={`移除引用 ${element.name}`} onClick={() => onRemoveElement?.(element)}><X size={12} /></button></span>)}{attachments.map((file, index) => <span key={`${file.name}-${index}`}><Paperclip size={13} /><span title={file.name}>{file.name}</span><button type="button" disabled={running || preparing} aria-label={`移除附件 ${file.name}`} onClick={() => onRemoveAttachment(index)}><X size={12} /></button></span>)}{references.map(doc => <span key={doc.id}><Folder size={13} /><span title={`引用项目：${doc.name}`}>{doc.name}</span><button type="button" disabled={running || preparing} aria-label={`移除引用 ${doc.name}`} onClick={() => onRemoveReference(doc.id)}><X size={12} /></button></span>)}</div>}
        <textarea ref={inputRef} aria-label="描述你的设计想法" disabled={running || preparing} placeholder="描述你的想法，让我们一起把它变成设计…" value={prompt} maxLength={12000} rows={3} onChange={event => onPrompt(event.currentTarget.value)} onKeyDown={event => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.shiftKey || event.altKey) return;
          if (sendKey === 'command' ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey) { event.preventDefault(); onSend(); }
        }} />
        <div className="home-composer-toolbar">
          <div className="home-composer-context">
            <button ref={addButton} type="button" className="composer-add-button" aria-label="添加设计上下文" title="添加设计上下文" aria-haspopup="menu" aria-expanded={menuOpen} disabled={running || preparing} onClick={() => setMenuOpen(value => !value)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setMenuOpen(true); } }}><Plus size={21} /></button>
            <label className="composer-system-picker" htmlFor={systemId} title="选择设计系统"><Palette size={19} /><select id={systemId} aria-label="选择设计系统" value={selectedSystem} disabled={running || preparing} onChange={event => onSystem(event.currentTarget.value)}>{systems.map(system => <option key={system.id} value={system.id}>{system.name}</option>)}</select></label>
          </div>
          <div className="home-composer-send">
            <button type="button" className="composer-agent-button" aria-label={`${agentName}：${connectionLabel}，打开设置`} title={`${agentName} · ${connectionLabel}\n模型：${agentModel}${connectionError ? `\n${connectionError}` : ''}`} onClick={onAgentSettings}><span className={`composer-agent-status is-${connection}`} aria-hidden="true" /><span className="composer-agent-icon" aria-hidden="true"><SquareTerminal size={20} /></span></button>
            {running ? <button type="button" className="home-send-button is-stopping" aria-label="停止生成" title="停止生成" onClick={onStop}><Square size={17} fill="currentColor" /></button> : <button type="submit" className="home-send-button" disabled={!prompt.trim() || busy || preparing} aria-label="生成 UI" title="生成 UI">{preparing ? <LoaderCircle className="composer-preparing" size={21} /> : <ArrowUp size={23} strokeWidth={2.5} />}</button>}
          </div>
        </div>
      </div>
      <div className="home-composer-footer"><button type="button" className="home-directory-button" title={project?.path || '选择工作目录，关联本地项目代码'} disabled={running || preparing} onClick={onProject}><Folder size={17} /><span>{project?.name || '工作目录'}</span><ChevronDown size={14} /></button></div>
    </form>
    <p className="home-composer-note"><span>{sendKey === 'enter' ? 'Enter 生成，Shift + Enter 换行' : '⌘ / Ctrl + Enter 生成'}</span><span>{agentName} · 可编辑设计</span></p>
    {menuOpen && addButton.current && <AddContextMenu anchor={addButton.current} onClose={closeMenu} onAttach={onAttach} onReferences={onReferences} onProject={onProject} />}
  </>;
}

export function ReferenceProjectsDialog({ documents, selected, limit, onConfirm, onClose }: {
  documents: DocumentSummary[]; selected: DocumentSummary[]; limit: number; onConfirm: (documents: DocumentSummary[]) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [ids, setIds] = useState(() => new Set(selected.map(doc => doc.id)));
  const visible = documents.filter(doc => doc.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <Dialog title="引用其他项目" onClose={onClose}><div className="composer-project-references"><p>选择本地设计作为参考，帮助 Agent 了解布局与视觉风格。</p><label className="home-search"><Search size={16} /><input autoFocus aria-label="搜索引用项目" placeholder="搜索本地项目…" value={search} onChange={event => setSearch(event.currentTarget.value)} /></label><div className="composer-reference-list">{visible.map(doc => <label key={doc.id}><input type="checkbox" checked={ids.has(doc.id)} disabled={!ids.has(doc.id) && ids.size >= limit} onChange={event => { const next = new Set(ids); if (event.currentTarget.checked) next.add(doc.id); else next.delete(doc.id); setIds(next); }} /><Folder size={18} /><span><strong>{doc.name}</strong><small>{new Date(doc.updatedAt).toLocaleDateString('zh-CN')}</small></span>{ids.has(doc.id) && <Check size={15} />}</label>)}{!visible.length && <p className="home-muted">{search ? '没有找到相关项目。' : '还没有本地项目，可以先附加 .reaui 文件。'}</p>}</div><div className="home-dialog-actions"><span className="home-muted">已选 {ids.size} / {limit}</span><button type="button" className="home-secondary-button" onClick={onClose}>取消</button><button type="button" className="home-primary-button" onClick={() => onConfirm(documents.filter(doc => ids.has(doc.id)))}>添加引用</button></div></div></Dialog>;
}
