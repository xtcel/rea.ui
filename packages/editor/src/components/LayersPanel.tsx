import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Frame as FrameIcon, Type, PenTool, LockKeyhole, EyeOff, X } from 'lucide-react';
import { useState } from 'react';
import type { IndexedNode, InspectedPage } from '@rea/design';
import { IconButton } from './IconButton';

interface Props {
  pages: readonly InspectedPage[];
  page: InspectedPage;
  onPageAction: (type: 'add' | 'duplicate' | 'delete' | 'up' | 'down') => void;
  pageId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPageChange: (id: string) => void;
  onClose: () => void;
}

export function LayersPanel({ pages, page, pageId, selectedId, onSelect, onPageChange, onClose, onPageAction }: Props) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  function toggle(id: string) {
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function row(node: IndexedNode, depth: number) {
    const expanded = !collapsed.has(node.id);
    const Icon = node.kind === 'Text' ? Type : node.kind === 'Vector' ? PenTool : FrameIcon;
    return <li key={node.id}>
      <div className={`layer-row ${selectedId === node.id ? 'is-selected' : ''}`}
        style={{ paddingLeft: 10 + depth * 16 }}>
        {node.children.length ? <button className="tree-disclosure" type="button"
          aria-label={`${expanded ? '折叠' : '展开'} ${node.name}`} aria-expanded={expanded}
          onClick={() => toggle(node.id)}>{expanded ? <ChevronDown /> : <ChevronRight />}</button>
          : <span className="tree-disclosure-placeholder" />}
        <button type="button" className="layer-select" onClick={() => onSelect(node.id)}
          aria-pressed={selectedId === node.id}>
          <Icon size={14} /><span>{node.name}</span>
          {node.locked && <LockKeyhole size={12} aria-label="已锁定" />}
          {node.hidden && <EyeOff size={12} aria-label="已隐藏" />}
        </button>
      </div>
      {expanded && node.children.length > 0 && <ul className="layer-tree">
        {node.children.map(id => row(page.nodes.get(id)!, depth + 1))}
      </ul>}
    </li>;
  }

  return <aside className="panel layers-panel" aria-label="图层面板">
    <div className="panel-heading"><h2>页面</h2><IconButton label="关闭图层面板" onClick={onClose} className="panel-close"><X size={16} /></IconButton></div>
    <nav className="page-list" aria-label="页面">
      {pages.map(item => <button type="button" key={item.id}
        className={`page-row ${pageId === item.id ? 'is-current' : ''}`}
        aria-current={pageId === item.id ? 'page' : undefined}
        onClick={() => onPageChange(item.id)}>
        <span className="page-dot" /><span>{item.name || item.id}</span>
        <span className="page-count">{[...item.nodes.values()].filter(n => n.kind === 'Frame' && n.parentId === item.source.props.designId).length}</span>
      </button>)}
    </nav>
    <div className="page-actions" aria-label="页面操作">
      <button type="button" onClick={() => onPageAction('add')}>新增</button>
      <button type="button" onClick={() => onPageAction('duplicate')}>复制</button>
      <button type="button" disabled={pages.length < 2} onClick={() => onPageAction('delete')}>删除</button>
      <button type="button" aria-label="页面上移" disabled={pages[0]?.id === pageId} onClick={() => onPageAction('up')}><ArrowUp size={12} /></button>
      <button type="button" aria-label="页面下移" disabled={pages.at(-1)?.id === pageId} onClick={() => onPageAction('down')}><ArrowDown size={12} /></button>
    </div>
    <div className="panel-heading layers-heading"><h2>图层</h2><span className="subtle">{[...page.nodes.values()].filter(n => n.pageId === pageId && n.kind !== 'Page').length}</span></div>
    <div className="layers-scroll">
      <ul className="layer-tree">{page.nodes.get(page.source.props.designId)!.children.map(id => row(page.nodes.get(id)!, 0))}</ul>
    </div>
    <div className="panel-note"><span className="source-indicator" />来自设计文档的图层</div>
  </aside>;
}
