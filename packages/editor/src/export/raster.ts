/**
 * 位图导出：把画布上真实渲染的节点克隆一份，内联计算样式后交给浏览器栅格化。
 * 与画布共用同一份 DOM 与样式，因此阴影、渐变、旋转、圆角都不需要在这里重新解释。
 */

// inset 系列会把「用了哪个边」解析成具体数值，内联后与显式 left/top 叠加，
// 克隆出来的节点会被推出可见区域（整张导出图变空白）。定位始终由 left/top 决定。
const SKIPPED_PROPERTIES = new Set([
  'cursor', 'pointer-events', 'user-select', '-webkit-user-drag', 'will-change',
  'inset', 'inset-block', 'inset-block-start', 'inset-block-end', 'inset-inline', 'inset-inline-start', 'inset-inline-end',
]);
const MAX_CANVAS = 12000;

export interface RasterOptions {
  /** 导出盒子的设计尺寸。 */
  width: number;
  height: number;
  /** 根节点相对于导出盒子左上角的位置（旋转图层需要居中留白）。 */
  inset: { x: number; y: number };
  scale: number;
  format: 'png' | 'jpg' | 'webp';
}

const MIME: Record<RasterOptions['format'], string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

async function dataUrlOf(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  const blob = await (await fetch(url)).blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('资源无法读取。'));
    reader.readAsDataURL(blob);
  });
}

/** 计算样式逐条内联；子节点按顺序对应，不需要知道任何 Tailwind 类名。 */
function inlineComputedStyle(source: Element, target: Element) {
  const computed = getComputedStyle(source), style = (target as HTMLElement).style;
  let text = '';
  for (const property of computed) {
    if (SKIPPED_PROPERTIES.has(property)) continue;
    text += `${property}:${computed.getPropertyValue(property)};`;
  }
  style.cssText = text;
  const sourceChildren = [...source.children], targetChildren = [...target.children];
  for (let index = 0; index < sourceChildren.length; index++) {
    if (targetChildren[index]) inlineComputedStyle(sourceChildren[index], targetChildren[index]);
  }
}

const URL_PATTERN = /url\((["']?)((?:blob:|https?:)[^"')]+)\1\)/g;

/** 外部资源必须变成 data URL，否则序列化后的图片加载不到。 */
async function inlineAssets(target: Element) {
  const elements: Element[] = [...target.querySelectorAll('*')];
  if (target.children.length === 0 || target instanceof HTMLImageElement) elements.unshift(target);
  for (const element of elements) {
    if (element instanceof HTMLImageElement && element.src) element.src = await dataUrlOf(element.src);
    const style = (element as HTMLElement).style;
    if (!style?.cssText.includes('url(')) continue;
    for (const property of ['background-image', 'mask-image', 'border-image-source', 'list-style-image'] as const) {
      const value = style.getPropertyValue(property);
      if (!value?.includes('url(')) continue;
      const matches = [...value.matchAll(URL_PATTERN)];
      let next = value;
      for (const match of matches) next = next.replace(match[0], `url("${await dataUrlOf(match[2])}")`);
      style.setProperty(property, next);
    }
  }
}

export async function rasterize(element: Element, options: RasterOptions): Promise<Blob> {
  const { width, height, scale, format, inset } = options;
  if (!(width > 0 && height > 0)) throw new Error('请选择可导出的图层。');
  if (Math.max(width, height) * scale > MAX_CANVAS) throw new Error('导出尺寸过大，请降低倍率。');
  const clone = element.cloneNode(true) as HTMLElement;
  inlineComputedStyle(element, clone);
  clone.removeAttribute('data-design-selected');
  clone.removeAttribute('data-design-locked');
  clone.style.setProperty('position', 'absolute');
  clone.style.setProperty('left', `${inset.x}px`);
  clone.style.setProperty('top', `${inset.y}px`);
  clone.style.setProperty('margin', '0');
  await inlineAssets(clone);
  const stage = document.createElement('div');
  stage.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  stage.style.cssText = `position:relative;width:${width}px;height:${height}px;overflow:hidden;`;
  stage.append(clone);
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${new XMLSerializer().serializeToString(stage)}</foreignObject></svg>`;
  // 必须用 data URL：blob URL 承载的 foreignObject 会让 canvas 变成「受污染」状态，
  // 之后 toBlob 直接抛 SecurityError。
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('图层渲染失败，无法导出。'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前环境不支持图片导出。');
    if (format === 'jpg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(new Error('图片编码失败。')),
      MIME[format],
      .92,
    ));
    // 浏览器不支持所选编码时会静默回退成 PNG；宁可按失败处理，也不生成扩展名与内容不符的文件。
    if (blob.type !== MIME[format]) throw new Error(`当前环境不支持 ${format.toUpperCase()} 导出，请改用 PNG。`);
    return blob;
  } finally { /* data URL 无需释放。 */ }
}
