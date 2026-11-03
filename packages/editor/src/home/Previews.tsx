import { ArrowUpRight, Check, Circle, LayoutDashboard, MousePointer2, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { DesignSystem, PreviewKind } from './data';

/** Illustrative covers, independent of the document's actual canvas content. */
export function ProjectPreview({ kind = 'starter', illustrative = false }: { kind?: PreviewKind; illustrative?: boolean }) {
  return <div className={`home-project-preview preview-${kind}`} aria-hidden="true">
    {illustrative && <span className="home-preview-label">示意封面</span>}
    {kind === 'mobile' ? <div className="preview-phone"><div className="preview-phone-top"><strong>发现好设计</strong><Circle size={9} /></div><div className="preview-phone-feature"><span>让灵感发生</span><strong>Everyday<br />inspiration.</strong><ArrowUpRight size={18} /></div><div className="preview-phone-cards"><i /><i /></div><div className="preview-phone-tabs"><LayoutDashboard size={9} /><Circle size={9} /><Plus size={9} /></div></div>
      : kind === 'dashboard' ? <div className="preview-dash"><aside><span /><i /><i /><i /><i /></aside><div><header>工作概览 <span>本周</span></header><div className="preview-metrics"><span>访问量<b>12,480</b></span><span>项目数<b>24</b></span><span>完成率<b>86%</b></span></div><div className="preview-chart">{[30, 48, 36, 64, 51, 78, 68, 90, 76, 100, 84, 112].map((h, i) => <i key={i} style={{ height: `${h / 2}px` }} />)}</div><footer><i /><i /><i /></footer></div></div>
      : kind === 'website' ? <div className="preview-site"><header><strong>Forma.</strong><span>产品　关于　联系</span><i /></header><div><small>为下一个想法而生</small><strong>Good design.<br />Great possibilities.</strong><p>把日常灵感，变成触手可及的作品。</p><span className="preview-site-cta">开始探索 <ArrowUpRight size={8} /></span></div><div className="preview-site-art"><span /><span /><span /></div></div>
      : <div className="preview-starter-design"><header><span className="preview-mini-logo">rea</span><span>设计 · 自由生长</span></header><strong>让想法<br /><em>跃然画布。</em></strong><p>从第一笔开始，创造更多可能。</p><div className="preview-starter-controls"><span>开始设计 <ArrowUpRight size={9} /></span><MousePointer2 size={20} /></div><div className="preview-starter-palette"><i /><i /><i /></div></div>}
  </div>;
}

export function SystemPreview({ system }: { system: DesignSystem }) {
  return <div className="home-system-preview" style={{ '--system-color': system.color, '--system-light': system.colors[1] ?? '#f1f3f6' } as CSSProperties} aria-hidden="true">
    <div className="system-type"><strong>Aa<span>字</span></strong><span>设计，从一致开始</span></div>
    <div className="system-components"><span className="system-example-button">主要按钮 <ArrowUpRight size={11} /></span><span className="system-example-input">输入内容…</span><div><span className="system-example-check"><Check size={9} /></span><span className="system-example-toggle"><i /></span><span className="system-example-tag">标签</span></div></div>
    <div className="system-swatches">{system.colors.map((color, i) => <span key={i} style={{ background: color }} />)}</div>
  </div>;
}
