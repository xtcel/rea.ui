import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Download, FolderOpen, LoaderCircle, Plus, Save, Sparkles, Square, Trash2, Upload } from 'lucide-react';
import { CANONICAL_COLOR_ROLES, CANONICAL_TYPE_ROLES, exportDesignMarkdown, importDesignMarkdown, legacySystemToPackage } from '@rea/design-system';
import type { DesignSystemTokens, TypeToken } from '@rea/design-system';
import { publishSystem, systemVersions } from '@rea/storage';
import type { LocalSystemVersion, StorageService } from '@rea/storage';
import { defaultComponents, parseGeneratedSystem, resolvedSystem, systemSchema } from './designSystem';
import type { DesignComponent, DesignSystem } from './designSystem';
import type { AgentConfig, ProjectContext } from './client';
import { useAgentTask } from './useAgentTask';

const baseColors: [string, string][] = [['primary', '主色'], ['background', '背景'], ['surface', '表面'], ['text', '正文'], ['muted', '次要文字'], ['border', '边框']];
const shortHash = (hash: string) => hash.slice(0, 8);
const publishedDate = (iso: string) => new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
/** A record only claims its revision while the stored hash still matches the current tokens. */
function publishedRevision(system: DesignSystem): number | null {
  try { return typeof system.revision === 'number' && system.revision >= 1 && system.hash === legacySystemToPackage(system).hash ? system.revision : null; }
  catch { return null; }
}
const firstUnused = (candidates: readonly string[], used: string[]) => candidates.find(role => !used.includes(role));

