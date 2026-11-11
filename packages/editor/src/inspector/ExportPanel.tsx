import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui';
import type { ExportFormat } from '../export/targets';

const FORMATS: readonly { id: ExportFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpg', label: 'JPG' },
  { id: 'webp', label: 'WEBP' },
  { id: 'svg', label: 'SVG' },
];
const SCALES = [1, 2, 3] as const;

/**
 * 右侧栏导出区：格式、倍率与后缀合成一行，导出对象固定是当前选中的图层。
 * 位置固定在「设计」标签最底部，不随上方属性滚动。
 */
export function ExportPanel({ onExport }: { onExport: (format: ExportFormat, scale: number, suffix: string) => Promise<void> }) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<number>(1);
  const [suffix, setSuffix] = useState('');
  const [busy, setBusy] = useState(false);
  const raster = format !== 'svg';
  async function confirm() {
    if (busy) return;
    setBusy(true);
    try { await onExport(format, raster ? scale : 1, suffix); } finally { setBusy(false); }
  }
  return <section className="rea-export-panel" aria-label="导出">
    <header><h3>导出</h3></header>
    <div className="rea-export-row">
      <select className="rea-input" aria-label="导出格式" value={format} onChange={event => setFormat(event.target.value as ExportFormat)}>
        {FORMATS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <select className="rea-input" aria-label="导出倍率" value={scale} disabled={!raster} onChange={event => setScale(Number(event.target.value))}>
        {SCALES.map(value => <option key={value} value={value}>{value}x</option>)}
      </select>
      <input className="rea-input" aria-label="文件名后缀" placeholder="后缀" value={suffix} maxLength={40} onChange={event => setSuffix(event.target.value)} />
    </div>
    <Button className="w-full" disabled={busy} onClick={() => void confirm()}><Download size={13} />{busy ? '导出中…' : '导出选中的…'}</Button>
  </section>;
}
