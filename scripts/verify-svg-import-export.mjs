// Regression check for SVG vector import and image export.
// 1. Pasting an SVG file must insert editable layers (Group > Rect / Ellipse / Vector), not an <img>.
// 2. 主菜单 → 导出图片… must download a real PNG (2x) and a real vector SVG.
// Raw CDP over Node's built-in WebSocket, same harness as verify-canvas-drag.mjs.
import { spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9337;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-svg-'));
const downloads = mkdtempSync(join(tmpdir(), 'rea-downloads-'));
const proc = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox', 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(path, method = 'GET') {
  for (let i = 0; i < 40; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}${path}`, { method })).json(); }
    catch { await sleep(250); }
  }
  throw new Error('Chrome devtools endpoint never came up');
}
class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) { this.pending.get(m.id)(m); this.pending.delete(m.id); }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise(resolve => { this.pending.set(id, resolve); this.ws.send(JSON.stringify({ id, method, params })); });
  }
}

let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`); };

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
  <rect x="2" y="2" width="20" height="20" rx="4" fill="#356af0"/>
  <circle cx="12" cy="12" r="6" fill="none" stroke="#ffffff" stroke-width="2"/>
  <g transform="translate(6 6)"><path d="M0 6 L6 0 L12 6" fill="none" stroke="#ffffff" stroke-width="2"/></g>
