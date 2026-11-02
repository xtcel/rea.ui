import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from './IconButton';

export function SourcePanel({ source, filename }: { source: string; filename: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(source); setCopyState('copied'); }
    catch { setCopyState('failed'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="source-panel" aria-label="设计源码">
    <div className="source-toolbar"><FileCode2 size={16} /><span>{filename}</span><span className="read-only-label">只读</span>
      <div className="source-actions"><span role="status">{copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败，请手动选择文本' : ''}</span>
        <IconButton label="复制源码" onClick={copy}>{copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}</IconButton>
        <IconButton label="下载 TSX 文件" onClick={download}><Download size={16} /></IconButton>
      </div>
    </div>
    <div className="source-scroll" tabIndex={0} aria-label="只读 TSX 源码">
      <pre className="source-lines" aria-hidden="true">{source.split('\n').map((_, index) => index + 1).join('\n')}</pre>
      <pre className="source-code"><code>{source}</code></pre>
    </div>
  </section>;
}
