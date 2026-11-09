// Task 8.5: prove token references resolve and stay geometrically aligned across zoom levels,
// and that `reaui preview` writes the same values as the canvas. The script pins a published
// system, swaps the document page for a token-driven fixture, measures at 100% / 50% / 200%,
// then runs the real CLI against the same files.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9339;
const BASE = process.env.REA_BASE ?? 'http://127.0.0.1:5199';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-zoom-'));
const work = mkdtempSync(join(tmpdir(), 'rea-zoom-fixture-'));
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
    constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map();
        ws.addEventListener('message', e => { const m = JSON.parse(e.data);
            if (m.id && this.pending.has(m.id)) { this.pending.get(m.id)(m); this.pending.delete(m.id); } }); }
    send(method, params = {}) {
        const id = ++this.id;
        return new Promise(resolve => { this.pending.set(id, resolve);
            this.ws.send(JSON.stringify({ id, method, params })); });
    }
}

let failures = 0;
let cdp = null;
let evalJs = async () => null;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`); };

// Token-driven page: every visual property comes from the pinned snapshot, plus one literal
// block that acts as the fixed reference for geometry comparisons.
const PAGE = `import { Page, Frame, Rect, Text } from '@rea/design';

export default <Page id="main" designId="page-root" name="令牌样例">
  <Frame designId="board" name="令牌样例 · 640×420" className="absolute left-[0px] top-[0px] w-[640px] h-[420px] bg-[var(--rea-ds-color-background)]">
    <Frame designId="card" name="卡片" className="absolute left-[40px] top-[40px] w-[400px] h-[240px] bg-[var(--rea-ds-color-surface)] rounded-[var(--rea-ds-radius-lg)] p-[var(--rea-ds-space-24)] border border-[var(--rea-ds-color-border)]">
      <Rect designId="token-block" name="主色块" className="absolute left-[24px] top-[24px] w-[160px] h-[64px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
      <Rect designId="literal-block" name="字面量对照" className="absolute left-[200px] top-[24px] w-[100px] h-[64px] bg-[#356af0] rounded-[8px]" />
      <Text designId="token-heading" name="标题" className="absolute left-[24px] top-[104px] w-[340px] text-[length:var(--rea-ds-typography-heading-size)] leading-[var(--rea-ds-typography-heading-line)] font-[number:var(--rea-ds-typography-heading-weight)] text-[var(--rea-ds-color-text)]">令牌驱动</Text>
      <Text designId="token-body" name="正文" className="absolute left-[24px] top-[152px] w-[340px] text-[length:var(--rea-ds-typography-body-size)] leading-[var(--rea-ds-typography-body-line)] text-[var(--rea-ds-color-muted)]">颜色、间距、圆角与字号都来自固定快照。</Text>
    </Frame>
  </Frame>
