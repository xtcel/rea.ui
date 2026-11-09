import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { previewSystemUpdate, systemVersions, unpinTransaction } from '@rea/storage';
import type { LocalSystemVersion, SystemChange } from '@rea/storage';
import type { Transaction } from '@rea/document';
import type { DocumentModel } from '../session/useDocument';
import { Button, Dialog } from '../ui';

interface Pending { version: LocalSystemVersion; changes: SystemChange[]; conflicts: string[]; transaction: Transaction | null }
const shortHash = (hash: string) => hash.slice(0, 8);
const stamp = (iso: string) => new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });

/**
 * Document-scoped design system surface: pin a published revision, preview an upgrade as a
 * diff, and unpin. The workbench owns authoring and publishing; this dialog only binds a
 * version to the open document, and every change goes through one undoable transaction.
 */
export function DesignSystemDialog({ model, onClose }: { model: DocumentModel; onClose: () => void }) {
  const session = model.current!;
  const pinned = session.system;
  const [versions, setVersions] = useState<LocalSystemVersion[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void systemVersions(model.storage).then(setVersions).catch(next => setError(String(next))); }, [model.storage]);
  function choose(version: LocalSystemVersion) { setError(''); setPending({ version, ...previewSystemUpdate(session, version) }); }
  function apply() {
    if (!pending?.transaction) return;
    setBusy(true);
    try { if (model.transact(pending.transaction)) onClose(); }
    finally { setBusy(false); }
  }
  function unpin() {
    setBusy(true);
    try { if (model.transact(unpinTransaction())) onClose(); }
    finally { setBusy(false); }
  }
  // One row per published system, newest revision first; every revision stays selectable so a
  // document can deliberately return to an older version instead of only moving forward.
  const groups = [...new Set(versions.map(version => version.id))]
    .map(id => versions.filter(version => version.id === id).sort((left, right) => right.revision - left.revision));
  return <Dialog title={pending ? '版本变更' : '设计系统'} onClose={onClose}>
    {pending ? <>
      <div className="rea-ds-heading"><Button onClick={() => setPending(null)}><ArrowLeft size={13} />返回版本列表</Button><span>{pending.version.payload.name} · v{pending.version.revision}</span></div>
      {pending.changes.length
        ? <ul className="rea-ds-changes">{pending.changes.map((change, index) => <li key={index}><span>{change.label}</span><code>{change.path}</code><small>{change.from ? `${change.from} → ${change.to}` : change.to ?? ''}</small></li>)}</ul>
        : <p className="rea-field-help">令牌与组件规范没有变化。</p>}
      {pending.conflicts.map(message => <p key={message} className="rea-component-error" role="alert">{message}</p>)}
      <div className="rea-dialog-actions"><Button onClick={() => setPending(null)}>取消</Button><Button disabled={busy || !pending.transaction} onClick={apply}>{pinned ? '应用此版本' : '固定此版本'}</Button></div>
    </> : <>
      <div className="rea-ds-pinned">
        <div><small>当前文档</small>{pinned ? <strong>{pinned.name} · v{pinned.revision}</strong> : <strong>未固定</strong>}{pinned && <code>{shortHash(pinned.hash)}</code>}</div>
        {pinned && <Button disabled={busy} onClick={unpin}>取消固定</Button>}
      </div>
      {groups.length ? groups.map(group => <section key={group[0].id} className="rea-ds-versions">
        <header><strong>{group[0].payload.name}</strong><small>{group[0].payload.description ?? ''}</small></header>
        <ul>{group.map(version => {
          const active = pinned?.hash === version.hash;
          return <li key={version.revision} className={active ? 'is-active' : ''}>
            <span className="rea-ds-version-tag">v{version.revision}</span>
            <span className="rea-ds-version-meta"><code>{shortHash(version.hash)}</code><small>{stamp(version.publishedAt)}</small></span>
            {active ? <span className="rea-ds-version-active">已固定</span> : <Button disabled={busy} onClick={() => choose(version)}>{!pinned ? '固定' : version.revision > pinned.revision ? '升级' : '切换'}</Button>}
          </li>;
        })}</ul>
      </section>) : <p className="rea-field-help">还没有发布版本。到设计系统里发布一个版本后就能固定到当前文档。</p>}
      {error && <p className="rea-component-error" role="alert">{error}</p>}
    </>}
  </Dialog>;
}
