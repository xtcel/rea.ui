import { useState } from 'react';
import { Check, FolderOpen, LoaderCircle, Unplug } from 'lucide-react';
import { Dialog } from '../ui';
import { isDesktop } from '../platform';
import { agentRequest, selectProject } from './client';
import type { ProjectContext } from './client';

export function ProjectDialog({ project, initialPath, onSelect, onClose }: { project: ProjectContext | null; initialPath: string; onSelect: (project: ProjectContext | null) => void; onClose: () => void }) {
  const [path, setPath] = useState(project?.path ?? (/^(\/|[a-z]:\\)/i.test(initialPath) ? initialPath : ''));
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<ProjectContext | null>(project);
  const [error, setError] = useState('');
  async function inspect(next = path) {
    setPending(true); setError('');
    try { const context = await agentRequest<ProjectContext>('project', { path: next }); setPreview(context); setPath(context.path); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); setPreview(null); }
    finally { setPending(false); }
  }
  return <Dialog title="关联本地项目代码" onClose={onClose}><form className="home-create-form agent-project-dialog" onSubmit={e => { e.preventDefault(); void inspect(); }}>
    <p>将项目中的组件、样式和设计规范作为生成参考。</p>
    <label>项目路径<input autoFocus value={path} placeholder="例如 /Users/you/workspace/my-app" onChange={e => { setPath(e.currentTarget.value); setPreview(null); }} /></label>
    <div className="agent-project-actions">{isDesktop() && <button type="button" className="home-secondary-button" disabled={pending} onClick={() => void selectProject().then(next => { if (next) void inspect(next); }).catch(e => setError(String(e)))}><FolderOpen size={15} />浏览文件夹</button>}<button type="submit" className="home-secondary-button" disabled={pending || !path.trim()}>{pending ? <LoaderCircle size={15} /> : <FolderOpen size={15} />}{pending ? '正在读取…' : '读取项目'}</button></div>
    {preview && <div className="agent-project-preview"><strong>{preview.name}</strong><small>{preview.path}</small><p>已读取 {preview.files.length} 个参考文件{preview.truncated ? '（已限制上下文大小）' : ''}</p><ul>{preview.files.map(file => <li key={file}>{file}</li>)}</ul></div>}
    {error && <p className="home-inline-error" role="alert">{error}</p>}
    <p className="home-field-hint">关联代码仅用于参考。生成的设计作为新项目保存，可继续编辑和导出。</p>
    <div className="home-dialog-actions">{project && <button type="button" className="home-secondary-button" onClick={() => onSelect(null)}><Unplug size={14} />取消关联</button>}<button type="button" className="home-primary-button" disabled={!preview || pending} onClick={() => onSelect(preview)}><Check size={14} />关联项目</button></div>
  </form></Dialog>;
}
