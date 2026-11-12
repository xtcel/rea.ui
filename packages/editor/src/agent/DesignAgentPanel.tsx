import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, LoaderCircle, MessageSquare, Plus, RotateCcw, SquareTerminal, Trash2 } from 'lucide-react';
import { exportReaui } from '@rea/storage';
import type { DocumentSummary } from '@rea/storage';
import type { DocumentModel } from '../session/useDocument';
import { HomeComposer, ReferenceProjectsDialog } from '../home/HomeComposer';
import { Button, Dialog } from '../ui';
import { SettingsApp } from '../settings/SettingsApp';
import { openSettingsWindow } from '../settings/window';
import { ProjectDialog } from './ProjectDialog';
import { agentRequest } from './client';
import type { AgentConfig, ProjectContext } from './client';
import type { DesignSystem } from './designSystem';
import { pinnedAgentSystem } from './designSystem';
import { agentCandidateFiles } from '../session/agent';
import { apiFilesSchema, apiWorkspacePrompt, attachmentContext, designSources, workspacePrompt, workspaceSchema } from './generation';
import { useAgentTask } from './useAgentTask';
import { AGENT_SESSION_FILE, activeSession, addSession, createStore, legacyStore, parseStore, removeSession, selectSession, serializeStore, writeTurns } from './sessions';
import type { AgentRef, AgentSession, AgentSessionStore, AgentTurn } from './sessions';
import type { AgentCanvasContext } from './context';
import { elementContext } from './elementContext';
import { changesBetween, changesToRefs, classifyChanges } from './scope';

export interface DesignRequest {
  id: string; text: string; attachments: File[]; references: DocumentSummary[];
  project: ProjectContext | null;
}
export interface DesignAgentPanelProps {
  model: DocumentModel; canvas: AgentCanvasContext; initialRequest?: DesignRequest; config: AgentConfig;
  systems: DesignSystem[]; onSystem: (id: string) => void;
  onEditSystem?: () => void;
  project: ProjectContext | null; onProject: (project: ProjectContext | null) => void; sendKey: 'enter' | 'command';
}
const LEGACY_KEY = (documentId: string) => `agent-conversation:${documentId}`;
const day = (iso: string) => new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

function SessionMenu({ anchor, store, onSelect, onDelete, onNew, onClose }: {
  anchor: HTMLButtonElement; store: AgentSessionStore; onSelect: (id: string) => void; onDelete: (session: AgentSession) => void; onNew: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, ready: false });
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const trigger = anchor.getBoundingClientRect(), bounds = menu.getBoundingClientRect();
    const below = innerHeight - trigger.bottom - 16;
    const top = below < bounds.height && trigger.top > below ? trigger.top - bounds.height - 8 : trigger.bottom + 6;
    setPosition({ left: Math.max(8, Math.min(trigger.left, innerWidth - bounds.width - 8)), top: Math.max(8, Math.min(top, innerHeight - bounds.height - 8)), ready: true });
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node) && !anchor.contains(event.target as Node)) onClose(); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', onClose);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', onClose); };
  }, [anchor, onClose]);
  const sessions = [...store.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return createPortal(<div ref={ref} role="menu" aria-label="AI 会话" className="rea-agent-sessions" style={{ left: position.left, top: position.top, visibility: position.ready ? 'visible' : 'hidden' }} onKeyDown={event => {
    if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); event.stopPropagation(); onClose(); }
  }}>
    <div className="rea-agent-sessions-list">{sessions.map(session => <div key={session.id} className={`rea-agent-session-row ${session.id === store.activeId ? 'is-active' : ''}`}>
      <button type="button" role="menuitem" className="rea-agent-session-open" onClick={() => onSelect(session.id)} title={session.title}>
        <span>{session.title}</span>
        <small>{session.turns.length ? `${session.turns.length} 轮` : '空会话'} · {day(session.updatedAt)}</small>
      </button>
      <button type="button" className="rea-agent-session-delete" aria-label={`删除会话 ${session.title}`} title="删除会话" onClick={() => onDelete(session)}><Trash2 size={13} /></button>
    </div>)}</div>
    <div className="rea-agent-sessions-footer">
      <button type="button" onClick={onNew}><Plus size={14} />新建会话</button>
      <small>会话随 .reaui 保存</small>
    </div>
  </div>, document.body);
}

