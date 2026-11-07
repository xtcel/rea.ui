// Regression check: a layer must follow the pointer every frame while it is moved,
// resized or rotated. Preview geometry reaches the canvas as brand new utility classes
// whose CSS compiles a frame later; before the fix an absolutely positioned layer fell
// back to its static position (the page origin) in that gap and visibly jumped there.
// Raw CDP over Node's built-in WebSocket, same harness as verify-canvas-dark-theme.mjs.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9335;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-drag-'));
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
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`); };

try {
    await getJson('/json/version');
    const page = await getJson('/json/new?about:blank', 'PUT');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new Cdp(ws);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    async function evalJs(expression) {
        const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    }
    const waitFor = async (expression, label, tries = 80) => {
        for (let i = 0; i < tries; i++) { if (await evalJs(expression)) return true; await sleep(200); }
        throw new Error(`timeout waiting for ${label}`);
    };

    await cdp.send('Page.navigate', { url: `http://127.0.0.1:5173/#demo?r=${Math.random()}` });
    await waitFor(`!!document.querySelector('.rea-canvas')`, 'canvas');
    await sleep(1200);

    // Insert a real Image layer through the paste path, then select it.
    const ids = await evalJs(`(async () => {
        const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAtUlEQVR4nO3QQQkAIADAQPvYzPRGsIIfGcLBAowbc21dNvKDj4IFC1YeLFiw8mDBgpUHCxasPFiwYOXBggUrDxYsWHmwYMHKgwULVh4sWLDyYMGClQcLFqw8WLBg5cGCBSsPFixYebBgwcqDBQtWHixYsPJgwYKVBwsWrDxYsGDlwYIFKw8WLFh5sGDByoMFC1YeLFiw8mDBgpUHCxasPFiwYOXBggUrDxYsWHmwYMHKgwXrTQcUf17GwpbCcwAAAABJRU5ErkJggg==';
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const file = new File([bytes], 'probe.png', { type: 'image/png' });
        const dt = new DataTransfer();
        dt.items.add(file);
        document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        await new Promise(r => setTimeout(r, 1500));
        const root = document.querySelector('[data-shadow-canvas]').shadowRoot;
        const img = [...root.querySelectorAll('img[data-design-id]')].at(-1);
        const rect = root.querySelector('[data-design-kind="Rect"]');
        return { image: img?.getAttribute('data-design-id') ?? null, rect: rect?.getAttribute('data-design-id') ?? null };
    })()`);
    console.log('layers:', JSON.stringify(ids));
    if (!ids.image) throw new Error('image layer was never inserted');

    const boxOf = id => evalJs(`(() => { const b = document.querySelector('[data-shadow-canvas]').shadowRoot.querySelector('[data-design-id="${id}"]').getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2, left: b.left, top: b.top, width: b.width, height: b.height }; })()`);
    const startSampling = id => evalJs(`(() => {
        window.__samples = [];
        const root = document.querySelector('[data-shadow-canvas]').shadowRoot;
        window.__loop = () => {
            const el = root.querySelector('[data-design-id="${id}"]');
            if (el) { const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
                window.__samples.push({ l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), cls: el.className, style: el.getAttribute('style'), rotate: cs.rotate }); }
            window.__raf = requestAnimationFrame(window.__loop);
        };
        window.__loop(); return true; })()`);
    const samples = () => evalJs(`(() => { cancelAnimationFrame(window.__raf); return window.__samples; })()`);
    const rotateInClass = cls => { const m = /rotate-\[(-?[\d.]+)deg\]/.exec(cls); return m ? Number(m[1]) : null; };

    // 1. Move the image: it may never sit behind the pointer path.
    const before = await boxOf(ids.image);
    await startSampling(ids.image);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: before.x, y: before.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 60; i++) {
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: before.x + i * 4, y: before.y + i * 2, button: 'left', buttons: 1 });
        await sleep(6);
        if (i === 30) { const shot = await cdp.send('Page.captureScreenshot', {}); writeFileSync('/tmp/rea-canvas-drag-mid.png', Buffer.from(shot.result.data, 'base64')); }
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: before.x + 240, y: before.y + 120, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(400);
    let frames = await samples();    const lefts = frames.map(f => f.l);
    const backwards = lefts.filter((v, i) => i > 0 && v < lefts[i - 1] - 1);
    check('image move follows the pointer', backwards.length === 0, `${frames.length} frames, backwards ${JSON.stringify(backwards.slice(0, 6))}, min ${Math.min(...lefts)} (start ${Math.round(before.left)})`);
    check('image move lands where it was dropped', Math.abs(lefts.at(-1) - (before.left + 240)) <= 2, `final ${lefts.at(-1)} want ${Math.round(before.left + 240)}`);
    check('preview mirrors geometry inline while dragging', frames.some(f => f.style && f.style.includes('left')), frames.find(f => f.style)?.style ?? 'none');
    check('dragged layer keeps no inline style once committed', frames.at(-1).style === null || frames.at(-1).style === '', String(frames.at(-1).style));

    // 2. Resize the image from its south-east handle: no frame may collapse the box.
    const box = await boxOf(ids.image);
    const handle = await evalJs(`(() => { const h = document.querySelector('.rea-handle-se'); if (!h) return null; const b = h.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    if (!handle) throw new Error('south-east resize handle is missing');
    await startSampling(ids.image);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: handle.x, y: handle.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 40; i++) {
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x + i * 3, y: handle.y + i * 3, button: 'left', buttons: 1 });
        await sleep(6);
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: handle.x + 120, y: handle.y + 120, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(400);
    frames = await samples();
    const widths = frames.map(f => f.w), tops = frames.map(f => f.t), resizeBackwards = widths.filter((v, i) => i > 0 && v < widths[i - 1] - 1);
    check('image resize keeps its top edge', tops.every(t => Math.abs(t - Math.round(box.top)) <= 1), `tops ${JSON.stringify([...new Set(tops)].slice(0, 8))}`);
    check('image resize grows monotonically', resizeBackwards.length === 0, `widths ${Math.min(...widths)}..${Math.max(...widths)}, backwards ${JSON.stringify(resizeBackwards.slice(0, 6))}`);

    // 3. Rotate: the inline mirror must not double-apply against the compiled class.
    const corner = await evalJs(`(() => { const h = document.querySelector('.rea-handle-nw.rea-rotate-handle'); if (!h) return null; const b = h.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    if (!corner) throw new Error('north-west rotate handle is missing');
    await startSampling(ids.image);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: corner.x, y: corner.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 30; i++) {
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: corner.x + i * 5, y: corner.y + i * 2, button: 'left', buttons: 1 });
        await sleep(6);
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: corner.x + 150, y: corner.y + 60, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(400);
    frames = await samples();
    const rotated = frames.map(f => ({ want: rotateInClass(f.cls), got: f.rotate === 'none' ? 0 : Number(String(f.rotate).replace('deg', '')), cls: f.cls }));
    const doubled = rotated.filter(r => r.want !== null && Math.abs(r.got - r.want) > 1);
    check('rotation matches its compiled class (no double rotate)', doubled.length === 0, `${rotated.length} frames, worst ${JSON.stringify(doubled.slice(0, 3))}`);
    check('rotation actually changed', rotated.some(r => r.want !== null && Math.abs(r.want) > 1), JSON.stringify(rotated.at(-1)));

    const shot = await cdp.send('Page.captureScreenshot', {});
    writeFileSync('/tmp/rea-canvas-drag.png', Buffer.from(shot.result.data, 'base64'));
    console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
    if (failures) process.exitCode = 1;
} finally {
    proc.kill('SIGTERM');
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* reaped by OS */ }
}
