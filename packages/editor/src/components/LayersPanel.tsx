import { ChevronDown, ChevronRight, Frame as FrameIcon, Type, PenTool, LockKeyhole, EyeOff, X } from 'lucide-react';
import { useState } from 'react';
import type { IndexedNode, InspectedDocument } from '@rea/design';
import { IconButton } from './IconButton';

interface Props {
  document: InspectedDocument;
  pageId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPageChange: (id: string) => void;
  onClose: () => void;
}

export function LayersPanel({ document, pageId, selectedId, onSelect, onPageChange, onClose }: Props) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const page = document.pages.find(item => item.props.id === pageId)!;
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
        {node.children.map(id => row(document.nodes.get(id)!, depth + 1))}
      </ul>}
    </li>;
  }

  return <aside className="panel layers-panel" aria-label="图层面板">
    <div className="panel-heading"><h2>页面</h2><IconButton label="关闭图层面板" onClick={onClose} className="panel-close"><X size={16} /></IconButton></div>
    <nav className="page-list" aria-label="页面">
      {document.pages.map(item => <button type="button" key={item.props.id}
        className={`page-row ${pageId === item.props.id ? 'is-current' : ''}`}
        aria-current={pageId === item.props.id ? 'page' : undefined}
        onClick={() => onPageChange(item.props.id)}>
        <span className="page-dot" /><span>{item.props.name || item.props.id}</span>
        <span className="page-count">{item.props.viewports.length}</span>
      </button>)}
    </nav>
    <div className="panel-heading layers-heading"><h2>图层</h2><span className="subtle">{[...document.nodes.values()].filter(n => n.pageId === pageId && n.kind !== 'Page').length}</span></div>
    <div className="layers-scroll">
      <ul className="layer-tree">{document.nodes.get(page.props.designId)!.children.map(id => row(document.nodes.get(id)!, 0))}</ul>
    </div>
    <div className="panel-note"><span className="source-indicator" />来自设计文档的图层</div>
  </aside>;
}
