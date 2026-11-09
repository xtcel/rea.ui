import { rotatedBounds } from '../session/gestures';
import { rasterize } from './raster';
import { collectExportTree, serializeSvg } from './vector';
import type { ExportFormat, ExportTarget } from './targets';

export interface ExportRequest {
  /** 画布影子根：导出读取的就是用户此刻看到的渲染。 */
  root: ShadowRoot;
  targets: readonly ExportTarget[];
  rotations: ReadonlyMap<string, number>;
  format: ExportFormat;
  /** 仅位图导出使用；SVG 是矢量，不需要倍率。 */
  scale: number;
}

export interface ExportedFile { name: string; blob: Blob }

const extensionOf = (format: ExportFormat) => format === 'jpg' ? 'jpg' : format;

export async function exportFiles(request: ExportRequest): Promise<ExportedFile[]> {
  const { root, targets, rotations, format, scale } = request;
  const probeElement = root.querySelector('[data-coordinate-probe]');
  const probe = (probeElement?.getBoundingClientRect().width ?? 0) / 100 || 1;
  const files: ExportedFile[] = [];
  for (const target of targets) {
    const element = root.querySelector(`[data-design-id="${target.id}"]`);
    if (!element) throw new Error(`「${target.name}」当前不在画布上，无法导出。`);
    const bounds = rotatedBounds(target.box, rotations.get(target.id) ?? 0);
    if (format === 'svg') {
      const origin = element.getBoundingClientRect();
      const tree = await collectExportTree(element, { probe, origin: { x: origin.left, y: origin.top } });
      const markup = serializeSvg(tree, { width: bounds.width, height: bounds.height });
      files.push({ name: `${target.name}.svg`, blob: new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }) });
      continue;
    }
    const blob = await rasterize(element, {
      width: bounds.width,
      height: bounds.height,
      inset: { x: (bounds.width - target.box.width) / 2, y: (bounds.height - target.box.height) / 2 },
      scale,
      format,
    });
    files.push({ name: `${target.name}.${extensionOf(format)}`, blob });
  }
  return files;
}
