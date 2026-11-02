import { Frame as FrameIcon, Type, PenTool, X, Plus } from 'lucide-react';
import type { IndexedNode, PageProps, VectorProps } from '@rea/design';
import type { ReactElement } from 'react';
import { textContent } from '@rea/design';
import { IconButton } from './IconButton';

function NumberField({ label, value, onCommit, min }: { label: string; value?: number; onCommit: (value: number) => void; min?: number }) {
  return <label className="editable-field"><span>{label}</span><input key={String(value)} type="number" aria-label={label} defaultValue={value} placeholder="自动" min={min} step={1}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.currentTarget.value = value === undefined ? '' : String(value); event.currentTarget.blur(); } }}
    onBlur={event => {
      const next = event.currentTarget.valueAsNumber;
      if (!Number.isFinite(next) || (min !== undefined && next < min)) { event.currentTarget.value = value === undefined ? '' : String(value); return; }
      if (next !== value) onCommit(next);
    }} /></label>;
}
export function Inspector({ node, page, onClose, onChange, onText, onCreateBoard }: {
  node?: IndexedNode; page: ReactElement<PageProps>; onClose: () => void;
  onChange: (id: string, props: Record<string, unknown>) => void;
  onText: (id: string, text: string) => void; onCreateBoard: () => void;
}) {
  const props = node?.element.props;
  const Icon = node?.kind === 'Text' ? Type : node?.kind === 'Vector' ? PenTool : FrameIcon;
  const isPage = !node || node.kind === 'Page';
  const color = node?.kind === 'Vector' ? (props as VectorProps).fill : node?.kind === 'Text' ? props?.style?.color : props?.style?.background;
  function style(key: string, value: string | number) { if (node) onChange(node.id, { style: { ...props?.style, [key]: value } }); }
  return <aside className="panel inspector-panel" aria-label="属性面板">
    <div className="panel-heading"><h2>设计</h2><IconButton label="关闭属性面板" onClick={onClose} className="panel-close"><X size={16} /></IconButton></div>
    <div className="inspector-scroll">
      <section className="inspector-section node-summary"><div className="node-symbol"><Icon size={20} /></div><div><h3>{node?.name ?? page.props.name}</h3><p>{node?.kind ?? '画板'}</p></div></section>
      <section className="inspector-section"><h3>名称</h3><input className="property-input" aria-label="图层名称" key={`${node?.id ?? page.props.designId}-${node?.name ?? page.props.name}`} defaultValue={node?.name ?? page.props.name} onBlur={event => {
        if (event.currentTarget.value.trim() && event.currentTarget.value !== (node?.name ?? page.props.name)) onChange(node?.id ?? page.props.designId, { name: event.currentTarget.value });
      }} /></section>
      {isPage ? <section className="inspector-section"><h3>画板尺寸</h3>
        {page.props.viewports.map((viewport, index) => <div className="viewport-fields" key={viewport.id}>
          <p className="viewport-name">{viewport.name || viewport.id}</p><div className="property-grid">
            <NumberField label="画板宽度" value={viewport.width} min={64} onCommit={width => onChange(page.props.designId, { viewports: page.props.viewports.map((v, i) => i === index ? { ...v, width } : v) })} />
            <NumberField label="画板高度" value={viewport.height} min={64} onCommit={height => onChange(page.props.designId, { viewports: page.props.viewports.map((v, i) => i === index ? { ...v, height } : v) })} />
          </div>
        </div>)}
        <button className="add-board-button" type="button" onClick={onCreateBoard}><Plus size={14} />新增画板</button>
      </section> : props && <>
        <section className="inspector-section"><h3>位置与尺寸</h3>
          {props.position !== 'absolute' && <p className="field-help">此容器使用流布局，位置由父级决定。</p>}
          <div className="property-grid">
            {props.position === 'absolute' && <><NumberField label="X" value={props.x ?? 0} onCommit={x => onChange(node.id, { x })} /><NumberField label="Y" value={props.y ?? 0} onCommit={y => onChange(node.id, { y })} /></>}
            <NumberField label="W" value={typeof props.width === 'number' ? props.width : undefined} min={4} onCommit={width => onChange(node.id, { width })} />
            <NumberField label="H" value={typeof props.height === 'number' ? props.height : undefined} min={4} onCommit={height => onChange(node.id, { height })} />
          </div>
        </section>
        <section className="inspector-section"><h3>{node.kind === 'Text' ? '文字颜色' : '填充'}</h3><div className="fill-field">
          <input type="color" aria-label="填充颜色" value={typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffffff'} onChange={event => {
            if (node.kind === 'Vector') onChange(node.id, { fill: event.currentTarget.value }); else style(node.kind === 'Text' ? 'color' : 'background', event.currentTarget.value);
          }} /><input className="color-text-input" aria-label="颜色值" key={`${node.id}-${String(color)}`} defaultValue={String(color ?? '#ffffff')}
            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            onBlur={event => {
              const value = event.currentTarget.value;
              if (!/^#[0-9a-f]{6}$/i.test(value)) { event.currentTarget.value = String(color ?? '#ffffff'); return; }
              if (value === color) return;
              if (node.kind === 'Vector') onChange(node.id, { fill: value }); else style(node.kind === 'Text' ? 'color' : 'background', value);
            }} />
        </div>
          {node.kind === 'Frame' && <NumberField label="圆角" value={typeof props.style?.borderRadius === 'number' ? props.style.borderRadius : 0} min={0} onCommit={value => style('borderRadius', value)} />}
        </section>
        {node.kind === 'Text' && <section className="inspector-section"><h3>文本</h3>
          <textarea className="text-input" aria-label="文本内容" key={`${node.id}-${textContent(props.children)}`} defaultValue={textContent(props.children)} onBlur={event => { if (event.currentTarget.value !== textContent(props.children)) onText(node.id, event.currentTarget.value); }} />
          <NumberField label="字号" value={typeof props.style?.fontSize === 'number' ? props.style.fontSize : 16} min={1} onCommit={value => style('fontSize', value)} />
        </section>}
      </>}
      {node && <section className="inspector-section"><h3>节点标识</h3><code className="node-id">{node.id}</code></section>}
    </div>
    <div className="panel-note">修改会写入同一份 TSX · 支持撤销</div>
  </aside>;
}