</svg>`;

async function waitForFile(extension, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const found = readdirSync(downloads).filter(name => name.toLowerCase().endsWith(extension) && !name.endsWith('.crdownload'));
    if (found.length) return join(downloads, found[0]);
    await sleep(200);
  }
  return null;
}

try {
  await getJson('/json/version');
  const page = await getJson('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new Cdp(ws);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const behavior = await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  if (behavior.error) await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });

  async function evalJs(expression) {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  }
  const waitFor = async (expression, label, tries = 100) => {
    for (let i = 0; i < tries; i++) { if (await evalJs(expression)) return true; await sleep(200); }
    throw new Error(`timeout waiting for ${label}`);
  };

  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${process.env.REA_PORT ?? 5173}/#demo?r=${Math.random()}` });
  await waitFor(`!!document.querySelector('.rea-canvas')`, 'canvas');
  await sleep(1500);

  // 1. 粘贴 SVG：必须变成可编辑图层。
  const imported = await evalJs(`(async () => {
    const file = new File([${JSON.stringify(ICON)}], 'icon.svg', { type: 'image/svg+xml' });
    const data = new DataTransfer();
    data.items.add(file);
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 1600));
    const root = document.querySelector('[data-shadow-canvas]').shadowRoot;
    const images = [...root.querySelectorAll('img[data-design-id]')].map(img => img.getAttribute('src') ?? '');
    const group = [...root.querySelectorAll('[data-design-kind="Group"]')].at(-1);
    if (!group) return { failed: '没有插入编组' };
    const kinds = [...group.querySelectorAll('[data-design-kind]')].map(node => node.getAttribute('data-design-kind'));
    const rect = group.querySelector('[data-design-kind="Rect"]');
    const path = group.querySelector('[data-design-kind="Vector"] path');
    const size = { width: group.className, height: getComputedStyle(group).width };
    const nested = group.querySelector('[data-design-id]');
    return {
      kinds,
      svgAssets: images.filter(src => src.startsWith('data:image/svg+xml') || src.includes('.svg')).length,
      rectFill: rect ? getComputedStyle(rect).backgroundColor : null,
      rectRadius: rect ? getComputedStyle(rect).borderTopLeftRadius : null,
      pathData: path?.getAttribute('d') ?? null,
      strokeWidth: path ? getComputedStyle(path).strokeWidth : null,
      size: getComputedStyle(group).width,
      className: group.getAttribute('class'),
      nestedId: nested?.getAttribute('data-design-id') ?? null,
      selected: group.getAttribute('data-design-selected'),
    };
  })()`);
  console.log('import:', JSON.stringify(imported));
  if (imported.failed) throw new Error(imported.failed);
  check('SVG 导入为编组而不是图片资源', imported.kinds.length >= 3 && imported.svgAssets === 0, JSON.stringify(imported.kinds));
  check('矩形保留纯色填充与圆角', imported.rectFill === 'rgb(53, 106, 240)' && parseFloat(imported.rectRadius) >= 7, `${imported.rectFill} / ${imported.rectRadius}`);
  check('路径保留几何与描边', !!imported.pathData?.startsWith('M') && parseFloat(imported.strokeWidth) >= 3.9, `${imported.pathData?.slice(0, 24)} / ${imported.strokeWidth}`);
  check('插入尺寸按 viewBox 等比放大', imported.size === '48px' && (imported.className ?? '').includes('w-12'), `${imported.size} / ${imported.className}`);

  // 2. 导出 SVG：真矢量，不是 foreignObject 外壳。
  await evalJs(`(() => { const menu = [...document.querySelectorAll('button[aria-label="主菜单"]')][0]; menu.click(); return true; })()`);
  await waitFor(`!![...document.querySelectorAll('[role="menu"] button')].find(b => b.textContent.includes('导出图片'))`, 'export menu item');
  await evalJs(`[...document.querySelectorAll('[role="menu"] button')].find(b => b.textContent.includes('导出图片')).click()`);
  await waitFor(`!!document.querySelector('dialog[open]')`, 'export dialog');
  await evalJs(`(() => { const button = [...document.querySelectorAll('dialog[open] [role="radio"]')].find(b => b.textContent.trim().startsWith('SVG')); button.click(); return true; })()`);
  await evalJs(`(() => { const button = [...document.querySelectorAll('dialog[open] button')].find(b => /导出/.test(b.textContent) && !b.disabled); button.click(); return true; })()`);
  const svgPath = await waitForFile('.svg');
  check('导出 SVG 文件', !!svgPath, svgPath ?? 'no file');
  if (svgPath) {
    const text = readFileSync(svgPath, 'utf8');
    check('SVG 是真矢量（含 rect/path，无 foreignObject）', /<rect/.test(text) && /<path/.test(text) && !text.includes('foreignObject'), `${text.length} bytes`);
    check('SVG 尺寸与画框一致', text.includes('width="48"') && text.includes('height="48"'), text.slice(0, 120));
    copyFileSync(svgPath, '/tmp/rea-export-check.svg');
  }

  // 3. 导出 2x PNG：像素尺寸翻倍。
  await evalJs(`(() => { const menu = [...document.querySelectorAll('button[aria-label="主菜单"]')][0]; menu.click(); return true; })()`);
  await waitFor(`!![...document.querySelectorAll('[role="menu"] button')].find(b => b.textContent.includes('导出图片'))`, 'export menu item again');
  await evalJs(`[...document.querySelectorAll('[role="menu"] button')].find(b => b.textContent.includes('导出图片')).click()`);
  await waitFor(`!!document.querySelector('dialog[open]')`, 'export dialog again');
  await evalJs(`(() => { const png = [...document.querySelectorAll('dialog[open] [role="radio"]')].find(b => b.textContent.trim().startsWith('PNG')); png.click(); const scale = [...document.querySelectorAll('dialog[open] [role="radio"]')].filter(b => /^\\d+x$/.test(b.textContent.trim()))[1]; scale.click(); return true; })()`);
  await evalJs(`(() => { const button = [...document.querySelectorAll('dialog[open] button')].find(b => /导出/.test(b.textContent) && !b.disabled); button.click(); return true; })()`);
  const pngPath = await waitForFile('.png');
  check('导出 PNG 文件', !!pngPath, pngPath ?? 'no file');
  if (pngPath) {
    const bytes = readFileSync(pngPath);
    const png = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    check('PNG 合法且按 2x 输出', png && width === 96 && height === 96, `${width}x${height}, ${bytes.length} bytes`);
    copyFileSync(pngPath, '/tmp/rea-export-check.png');
  }

  // 4. 导出 JPG：白底、无透明通道。
  await evalJs(`(() => { const menu = [...document.querySelectorAll('button[aria-label="主菜单"]')][0]; menu.click(); return true; })()`);
  await waitFor(`!![...document.querySelectorAll('[role="menu"] button')].find(b => b.textContent.includes('导出图片'))`, 'export menu item for jpg');
  await evalJs(`[...document.querySelectorAll('[role="menu"] button')].find(b => b.textContent.includes('导出图片')).click()`);
  await waitFor(`!!document.querySelector('dialog[open]')`, 'export dialog for jpg');
  await evalJs(`(() => { const jpg = [...document.querySelectorAll('dialog[open] [role="radio"]')].find(b => b.textContent.trim().startsWith('JPG')); jpg.click(); return true; })()`);
  await sleep(300);
  check('JPG 选中后倍率仍可用', !(await evalJs(`[...document.querySelectorAll('dialog[open] [role="radio"]')].filter(b => /^[0-9]+x$/.test(b.textContent.trim()))[0].disabled`)), 'scale enabled');
  await evalJs(`(() => { const button = [...document.querySelectorAll('dialog[open] button')].find(b => /导出/.test(b.textContent) && !b.disabled); button.click(); return true; })()`);
  const jpgPath = await waitForFile('.jpg');
  check('导出 JPG 文件', !!jpgPath, jpgPath ?? 'no file');
  if (jpgPath) {
    const bytes = readFileSync(jpgPath);
    check('JPG 合法且不透明', bytes.subarray(0, 3).toString('hex') === 'ffd8ff', `${bytes.length} bytes`);
  }

  const shot = await cdp.send('Page.captureScreenshot', {});
  writeFileSync('/tmp/rea-svg-import-export.png', Buffer.from(shot.result.data, 'base64'));
  console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
  if (failures) process.exitCode = 1;
} finally {
  proc.kill('SIGTERM');
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* reaped by OS */ }
  try { rmSync(downloads, { recursive: true, force: true, maxRetries: 5 }); } catch { /* reaped by OS */ }
}
