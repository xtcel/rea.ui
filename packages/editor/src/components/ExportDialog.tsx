import { useState } from 'react';
import { Button, Dialog } from '../ui';
import type { ExportFormat } from '../export/targets';

const FORMATS: { id: ExportFormat; label: string; detail: string }[] = [
  { id: 'png', label: 'PNG', detail: '透明背景' },
  { id: 'jpg', label: 'JPG', detail: '白色背景' },
  { id: 'svg', label: 'SVG', detail: '可编辑矢量' },
];
const SCALES = [1, 2, 3] as const;

/** 导出对话框只放两组选择：格式与倍率。范围由当前选区决定，按钮上直接写文件数。 */
export function ExportDialog({ count, onClose, onExport }: { count: number; onClose: () => void; onExport: (format: ExportFormat, scale: number) => Promise<void> }) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [scale, setScale] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const raster = format !== 'svg';
  async function confirm() {
    if (busy) return;
    setBusy(true);
    try { await onExport(format, raster ? scale : 1); } finally { setBusy(false); }
  }
  return <Dialog title="导出图片" onClose={onClose}>
    <div className="space-y-5">
      <div role="radiogroup" aria-label="导出格式" className="flex gap-2">
        {FORMATS.map(item => <button key={item.id} type="button" role="radio" aria-checked={format === item.id}
          className={`flex-1 rounded border px-3 py-2 text-left text-xs ${format === item.id ? 'border-[var(--rea-accent)] bg-[var(--rea-selected)] text-[var(--rea-accent)]' : 'border-[var(--rea-border)] hover:bg-[var(--rea-hover)]'}`}
          onClick={() => setFormat(item.id)}>
          <span className="block font-semibold">{item.label}</span>
          <span className="text-[11px] text-[var(--rea-muted)]">{item.detail}</span>
        </button>)}
      </div>
      <div role="radiogroup" aria-label="导出倍率" className="flex items-center gap-2">
        <span className="w-8 text-xs text-[var(--rea-muted)]">倍率</span>
        {SCALES.map(value => <button key={value} type="button" role="radio" aria-checked={scale === value} disabled={!raster}
          className={`rounded border px-3 py-1 text-xs disabled:opacity-35 ${raster && scale === value ? 'border-[var(--rea-accent)] text-[var(--rea-accent)]' : 'border-[var(--rea-border)]'}`}
          onClick={() => setScale(value)}>{value}x</button>)}
      </div>
    </div>
    <div className="rea-dialog-actions mt-6 flex justify-end gap-2">
      <Button onClick={onClose}>取消</Button>
      <Button disabled={!count || busy} onClick={() => void confirm()}>{busy ? '导出中…' : count > 1 ? `导出 ${count} 个文件` : '导出'}</Button>
    </div>
  </Dialog>;
}
