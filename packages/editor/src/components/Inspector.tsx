import { Frame as FrameIcon, Type, PenTool, Plus } from 'lucide-react';
import type { IndexedNode, InspectedPage } from '@rea/design';
import { textContent } from '@rea/design';
import { fixedValue, readProperty } from '@rea/tailwind';
import type { PropertyGroupKey } from '@rea/tailwind';
import type { StylePatch } from '@rea/document';
import { Field, Section } from '../ui';

function NumberField({ label, value, onCommit, min, hint, disabled }: { label: string; value?: number; onCommit: (value: number) => void; min?: number; hint?: string; disabled?: boolean }) {
  return <div className="rea-field"><Field label={label}><input key={`${value}-${hint}`} type="number" aria-label={label} defaultValue={value} placeholder={hint ?? '自动'} title={hint} min={min} step="any" disabled={disabled}
    onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.currentTarget.value = value === undefined ? '' : String(value); event.currentTarget.blur(); } }}
    onBlur={event => {
      const next = event.currentTarget.valueAsNumber;
      if (!Number.isFinite(next) || (min !== undefined && next < min)) { event.currentTarget.value = value === undefined ? '' : String(value); return; }
      if (next !== value) onCommit(next);
    }} /></Field></div>;
}
export function Inspector({ node, page, onChange, onText, onCreateBoard, measured }: {
  node?: IndexedNode; page: InspectedPage;
  onChange: (id: string, props?: Record<string, unknown>, styles?: StylePatch) => void;
  onText: (id: string, text: string) => void; onCreateBoard: () => void; measured: { width: number; height: number } | null;
}) {
  const target = node ?? page.nodes.get(page.source.props.designId)!;
  const props = target.element.props, cls = props.className ?? '';
  const Icon = target.kind === 'Text' ? Type : target.kind === 'Vector' ? PenTool : FrameIcon;
  const isPage = target.kind === 'Page';
  const colorGroup = target.kind === 'Text' ? 'text-color' : target.kind === 'Vector' ? 'fill' : 'bg';
  const colorValue = readProperty(cls, colorGroup);
  const color = colorValue && typeof colorValue === 'object' && 'hex' in colorValue ? colorValue.hex : '#ffffff';
  function style(key: PropertyGroupKey, value: string | number) { onChange(target.id, undefined, { [key]: value }); }
  function field(group: PropertyGroupKey, label: string, min?: number, fallback?: number) {
    const value = readProperty(cls, group);
    const relative = value && typeof value === 'object' && 'type' in value && value.type === 'relative';
    return <NumberField label={label} value={value === 'conflict' ? undefined : fixedValue(cls, group) ?? fallback} min={min} disabled={target.locked}
      hint={value === 'conflict' ? '冲突' : relative ? `非固定尺寸 (${value.keyword})；编辑后改为固定尺寸` : undefined} onCommit={n => style(group, n)} />;
  }
  return <div className="min-h-0 flex-1 overflow-auto">

      <Section className="flex items-center gap-3"><div className="rea-node-symbol"><Icon size={20} /></div><div><h3>{target.name}</h3><p>{target.kind}</p></div></Section>
      <Section><h3 className="mb-3 text-xs font-semibold">名称</h3><input className="rea-input" aria-label="图层名称" key={`${target.id}-${target.name}`} defaultValue={target.name} disabled={target.locked} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { e.currentTarget.value = target.name; e.currentTarget.blur(); } }} onBlur={event => {
        if (event.currentTarget.value.trim() && event.currentTarget.value !== target.name) onChange(target.id, { name: event.currentTarget.value.trim() });
      }} /></Section>
      {target.locked && <Section><p className="rea-field-help">图层已锁定；父级锁定时请先解锁父级。</p><button type="button" className="rea-button" disabled={!props.locked} onClick={() => onChange(target.id, { locked: false })}>解锁图层</button></Section>}
      {!isPage && <Section><h3 className="mb-3 text-xs font-semibold">位置与尺寸</h3>
        {target.position !== 'absolute' && <p className="rea-field-help">使用流布局，位置由父级决定。</p>}
        <div className="grid grid-cols-2 gap-3">
          {target.position === 'absolute' && <>{field('left', 'X', undefined, 0)}{field('top', 'Y', undefined, 0)}</>}
          {field('width', 'W', 1, measured?.width)}{field('height', 'H', 1, measured?.height)}
        </div>
      </Section>}
      <Section><h3 className="mb-3 text-xs font-semibold">{target.kind === 'Text' ? '文字颜色' : isPage ? '画布背景' : '填充'}</h3><div className="rea-fill-field">
        <input type="color" aria-label="填充颜色" disabled={target.locked} value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#ffffff'} onChange={event => style(colorGroup, event.currentTarget.value)} />
        <input className="rea-input font-mono!" aria-label="颜色值" disabled={target.locked} key={`${target.id}-${color}`} defaultValue={color}
          onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} onBlur={event => {
            const value = event.currentTarget.value;
            if (!/^#[0-9a-f]{6}$/i.test(value)) { event.currentTarget.value = color; return; }
            if (value !== color) style(colorGroup, value);
          }} />
      </div>
        {!isPage && <>{field('rounded', '圆角', 0)}{field('opacity', '不透明度', 0, 1)}</>}
      </Section>
      {target.kind === 'Text' && <Section><h3 className="mb-3 text-xs font-semibold">文本</h3>
        <textarea className="rea-input min-h-24 resize-y" aria-label="文本内容" disabled={target.locked} key={`${target.id}-${textContent(props.children)}`} defaultValue={textContent(props.children)} onBlur={event => { if (event.currentTarget.value !== textContent(props.children)) onText(target.id, event.currentTarget.value); }} />
        {field('text-size', '字号', 1)}
      </Section>}
      {isPage && <Section><p className="rea-field-help">页面是无限画布，可以放置多个独立画框，也可以直接绘制图层。</p><button className="rea-button mt-4 w-full" type="button" onClick={onCreateBoard}><Plus size={14} />新增画框</button></Section>}
      <Section><h3 className="mb-3 text-xs font-semibold">节点标识</h3><code className="break-all font-mono text-[10px] text-[var(--rea-muted)]">{target.id}</code></Section>
  </div>;
}