</Page>;
`;

try {
    await getJson('/json/version');
    const page = await getJson('/json/new?about:blank', 'PUT');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    cdp = new Cdp(ws);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    evalJs = async expression => {
        const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    const waitFor = async (expression, label, tries = 100) => {
        for (let i = 0; i < tries; i++) { if (await evalJs(expression)) return true; await sleep(200); }
        throw new Error(`timeout waiting for ${label}`);
    };
    const clickText = (scope, text, exact = false) => evalJs(`(() => {
        const button = [...${scope}.querySelectorAll('button')].find(node => {
            const label = (node.textContent ?? '').replace(/\\s+/g, ' ').trim();
            return ${exact ? `label === ${JSON.stringify(text)}` : `label.includes(${JSON.stringify(text)})`} && !node.disabled;
        });
        if (!button) return false;
        button.click(); return true;
    })()`);
    const shot = async name => {
        const png = await cdp.send('Page.captureScreenshot', {});
        writeFileSync(`/tmp/${name}.png`, Buffer.from(png.result.data, 'base64'));
    };
    const styleOf = (id, properties) => evalJs(`(() => {
        const root = document.querySelector('[data-shadow-canvas]').shadowRoot;
        const el = root.querySelector('[data-design-id="${id}"]');
        if (!el) return null;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        const box = { left: r.left, top: r.top, width: r.width, height: r.height };
        return { box, ...Object.fromEntries(${JSON.stringify(properties)}.map(p => [p, cs.getPropertyValue(p)])) };
    })()`);

    // 1. Publish and pin a system, then swap in the token page while nothing is open.
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}` });
    await waitFor(`!!document.querySelector('.home-shell')`, 'home shell');
    await evalJs(`[...document.querySelectorAll('.home-nav-item')].find(b => b.textContent.includes('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.home-system-card')`, 'system cards');
    await evalJs(`document.querySelector('.home-system-card').click()`);
    await waitFor(`!!document.querySelector('.system-workbench')`, 'workbench');
    check('publishes a copied built-in', await clickText(`document.querySelector('.system-heading-actions')`, '复制并发布'));
    await waitFor(`(() => JSON.parse(localStorage.getItem('rea-home:systems') ?? '[]').some(item => item.revision >= 1))()`, 'published record');

    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}#demo` });
    await waitFor(`!!document.querySelector('.rea-canvas')`, 'demo canvas');
    await sleep(600);
    await evalJs(`document.querySelector('button[aria-label="主菜单"]').click()`);
    await waitFor(`!!document.querySelector('[role="menu"][aria-label="主菜单"]')`, 'main menu');
    await evalJs(`[...document.querySelectorAll('[role="menu"][aria-label="主菜单"] button')].find(b => b.textContent.trim().startsWith('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.rea-dialog[open]')`, 'system dialog');
    check('pins the first revision', await clickText(`document.querySelector('.rea-dialog[open]')`, '固定', true));
    await waitFor(`document.querySelector('.rea-dialog[open]')?.textContent.includes('版本变更')`, 'pin preview');
    check('commits the pin', await clickText(`document.querySelector('.rea-dialog[open]')`, '固定此版本'));
    await waitFor(`!document.querySelector('.rea-dialog[open]')`, 'dialog closed');
    await sleep(900);

    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}` });
    await waitFor(`!!document.querySelector('.home-shell')`, 'home shell before swap');
    await sleep(600);
    const patch = await evalJs(`(async () => {
        const db = await new Promise((resolve, reject) => { const req = indexedDB.open('rea-ui', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
        const all = await new Promise((resolve, reject) => { const req = db.transaction('documents').objectStore('documents').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
        const doc = all.find(item => item.files['design/system.json']);
        if (!doc) return null;
        const entry = doc.manifest.pages[0];
        doc.files[entry.file] = ${JSON.stringify(PAGE)}.replace('id="main"', 'id="' + entry.id + '"');
        doc.revision += 1;
        doc.updatedAt = new Date().toISOString();
        await new Promise((resolve, reject) => { const tx = db.transaction('documents', 'readwrite'); tx.objectStore('documents').put(doc); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
        db.close();
        return { id: doc.id, pageId: entry.id, file: entry.file, files: doc.files, version: JSON.parse(doc.files['rea.json']).version };
    })()`);
    check('swapped the demo page for the token fixture', !!patch && patch.version === 4, JSON.stringify(patch && { id: patch.id, version: patch.version }));

    // 2. Canvas: computed values must be the token values, geometry must follow the zoom.
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}#demo` });
    await waitFor(`!!document.querySelector('[data-shadow-canvas]')?.shadowRoot?.querySelector('[data-design-id="token-block"]')`, 'token page');
    await sleep(900);
    const base = await styleOf('token-block', ['background-color', 'border-radius', 'width']);
    check('token colour resolves on the canvas', base?.['background-color'] === 'rgb(53, 106, 240)', base?.['background-color']);
    check('token radius resolves on the canvas', base?.['border-radius'] === '8px', base?.['border-radius']);
    const card = await styleOf('card', ['padding-left', 'border-radius', 'background-color']);
    check('token spacing resolves on the canvas', card?.['padding-left'] === '24px', card?.['padding-left']);
    check('radius-lg resolves on the canvas', card?.['border-radius'] === '12px', card?.['border-radius']);
    const heading = await styleOf('token-heading', ['font-size', 'line-height', 'font-weight']);
    check('typography tokens resolve on the canvas', heading?.['font-size'] === '30px' && Math.abs(parseFloat(heading?.['line-height'] ?? '0') - 38.1) < 0.2 && heading?.['font-weight'] === '500', JSON.stringify(heading));
    const probe = await evalJs(`(() => {
        const root = document.querySelector('[data-shadow-canvas]').shadowRoot;
        const css = [...root.querySelectorAll('style')].map(node => node.textContent).join('\\n');
        const count = text => css.split(text).length - 1;
        const at = css.indexOf('radius-md');
        return {
            cardClass: root.querySelector('[data-design-id="card"]')?.className,
            tokenClass: root.querySelector('[data-design-id="token-block"]')?.className,
            radiusRule: count('radius-md'), spaceRule: count('space-24'), sizeRule: count('heading-size'), bgRule: count('color-primary'),
            snippet: at < 0 ? '' : css.slice(Math.max(0, at - 120), at + 80),
        };
    })()`);
    console.log('PROBE', JSON.stringify(probe));

    async function zoomTo(target) {
        for (let i = 0; i < 6; i++) {
            const current = await evalJs(`Number((document.querySelector('button[aria-label^="缩放"]')?.getAttribute('aria-label') ?? '缩放 100%').replace(/[^0-9.]/g, '')) / 100`);
            if (Math.abs(current - target) < 0.005) return current;
            const deltaY = -Math.log(target / current) / 0.01;
            const box = await evalJs(`(() => { const r = document.querySelector('.rea-canvas').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
            await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY, modifiers: 2 });
            await sleep(250);
        }
        throw new Error('zoom did not settle');
    }
    const measure = async label => {
        const token = await styleOf('token-block', ['background-color', 'border-radius', 'width']);
        const literal = await styleOf('literal-block', ['width']);
        const cardBox = await styleOf('card', ['padding-left']);
        const scaleFromToken = token.box.width / 160, scaleFromLiteral = literal.box.width / 100;
        const gap = literal.box.left - (token.box.left + token.box.width);
        const zoom = await evalJs(`Number((document.querySelector('button[aria-label^="缩放"]')?.getAttribute('aria-label') ?? '缩放 100%').replace(/[^0-9.]/g, '')) / 100`);
        check(`${label}: token and literal scale agree`, Math.abs(scaleFromToken - scaleFromLiteral) / scaleFromLiteral < 0.01, `token ${scaleFromToken.toFixed(4)} vs literal ${scaleFromLiteral.toFixed(4)}`);
        check(`${label}: reported zoom matches the rendered scale`, Math.abs(scaleFromToken - zoom) / zoom < 0.02, `scale ${scaleFromToken.toFixed(4)} vs label ${zoom}`);
        check(`${label}: token gap stays proportional`, Math.abs(gap - 16 * scaleFromToken) < 1.5, `gap ${gap.toFixed(2)} want ${(16 * scaleFromToken).toFixed(2)}`);
        check(`${label}: computed values stay unscaled`, token['border-radius'] === '8px' && cardBox['padding-left'] === '24px' && token['background-color'] === 'rgb(53, 106, 240)', JSON.stringify({ radius: token['border-radius'], padding: cardBox['padding-left'], colour: token['background-color'] }));
        return scaleFromToken;
    };
    await measure('100%');
    await zoomTo(0.5);
    await measure('50%');
    await shot('rea-ds-zoom-50');
    await zoomTo(2);
    await measure('200%');
    await shot('rea-ds-zoom-200');

    // 3. The CLI must accept the same document and emit the same variables.
    const dir = join(work, 'fixture');
    mkdirSync(join(dir, 'design'), { recursive: true });
    mkdirSync(join(dir, 'pages'), { recursive: true });
    for (const [path, content] of Object.entries(patch.files)) {
        if (!path.endsWith('.json') && !path.endsWith('.tsx')) continue;
        const target = join(dir, path);
        mkdirSync(join(target, '..'), { recursive: true });
        writeFileSync(target, content);
    }
    const cli = join(process.cwd(), 'packages/reaui-cli/bin/reaui.mjs');
    const validated = spawnSync(process.execPath, [cli, 'validate', dir, '--json'], { encoding: 'utf8' });
    let report = null;
    try { report = JSON.parse(validated.stdout.trim()); } catch { /* reported below */ }
    check('reaui validate accepts the token page', validated.status === 0 && report?.ok === true && report?.document?.version === 4, `exit ${validated.status} ${validated.stdout.slice(0, 160)}`);
    check('validate reads the pinned snapshot', report?.system?.source === 'pinned' && report?.system?.revision === 1, JSON.stringify(report?.system));
    const out = join(work, 'preview.html');
    const previewed = spawnSync(process.execPath, [cli, 'preview', dir, '--out', out], { encoding: 'utf8' });
    const html = previewed.status === 0 ? readFileSync(out, 'utf8') : '';
    check('reaui preview exits cleanly', previewed.status === 0, previewed.stderr.slice(0, 160));
    check('preview writes the same :root variables as the canvas', html.includes(':root{') && html.includes('--rea-ds-color-primary:#356af0') && html.includes('--rea-ds-radius-md:8px') && html.includes('--rea-ds-space-24:24px') && html.includes('--rea-ds-typography-heading-size:30px'), 'missing root variables');
    check('preview compiles the token reference itself', html.includes('background-color: var(--rea-ds-color-primary)'), 'missing compiled token utility');
} catch (error) {
    failures++;
    console.log(`FAIL harness: ${error instanceof Error ? error.message : String(error)}`);
    try {
        const state = await evalJs(`(() => ({
            title: document.querySelector('.rea-doc-title')?.textContent ?? null,
            notice: document.querySelector('.rea-notice')?.textContent ?? null,
            home: !!document.querySelector('.home-shell'),
            canvas: !!document.querySelector('.rea-canvas'),
            ids: document.querySelector('[data-shadow-canvas]')?.shadowRoot ? [...document.querySelector('[data-shadow-canvas]').shadowRoot.querySelectorAll('[data-design-id]')].slice(0, 12).map(n => n.getAttribute('data-design-id')) : null,
            body: document.body.innerText.slice(0, 240),
        }))()`);
        console.log('DEBUG', JSON.stringify(state));
    } catch { /* diagnostics are best effort */ }
} finally {
    proc.kill();
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold the profile. */ }
    try { rmSync(work, { recursive: true, force: true }); } catch { /* fixture cleanup is best effort. */ }
    console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
    process.exit(failures ? 1 : 0);
}