export function SystemWorkbench({ system, storage, config, project, onProject, onSave, onUse, onClose, onDelete, isBuiltIn, onOpenComponents }: {
  system: DesignSystem; storage: StorageService; config: AgentConfig; project: ProjectContext | null; onProject: () => void;
  onSave: (system: DesignSystem) => void; onUse: (system: DesignSystem) => void; onClose: () => void; onDelete?: () => void; isBuiltIn: boolean; onOpenComponents?:()=>void;
}) {
  const [draft, setDraft] = useState(() => resolvedSystem(system));
  const [tab, setTab] = useState<'foundations' | 'components' | 'guidelines' | 'versions'>('foundations');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [previewPressed, setPreviewPressed] = useState(false);
  const [confirmedDelete, setConfirmedDelete] = useState(false);
  const [versions, setVersions] = useState<LocalSystemVersion[]>([]);
  const [publishing, setPublishing] = useState(false);
  const markdownInput = useRef<HTMLInputElement>(null);
  const task = useAgentTask();
  const t = draft.tokens;
  const revision = publishedRevision(draft);
  const extraColors = Object.keys(t.color).filter(key => !baseColors.some(([base]) => base === key));
  const roles = Object.entries(t.typography.roles);
  function loadVersions(id: string) {
    void systemVersions(storage)
      .then(list => setVersions(list.filter(version => version.id === id).sort((left, right) => right.revision - left.revision)))
      .catch(next => setError(String(next)));
  }
  useEffect(() => { loadVersions(system.id); }, [storage, system.id]);
  function update(next: Partial<DesignSystem>) { setDraft(s => resolvedSystem({ ...s, ...next })); setNotice(''); }
  function setTokens(next: DesignSystemTokens) { update({ tokens: next }); }
  function setColor(key: string, value: string) { setTokens({ ...t, color: { ...t.color, [key]: value } }); }
  function removeColor(key: string) { const color = { ...t.color }; delete color[key as keyof typeof color]; setTokens({ ...t, color }); }
  function addColor() {
    const key = firstUnused(CANONICAL_COLOR_ROLES, Object.keys(t.color));
    if (!key) { setError('常用语义角色已全部添加。'); return; }
    setTokens({ ...t, color: { ...t.color, [key]: t.color.muted } });
  }
  function setRole(role: string, patch: Partial<TypeToken>) {
    setTokens({ ...t, typography: { ...t.typography, roles: { ...t.typography.roles, [role]: { ...t.typography.roles[role], ...patch } } } });
  }
  function removeRole(role: string) {
    if (role === 'body') { setError('body 是必需角色，不能删除。'); return; }
    const next = { ...t.typography.roles }; delete next[role];
    setTokens({ ...t, typography: { ...t.typography, roles: next } });
  }
  function addRole() {
    const role = firstUnused(CANONICAL_TYPE_ROLES, Object.keys(t.typography.roles)) ?? `role-${Object.keys(t.typography.roles).length + 1}`;
    setTokens({ ...t, typography: { ...t.typography, roles: { ...t.typography.roles, [role]: { size: 14, lineHeight: 1.5, weight: 400 } } } });
  }
  function setRadius(key: 'sm' | 'md' | 'lg' | 'xl', value: number) { setTokens({ ...t, radius: { ...t.radius, [key]: value } }); }
  function setMotion(kind: 'fast' | 'normal' | 'slow', value: number) {
    const motion = t.motion ?? { duration: { fast: 120, normal: 200, slow: 320 }, easing: { standard: 'cubic-bezier(0.4, 0, 0.2, 1)' } };
    setTokens({ ...t, motion: { ...motion, duration: { ...motion.duration, [kind]: value } } });
  }
  function save(use = false) {
    const name = draft.name.trim();
    if (!name) { setError('请填写设计系统名称。'); return; }
    try {
      // Saving without edits must not invalidate a published revision (or upgrade a v1 snapshot).
      if (!isBuiltIn) {
        const original = legacySystemToPackage(system);
        const current = legacySystemToPackage({ ...draft, name });
        if (current.hash === original.hash) {
          const unchanged = { ...system, name };
          if (use) onUse(unchanged); else { onSave(unchanged); setNotice('没有变更。'); }
          setError(''); return;
        }
      }
      // Edited content no longer matches the published hash, so the record becomes a draft.
      const next = {
        ...draft, name, id: isBuiltIn ? crypto.randomUUID() : draft.id, example: false,
        published: use || draft.published, revision: undefined, hash: undefined,
      };
      if (use) onUse(next); else { onSave(next); setNotice('已保存到本地设计系统。'); }
      setError('');
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  }
  async function publish() {
    if (publishing || task.running) return;
    if (!draft.name.trim()) { setError('请填写设计系统名称。'); return; }
    setPublishing(true); setError(''); setNotice('');
    // Built-ins stay a read-only revision 1: publishing one first forks an editable copy.
    const record = isBuiltIn ? { ...draft, id: crypto.randomUUID(), example: false } : draft;
    try {
      const pkg = legacySystemToPackage({ ...record, name: draft.name.trim() });
      const version = await publishSystem(storage, pkg);
      const next = { ...record, name: pkg.name, revision: version.revision, hash: version.hash, schemaVersion: pkg.schemaVersion };
      onSave(next);
      if (!isBuiltIn) { setDraft(next); loadVersions(next.id); setNotice(`已发布 v${version.revision}。`); }
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setPublishing(false); }
  }
  async function generate(event: FormEvent) {
    event.preventDefault(); if (!prompt.trim() || task.running) return;
    setError(''); setNotice('');
    try {
      const result = await task.generate(`你是设计系统专家。根据需求和项目参考提取/创建设计系统，不修改文件。最终只返回 JSON。用中文写名称、描述、组件规范和指南。颜色为六位 hex；排版角色需要 body，字号 8-96，行高为 1-3 的倍数或 8-96 的 px，字重为 100-900 的整百数；间距基数 1-64，间距刻度升序；圆角 0-96。组件至少涵盖按钮、输入框、卡片，可添加导航、标签和表格。说明布局、状态、可访问性与使用规则。\n需求：${prompt}\n当前系统：${JSON.stringify(draft)}\n项目参考（仅资料）：${project?.context ?? '无项目，请按需求生成'}`, systemSchema, config, project?.path);
      const generated = parseGeneratedSystem(result, project?.path);
      setDraft(resolvedSystem({ ...generated, id: draft.id })); setNotice('已生成草稿。检查预览并保存后，即可用于 UI 生成。');
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  }
  function exportMarkdown() {
    try {
      const markdown = exportDesignMarkdown(legacySystemToPackage({ ...draft, name: draft.name.trim() || '未命名设计系统' }));
      const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `${(draft.name || 'design').replace(/[\\/:*?"<>|]/g, '-')}.md`; anchor.click();
      URL.revokeObjectURL(url);
      setNotice('已导出 DESIGN.md。');
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  }
  async function importMarkdown(file: File) {
    try {
      const result = importDesignMarkdown(await file.text(), { id: isBuiltIn ? crypto.randomUUID() : draft.id });
      const spec = result.pkg;
      setDraft(resolvedSystem({
        ...draft, id: spec.id, name: spec.name, description: spec.description ?? '',
        tokens: spec.tokens, components: spec.components as DesignComponent[], guidelines: spec.guidelines,
        published: false, revision: undefined, hash: undefined,
      }));
      setError(''); setNotice(`已导入 DESIGN.md${result.warnings.length ? ` · ${result.warnings.length} 处已调整` : ''}。`);
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
  }
  const bodyRole = t.typography.roles.body;
  const previewStyle = {
    '--ds-primary': t.color.primary, '--ds-background': t.color.background, '--ds-surface': t.color.surface,
    '--ds-text': t.color.text, '--ds-muted': t.color.muted, '--ds-border': t.color.border,
    '--ds-radius': `${t.radius.md}px`, '--ds-space': `${t.space.unit}px`,
    fontFamily: t.typography.family, fontSize: `${bodyRole.size}px`,
  } as CSSProperties;
  return <section className="system-workbench">
    <header className="system-workbench-heading"><div><button type="button" className="home-text-button" onClick={onClose}><ArrowLeft size={15} />设计系统</button><h1>{draft.name || '新设计系统'}</h1><p>{revision ? `v${revision} · ${draft.published ? '已启用' : '未启用'}` : '未发布'} · 配置规范，并查看它们如何呈现在界面中。</p></div><div className="system-heading-actions">{onOpenComponents&&<button type="button" className="home-secondary-button" onClick={onOpenComponents}>本地组件资源</button>}
      <button type="button" className="home-text-button" onClick={() => markdownInput.current?.click()}><Upload size={14} />导入 DESIGN.md</button>
      <button type="button" className="home-text-button" onClick={exportMarkdown}><Download size={14} />导出 DESIGN.md</button>
      <button type="button" className="home-secondary-button" disabled={publishing || task.running} onClick={() => void publish()}><Upload size={15} />{publishing ? '发布中…' : isBuiltIn ? '复制并发布' : '发布版本'}</button><button type="button" className="home-secondary-button" disabled={task.running} onClick={() => save()}><Save size={15} />{isBuiltIn ? '保存为副本' : '保存'}</button><button type="button" className="home-primary-button" disabled={task.running} onClick={() => save(true)}><Check size={15} />用于 UI 生成</button></div></header>
    <div className="system-workbench-body"><aside className="system-config">
      <form className="system-ai-form" onSubmit={event => void generate(event)}><label htmlFor="system-ai-prompt"><Sparkles size={15} />用 AI 生成或调整</label><textarea id="system-ai-prompt" value={prompt} onChange={e => setPrompt(e.currentTarget.value)} rows={3} maxLength={6000} placeholder="描述品牌与风格，或从关联项目提取设计规范…" /><button type="button" className="home-text-button system-project-link" onClick={onProject}><FolderOpen size={14} />{project?.name || '关联本地项目'}</button><div className="system-ai-actions"><small>Codex CLI</small>{task.running ? <button type="button" className="home-secondary-button" onClick={() => void task.cancel().catch(e => setError(String(e)))}><Square size={12} />停止</button> : <button className="home-primary-button" type="submit" disabled={!prompt.trim()}><Sparkles size={14} />生成设计系统</button>}</div>{task.running && <p role="status" className="agent-progress"><LoaderCircle size={14} />{task.status?.events.at(-1)}</p>}</form>
      <div className="system-config-fields"><label>名称<input value={draft.name} maxLength={120} onChange={e => update({ name: e.currentTarget.value })} /></label><label>描述<textarea rows={2} value={draft.description} maxLength={2000} onChange={e => update({ description: e.currentTarget.value })} /></label><label className="system-publish"><input type="checkbox" checked={draft.published} onChange={e => update({ published: e.currentTarget.checked })} /><span>启用此设计系统<small>启用后可在生成 UI 时选择</small></span></label></div>
      <nav className="system-section-nav" aria-label="设计系统配置">{([['foundations', '基础样式'], ['components', '组件规范'], ['guidelines', '使用指南'], ['versions', `版本${versions.length ? ` ${versions.length}` : ''}`]] as const).map(([id, label]) => <button type="button" key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}<ArrowUpRight size={13} /></button>)}</nav>
      {tab === 'foundations' ? <div className="system-config-fields">
        <h2>语义配色</h2>
        <div className="system-color-fields">{baseColors.map(([key, label]) => <label key={key}><input type="color" value={String(t.color[key as keyof typeof t.color] ?? '#000000')} onChange={e => setColor(key, e.currentTarget.value)} /><span>{label}<small>{String(t.color[key as keyof typeof t.color] ?? '').toUpperCase()}</small></span></label>)}</div>
        <h2>语义角色</h2>
        <div className="system-role-rows">{extraColors.map(key => <div key={key} className="system-role-row"><code>{key}</code><input type="color" value={String(t.color[key as keyof typeof t.color])} onChange={e => setColor(key, e.currentTarget.value)} /><input value={String(t.color[key as keyof typeof t.color])} maxLength={80} onChange={e => setColor(key, e.currentTarget.value)} /><button type="button" className="home-text-button" aria-label={`移除语义角色 ${key}`} onClick={() => removeColor(key)}><Trash2 size={13} /></button></div>)}</div>
        <button type="button" className="home-secondary-button" onClick={addColor}><Plus size={14} />添加语义角色</button>
        <h2>排版阶梯</h2>
        <div className="system-type-rows">{roles.map(([role, value]) => <div key={role} className="system-type-row"><code>{role}</code>{([['size', '字号', 8, 96], ['lineHeight', '行高', 1, 96], ['weight', '字重', 100, 900]] as const).map(([field, label, min, max]) => <label key={field}>{label}<input type="number" min={min} max={max} step={field === 'lineHeight' ? 0.01 : field === 'weight' ? 100 : 1} value={value[field]} onChange={e => setRole(role, { [field]: Number(e.currentTarget.value) })} /></label>)}<button type="button" className="home-text-button" aria-label={`移除排版角色 ${role}`} disabled={role === 'body'} onClick={() => removeRole(role)}><Trash2 size={13} /></button></div>)}</div>
        <button type="button" className="home-secondary-button" onClick={addRole}><Plus size={14} />添加排版角色</button>
        <h2>字体与圆角</h2>
        <label>字体栈<input value={t.typography.family} maxLength={240} onChange={e => setTokens({ ...t, typography: { ...t.typography, family: e.currentTarget.value } })} /></label>
        <div className="system-numeric-fields">{([['sm', '小圆角', 0, 96], ['md', '控件圆角', 0, 96], ['lg', '容器圆角', 0, 96], ['xl', '大圆角', 0, 96]] as const).map(([key, label, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} value={t.radius[key] ?? 0} onChange={e => setRadius(key, Math.max(min, Math.min(max, Number(e.currentTarget.value))))} /></label>)}</div>
        <h2>动效</h2>
        <div className="system-numeric-fields">{([['fast', '快', 0, 2000], ['normal', '常规', 0, 2000], ['slow', '慢', 0, 2000]] as const).map(([key, label, min, max]) => <label key={key}>{label}（ms）<input type="number" min={min} max={max} value={t.motion?.duration[key] ?? (key === 'fast' ? 120 : key === 'normal' ? 200 : 320)} onChange={e => setMotion(key, Math.max(min, Math.min(max, Number(e.currentTarget.value))))} /></label>)}</div>
      </div>
        : tab === 'components' ? <div className="system-config-fields"><h2>组件规范</h2>{draft.components.map((c, i) => <div key={i} className="system-component-config"><label>组件名称<input value={c.name} maxLength={120} onChange={e => update({ components: draft.components.map((old, index) => index === i ? { ...old, name: e.currentTarget.value } : old) })} /></label><label>视觉与使用规则<textarea rows={3} value={c.description} maxLength={2000} onChange={e => update({ components: draft.components.map((old, index) => index === i ? { ...old, description: e.currentTarget.value } : old) })} /></label>{c.tokens && <small>{Object.entries(c.tokens).map(([slot, path]) => `${slot} → ${path}`).join(' · ')}</small>}<button type="button" className="home-text-button" disabled={draft.components.length < 2} onClick={() => update({ components: draft.components.filter((_, index) => index !== i) })}><Trash2 size={13} />移除</button></div>)}<button type="button" className="home-secondary-button" disabled={draft.components.length >= 24} onClick={() => update({ components: [...draft.components, { ...defaultComponents[0], name: '新组件' }] })}><Plus size={14} />添加规范</button></div>
          : tab === 'versions' ? <div className="system-config-fields"><h2>已发布版本</h2><ul className="system-version-list">{isBuiltIn && <li key="builtin"><span className="system-version-revision">v1</span><span className="system-version-meta"><code>{shortHash(draft.hash ?? '')}</code><small>内置 · 只读</small></span></li>}{versions.map(version => <li key={version.revision}><span className="system-version-revision">v{version.revision}</span><span className="system-version-meta"><code>{shortHash(version.hash)}</code><small>{publishedDate(version.publishedAt)}</small></span>{version.hash === draft.hash && <span className="system-version-badge">当前</span>}</li>)}</ul>{!versions.length && !isBuiltIn && <p className="system-version-empty">还没有发布版本。发布后可在编辑器里固定到当前文档。</p>}{isBuiltIn && <p className="system-version-empty">内置系统只读；修改后保存为副本再发布。</p>}</div>
            : <div className="system-config-fields"><label>设计与使用指南<textarea rows={12} maxLength={16000} value={draft.guidelines} onChange={e => update({ guidelines: e.currentTarget.value })} /></label><p className="home-field-hint">这些规则会和令牌、组件规范一起传给生成 Agent。</p></div>}
      {onDelete && <div className="system-delete"><button type="button" className="home-text-button" disabled={task.running} onClick={() => { if (confirmedDelete) onDelete(); else setConfirmedDelete(true); }}><Trash2 size={14} />{confirmedDelete ? '确认删除设计系统' : '删除设计系统'}</button></div>}
    </aside><div className="system-live-preview"><header><h2>实时预览</h2><span>颜色、排版阶梯与布局令牌</span></header>
      <div className="system-preview-canvas" style={previewStyle}>
        {tab === 'guidelines' ? <article className="ds-guidelines"><h2>使用指南</h2><p>{draft.guidelines}</p></article> : <>
          <section className="ds-type-specimen"><h2>为一致的体验而设计。</h2><p>清晰的文字与有节奏的留白，让每个界面表达同一种语言。</p><div className="ds-type-sizes">{roles.slice(0, 4).map(([role, value]) => <span key={role}>{role} {value.size}/{value.lineHeight}</span>)}<span>间距 {t.space.unit}px · 控件圆角 {t.radius.md}px</span></div></section>
          <section className="ds-colors" aria-label="语义配色预览">{baseColors.map(([key, label]) => <div key={key}><i style={{ background: String(t.color[key as keyof typeof t.color]) }} /><strong>{label}</strong><small>{String(t.color[key as keyof typeof t.color]).toUpperCase()}</small></div>)}</section>
          <section className="ds-components"><h3>操作与输入</h3><div className="ds-button-row"><button type="button" className="ds-primary" onClick={() => setPreviewPressed(!previewPressed)}>{previewPressed ? '已确认' : '主要操作'}<Check size={14} /></button><button type="button" className="ds-secondary" onClick={() => setPreviewPressed(false)}>次要操作</button><button type="button" className="ds-primary" disabled>不可用</button></div><label className="ds-input">项目名称<input placeholder="为你的下一个想法命名" /></label><label className="ds-checkbox"><input type="checkbox" defaultChecked />接收项目更新</label><div className="ds-card"><span className="ds-status">进行中</span><h3>下一个好设计</h3><p>从一个清晰的目标开始，用一致的规范把想法变成作品。</p><button type="button" className="ds-text-action" onClick={() => setPreviewPressed(!previewPressed)}>{previewPressed ? '已添加到项目' : '查看项目'}<ArrowUpRight size={14} /></button></div></section>
          {tab === 'components' && <section className="ds-component-rules"><h3>生成时使用的组件规范</h3>{draft.components.map((c, i) => <div key={i}><strong>{c.name}</strong><p>{c.description}</p></div>)}</section>}
        </>}
      </div>
    </div></div>
    <input ref={markdownInput} type="file" accept=".md,text/markdown" hidden aria-label="导入 DESIGN.md" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void importMarkdown(file); }} />
    {error && <div className="home-error" role="alert">{error}</div>}{notice && <div className="system-notice" role="status"><Check size={15} />{notice}</div>}
  </section>;
}