export function DesignAgentPanel(props: DesignAgentPanelProps) {
  const { model, canvas, config, systems, onSystem, project, onProject, sendKey, initialRequest } = props;
  const documentId = model.current!.manifest.id;
  const task = useAgentTask();
  const [store, setStore] = useState<AgentSessionStore | null>(null);
  const storeRef = useRef<AgentSessionStore | null>(null);
  const dirty = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [references, setReferences] = useState<DocumentSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [dialog, setDialog] = useState<'project' | 'references' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionMenu, setSessionMenu] = useState(false);
  const [deleting, setDeleting] = useState<AgentSession | null>(null);
  const [notice, setNotice] = useState('');
  const latest = useRef(props); latest.current = props;
  const sending = useRef(false), cancelled = useRef(false), alive = useRef(true);
  const started = useRef('');
  const input = useRef<HTMLTextAreaElement>(null), fileInput = useRef<HTMLInputElement>(null), log = useRef<HTMLDivElement>(null), sessionButton = useRef<HTMLButtonElement>(null);
  const follow = useRef(true);
  const session = store ? activeSession(store) : null;
  const turns = session?.turns ?? [];
  const busy = task.running || preparing;

  function flush() {
    if (!dirty.current) return;
    const value = storeRef.current, current = latest.current.model.current;
    if (!value || !current || current.manifest.id !== documentId) return;
    if (latest.current.model.writeMetadata(AGENT_SESSION_FILE, serializeStore(value))) dirty.current = false;
  }
  function apply(next: AgentSessionStore, flushNow = true) {
    storeRef.current = next; dirty.current = true;
    if (alive.current) setStore(next);
    if (flushNow) flush();
  }
  const sessionTurns = () => storeRef.current ? activeSession(storeRef.current).turns : [];
  function remember(next: AgentTurn[]) {
    const current = storeRef.current;
    if (!current) return;
    const nextStore = writeTurns(current, current.activeId, next);
    storeRef.current = nextStore; dirty.current = true;
    if (alive.current) setStore(nextStore);
  }
  function update(id: string, patch: Partial<AgentTurn>) { remember(sessionTurns().map(turn => turn.id === id ? { ...turn, ...patch } : turn)); }

  useEffect(() => {
    alive.current = true;
    let active = true;
    const fromFile = parseStore(model.current?.files[AGENT_SESSION_FILE]);
    if (fromFile) { storeRef.current = fromFile; setStore(fromFile); setLoaded(true); }
    else {
      void model.storage.getMeta<unknown>(LEGACY_KEY(documentId)).then(value => {
        if (!active) return;
        const next = legacyStore(value) ?? createStore();
        storeRef.current = next; setStore(next); setLoaded(true);
        if (value !== undefined) {
          model.writeMetadata(AGENT_SESSION_FILE, serializeStore(next));
          void model.storage.deleteMeta(LEGACY_KEY(documentId)).catch(() => {});
        }
      }).catch(() => {
        if (!active) return;
        const next = createStore();
        storeRef.current = next; setStore(next); setLoaded(true);
        setNotice('无法读取会话记录，仍可继续设计。');
      });
    }
    return () => { active = false; alive.current = false; cancelled.current = true; flush(); };
  }, [documentId, model.storage]);

  useEffect(() => { if (follow.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [turns]);
  useEffect(() => {
    let active = true;
    // Defer until after StrictMode's setup/cleanup cycle.
    void Promise.resolve().then(() => {
      const current = storeRef.current;
      if (!active || !loaded || !initialRequest || !current || started.current === initialRequest.id) return;
      if (current.sessions.some(item => item.turns.some(turn => turn.id === initialRequest.id))) return;
      started.current = initialRequest.id;
      if (activeSession(current).turns.length) apply(addSession(current).store, false);
      void send(initialRequest);
    });
    return () => { active = false; };
  }, [loaded, initialRequest?.id]);

  function switchSession(id: string) {
    if (busy || !storeRef.current || id === storeRef.current.activeId) { setSessionMenu(false); return; }
    apply(selectSession(storeRef.current, id));
    setSessionMenu(false);
  }
  function newSession() {
    if (busy || !storeRef.current) return;
    apply(addSession(storeRef.current).store);
    setSessionMenu(false);
    input.current?.focus();
  }
  function deleteSession() {
    if (!deleting || !storeRef.current) return;
    apply(removeSession(storeRef.current, deleting.id));
    setDeleting(null);
  }

  async function stop() {
    cancelled.current = true;
    try { await task.cancel(); } catch (error) { setNotice(String(error)); }
  }
  async function openSettings() {
    if (await openSettingsWindow() === 'in-app') setSettingsOpen(true);
  }
  async function send(request?: DesignRequest) {
    const text = (request?.text ?? prompt).trim();
    if (!text || sending.current || !loaded || !storeRef.current) return;
    sending.current = true; cancelled.current = false; follow.current = true;
    setPreparing(true); setNotice('');
    const id = request?.id ?? crypto.randomUUID(), selectedProject = request ? request.project : project;
    const files = request?.attachments ?? attachments, refs = request?.references ?? references;
    const conversation = sessionTurns().slice(-6).map(turn => `用户：${turn.text}\nAgent：${turn.reply ?? ''}`).join('\n');
    const elementRefs = canvas.refs.slice(0, 8);
    const pages = new Map([...(model.current?.pages ?? []), ...(model.current?.componentPages ?? [])]);
    const selection = elementContext(pages, elementRefs);
    const events: string[] = ['项目已就绪，正在读取设计参考…'];
    const addEvent = (event: string) => { if (!events.includes(event)) { events.push(event); if (events.length > 80) events.splice(1, 1); update(id, { events: [...events] }); } };
    // The document's pinned snapshot wins over the composer picker: it is what the canvas
    // renders and what the file carries, so provenance must describe that exact package.
    const pinned = (latest.current.model.latest() ?? latest.current.model.current)?.system ?? null;
    let systemInput = pinned ? pinnedAgentSystem(pinned) : null;
    remember([...sessionTurns(), { id, text, context: `${pinned?.name ?? '未设置设计系统'}${selectedProject ? ` · ${selectedProject.name}` : ''}`, model: `${config.provider?.name ?? config.name ?? 'Codex CLI'}${config.model ? ` · ${config.model}` : ''}`, files: [...files.map(file => file.name), ...refs.map(ref => `引用：${ref.name}`)], state: 'running', events: [...events], refs: elementRefs, system: systemInput?.ref }]);
    if (selection.missing.length) addEvent(`有 ${selection.missing.length} 个引用元素已不存在，本轮已跳过`);
    if (elementRefs.length) addEvent(`已引用 ${elementRefs.length} 个画布元素作为修改范围`);
    canvas.clearRefs();
    setPrompt(''); setAttachments([]); setReferences([]);
    flush();
    const changedRefs = new Map<string, AgentRef>(), outsideRefs = new Map<string, AgentRef>();
    const collect = (target: Map<string, AgentRef>, changes: AgentRef[]) => {
      for (const ref of changes) target.set(`${ref.pageId}:${ref.designId}`, ref);
    };
    try {
      const referenceFiles = await Promise.all(refs.map(async ref => {
        const record = await model.storage.getDocument(ref.id);
        if (!record) throw new Error(`引用项目「${ref.name}」已不存在，请重新选择。`);
        const bytes = await exportReaui({ files: record.files });
        return new File([new Uint8Array(bytes)], `${ref.name}.reaui`);
      }));
      const referenceText = await attachmentContext([...files, ...referenceFiles]);
      const context = selectedProject ? await agentRequest<ProjectContext>('project', { path: selectedProject.path }) : null;
      if (cancelled.current || !alive.current) throw new Error('已停止生成。');
      // 元数据写入会立刻递增 rev，React 状态可能还没同步，这里取权威快照。
      const current = latest.current.model.latest() ?? latest.current.model.current!;
      if (current.manifest.id !== documentId) throw new Error('项目已切换，请重新发送需求。');
      systemInput = current.system ? pinnedAgentSystem(current.system) : null;
      update(id, { system: systemInput?.ref, context: `${current.system?.name ?? '未设置设计系统'}${selectedProject ? ` · ${selectedProject.name}` : ''}` });
      let sources = designSources(current.files), expectedRev = current.rev, feedback = '';
      setPreparing(false);
      const apiMode = !!config.provider;
      for (let attempt = 0; attempt < 2; attempt++) {
        let validationError = '', lastPreview = '', receivedPreview = false;
        const agentPrompt = apiMode
          ? apiWorkspacePrompt(`${text}${feedback}`, systemInput, context, referenceText, conversation, { ...current.files, ...sources }, selection.text)
          : workspacePrompt(`${text}${feedback}`, systemInput, context, referenceText, conversation, current.files, selection.text);
        const result = await task.generate(agentPrompt, apiMode ? apiFilesSchema : workspaceSchema, config, '', {
          files: sources,
          onStatus(status) {
            if (cancelled.current || !alive.current) throw new Error('已停止生成。');
            const latestSession = latest.current.model.latest() ?? latest.current.model.current;
            if (latestSession?.manifest.id !== documentId || latestSession.rev !== expectedRev) throw new Error('画布已被编辑或项目已切换，已停止 AI 更新。请基于当前设计重新发送需求。');
            for (const event of status.events) addEvent(event);
            if (status.previewError) { validationError = status.previewError; lastPreview = ''; addEvent('正在等待完整的设计文件…'); return; }
            if (!status.preview) return;
            const signature = JSON.stringify(status.preview);
            if (signature === lastPreview) return;
            lastPreview = signature; receivedPreview = true;
            try {
              const validated = designSources(agentCandidateFiles(latestSession, status.preview));
              const report = classifyChanges(changesBetween(sources, validated), elementRefs);
              const nextRev = model.applyAgentFiles(documentId, expectedRev, validated, id);
              if (nextRev !== expectedRev) addEvent(`已校验并同步到画布 · 更新 ${nextRev - expectedRev}`);
              collect(changedRefs, changesToRefs(report.inside));
              collect(outsideRefs, changesToRefs(report.outside));
              if (report.inside.length) canvas.markTouched(report.inside.map(change => change.designId));
              expectedRev = nextRev; sources = validated; validationError = '';
            } catch (error) {
              validationError = error instanceof Error ? error.message : String(error);
              addEvent('正在校验页面，等待完整有效的设计文件…');
            }
          },
        });
        if (!receivedPreview && !validationError) validationError = apiMode ? '模型没有返回可用的设计文件。' : 'Agent 没有返回设计文件。请直接编辑工作区中的页面。';
        if (!validationError && expectedRev === current.rev && current.pages.values().next().value!.page.nodes.size === 1) validationError = apiMode ? '模型没有返回页面内容，请补充更具体的需求。' : 'Agent 没有创建页面内容，请直接写入有效的设计文件。';
        if (validationError) {
          if (attempt === 1) throw new Error(`设计校验失败：${validationError}。已保留最后一次有效设计，请调整需求后重试。`);
          addEvent('设计未通过静态校验，正在自动修复（1/1）…');
          feedback = `\n\n上一轮未通过校验：${validationError}。请在当前有效设计基础上修复并完成原需求。上一轮文件（仅供修复参考）：${lastPreview.slice(0, 70_000)}`;
          continue;
        }
        const summary = result && typeof result === 'object' && 'summary' in result && typeof result.summary === 'string' ? result.summary.slice(0, 4000) : '设计已更新，可以在右侧画布继续编辑。';
        addEvent('设计已完成，修改已同步到画布');
        update(id, { state: 'completed', reply: summary, changed: [...changedRefs.values()], outside: [...outsideRefs.values()] });
        return;
      }
    } catch (error) {
      update(id, { state: cancelled.current ? 'cancelled' : 'failed', reply: cancelled.current ? '已停止生成，保留已同步的设计。' : error instanceof Error ? error.message : String(error), changed: [...changedRefs.values()], outside: [...outsideRefs.values()] });
    } finally {
      sending.current = false;
      if (alive.current) setPreparing(false);
      flush();
    }
  }

  const sessionsHint = store && store.sessions.length > 1 ? ` · ${store.sessions.length} 个会话` : '';
  return <section className="rea-agent-panel" aria-label="AI 设计会话">
    <header className="rea-agent-heading"><SquareTerminal size={16} /><strong>设计 Agent</strong>
      <button ref={sessionButton} type="button" className="rea-agent-session-button" disabled={!loaded || busy} aria-haspopup="menu" aria-expanded={sessionMenu} title={`切换 AI 会话${sessionsHint}`} onClick={() => setSessionMenu(value => !value)}>
        <span>{session?.title ?? '会话'}</span><ChevronDown size={12} />
      </button>
    </header>
    <div ref={log} className="rea-agent-log" role="log" aria-label="设计会话记录" aria-live="polite" onScroll={event => { const el = event.currentTarget; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>
      {!turns.length && <div className="rea-agent-empty"><MessageSquare size={24} /><h2>一起完善这个设计</h2><p>描述页面、布局或图层的改动。Agent 的执行进度会显示在这里，设计会同步到画布。</p></div>}
      {turns.map(turn => <article className="rea-agent-turn" key={turn.id}>
        <div className="rea-agent-request"><p>{turn.text}</p>{turn.refs && turn.refs.length > 0 && <small className="rea-agent-request-refs">引用元素：{turn.refs.map(ref => `${ref.name}${ref.subtree ? '（含子级）' : ''}`).join('、')}</small>}{turn.files.length > 0 && <small>{turn.files.join('、')}</small>}<small>{turn.context}</small></div>
        <div className="rea-agent-response"><div className="rea-agent-response-heading"><SquareTerminal size={14} /><strong>REA Agent</strong>{turn.state === 'running' && <LoaderCircle size={13} className="rea-agent-spinner" />}{turn.state === 'completed' && <Check size={14} />}</div>
          <details className="rea-agent-activity" open={turn.state === 'running'}><summary>执行过程 · {turn.events.length} 项<ChevronDown size={12} /></summary><ol>{turn.events.map((event, index) => <li key={index}>{event}</li>)}</ol></details>
          {turn.state === 'running' && <p className="rea-agent-current" role="status">{turn.events.at(-1)}</p>}
          {turn.reply && <p className={turn.state === 'failed' ? 'rea-agent-error' : ''}>{turn.reply}</p>}
          {!!turn.changed?.length && <div className="rea-agent-changes"><span>本轮修改</span>{turn.changed.map(ref => <button key={`${ref.pageId}:${ref.designId}`} type="button" title="在画布中定位" onClick={() => canvas.focus(ref.designId)}>{ref.name}</button>)}</div>}
          {!!turn.outside?.length && <div className="rea-agent-outside"><span>范围外改动 {turn.outside.length} 处，已保留</span><div>{turn.outside.map(ref => <button key={`${ref.pageId}:${ref.designId}`} type="button" title="在画布中定位" onClick={() => canvas.focus(ref.designId)}>{ref.name}</button>)}</div><small>如需回到本轮之前，可用 ⌘/Ctrl+Z 撤销这一轮。</small></div>}
          {(turn.state === 'failed' || turn.state === 'cancelled') && <button type="button" className="rea-agent-retry" disabled={busy} onClick={() => { setPrompt(turn.text); input.current?.focus(); }}><RotateCcw size={13} />修改需求后重试</button>}
        </div>
      </article>)}
    </div>
    <div className="rea-agent-composer">{notice && <p role="alert" className="rea-agent-error">{notice}</p>}
      <HomeComposer onManageSystem={props.onEditSystem} inputRef={input} prompt={prompt} onPrompt={setPrompt} onSend={() => void send()} onStop={() => void stop()} sendKey={sendKey} running={task.running || preparing} preparing={!loaded} busy={!loaded} systems={systems} selectedSystem={model.current?.system?.id ?? ''} onSystem={onSystem} lockedSystem={model.current?.system ? `${model.current.system.name} · v${model.current.system.revision}` : undefined} config={config} onAgentSettings={() => void openSettings()} project={project} onProject={() => setDialog('project')} attachments={attachments} onAttach={() => fileInput.current?.click()} onRemoveAttachment={index => setAttachments(items => items.filter((_, i) => index !== i))} references={references} onReferences={() => { void model.storage.listDocuments().then(setDocuments).then(() => setDialog('references')).catch(error => setNotice(String(error))); }} onRemoveReference={id => setReferences(items => items.filter(ref => ref.id !== id))} elements={canvas.refs} onRemoveElement={ref => canvas.removeRef(ref.pageId, ref.designId)} onToggleElement={ref => canvas.toggleSubtree(ref.pageId, ref.designId)} />
    </div>
    <input ref={fileInput} type="file" hidden multiple accept=".reaui,.md,.txt,.css,.json,.tsx,.jsx,.ts,.js" aria-label="选择设计参考文件" onChange={event => { const files = Array.from(event.currentTarget.files ?? []); if (attachments.length + references.length + files.length > 6) setNotice('参考文件和引用项目合计最多 6 项。'); else setAttachments(items => [...items, ...files]); event.currentTarget.value = ''; }} />
    {sessionMenu && sessionButton.current && store && <SessionMenu anchor={sessionButton.current} store={store} onSelect={switchSession} onDelete={next => { setSessionMenu(false); setDeleting(next); }} onNew={newSession} onClose={() => setSessionMenu(false)} />}
    {deleting && <Dialog title="删除会话" onClose={() => setDeleting(null)}><p className="text-xs leading-6">删除「{deleting.title}」后，这段对话记录会从当前文档中移除，且无法撤销。设计内容与画布不受影响。</p><div className="rea-dialog-actions"><Button onClick={() => setDeleting(null)}>取消</Button><Button onClick={deleteSession}>删除会话</Button></div></Dialog>}
    {settingsOpen && <div className="rs-overlay"><SettingsApp onClose={() => setSettingsOpen(false)} /></div>}
    {dialog === 'project' && <ProjectDialog project={project} initialPath={project?.path ?? ''} onSelect={next => { onProject(next); setDialog(null); }} onClose={() => setDialog(null)} />}
    {dialog === 'references' && <ReferenceProjectsDialog documents={documents} selected={references} limit={6 - attachments.length} onConfirm={items => { setReferences(items); setDialog(null); }} onClose={() => setDialog(null)} />}
  </section>;
}
