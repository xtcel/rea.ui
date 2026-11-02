import { useEffect, useRef, useState } from 'react';
import { Copy, Download, FolderOpen, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import type { DocumentSummary } from '@rea/storage';
import type { DocumentModel } from '../session/useDocument';
import { IconButton } from './IconButton';

export function DocumentListDialog({ model, onClose, onExport }: { model: DocumentModel; onClose: () => void; onExport: () => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null), [deleting, setDeleting] = useState<string | null>(null);
  const [newName, setNewName] = useState('未命名文档');
  async function refresh() { setDocuments(await model.storage.listDocuments()); }
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (element && !element.open) element.showModal();
    void refresh().catch(error => setError(String(error)));
    return () => {
      // StrictMode rehearses effects while this dialog remains mounted.
      // Only an actual unmount should close it and return focus.
      if (element?.isConnected) return;
      element?.close();
      const target = trigger?.isConnected ? trigger : document.querySelector<HTMLElement>('[data-document-trigger]');
      target?.focus({ preventScroll: true });
    };
  }, []);
  async function run(action: () => Promise<unknown>, close = false) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); if (close) onClose(); else await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="document-dialog" aria-labelledby="document-dialog-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} onClose={onClose}>
    <header><h2 id="document-dialog-title">本地文档</h2><IconButton label="关闭文档列表" disabled={busy} onClick={onClose}><X size={18} /></IconButton></header>
    <p className="document-dialog-help">文档保存在此浏览器中。导出 .reaui 可备份，或在另一台设备导入继续编辑。</p>
    <form className="document-create" onSubmit={event => { event.preventDefault(); if (newName.trim()) void run(() => model.create(newName.trim()), true); }}>
      <input aria-label="新文档名称" value={newName} maxLength={120} disabled={busy} onChange={event => setNewName(event.currentTarget.value)} />
      <button className="export-button" type="submit" disabled={busy || !newName.trim()}><Plus size={14} />新建文档</button>
    </form>
    <div className="document-file-actions">
      <button type="button" className="export-button" disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={14} />导入文件</button>
      <button type="button" className="export-button" disabled={busy} onClick={() => void run(onExport)}><Download size={14} />导出当前文档</button>
      <input ref={fileInput} type="file" accept=".reaui,.tsx" aria-label="导入 .reaui 或旧 .design.tsx" hidden onChange={event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = '';
        if (file) void run(() => model.importFile(file), true);
      }} />
    </div>
    {error && <p role="alert" className="document-dialog-error">{error}</p>}
    <div className="document-list" aria-label="已保存的文档" aria-busy={busy}>
      {documents.length === 0 && <p className="document-dialog-help">暂无已保存的文档，可以新建或导入。</p>}
      {documents.map(doc => <article className="document-row" key={doc.id}>
        {editing === doc.id ? <form className="document-rename" onSubmit={event => {
          event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
          if (name) void run(async () => { await model.rename(doc.id, name); setEditing(null); });
        }}><input autoFocus aria-label="修改文档名称" name="name" defaultValue={doc.name} maxLength={120} disabled={busy} /><button className="export-button" disabled={busy}>保存</button><button type="button" className="export-button" onClick={() => setEditing(null)}>取消</button></form> : <>
          <button type="button" className="document-open" disabled={busy} onClick={() => void run(() => model.open(doc.id), true)}>
            <FolderOpen size={18} /><span><strong>{doc.name}</strong><small>{new Date(doc.updatedAt).toLocaleString('zh-CN')}{doc.id === model.current?.manifest.id ? ' · 当前文档' : ''}</small></span>
          </button>
          <div className="document-row-actions">
            <IconButton label={`重命名 ${doc.name}`} disabled={busy} onClick={() => { setEditing(doc.id); setDeleting(null); }}><Pencil size={14} /></IconButton>
            <IconButton label={`复制 ${doc.name}`} disabled={busy} onClick={() => void run(() => model.duplicate(doc.id))}><Copy size={14} /></IconButton>
            <IconButton label={`删除 ${doc.name}`} disabled={busy} onClick={() => setDeleting(deleting === doc.id ? null : doc.id)}><Trash2 size={14} /></IconButton>
          </div>
        </>}
        {deleting === doc.id && <div className="document-delete-confirm"><span>删除“{doc.name}”及其资源？此操作无法撤销。</span><button type="button" className="export-button" disabled={busy} onClick={() => void run(async () => { await model.remove(doc.id); setDeleting(null); })}>确认删除</button><button className="export-button" type="button" onClick={() => setDeleting(null)}>取消</button></div>}
      </article>)}
    </div>
    <footer role="status">{busy ? '正在处理…' : '支持 .reaui 文档及旧版 .design.tsx 文件'}</footer>
  </dialog>;
}
