// CDP check: the About page shows build-injected versions and reads document versions
// from the shared IndexedDB without mutating the "recently opened" metadata.
// Serves apps/web/dist over a tiny local HTTP server; run `pnpm build` first.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const PORT = 9341;
const BASE = 'http://127.0.0.1:4173';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-about-'));
const dist = join(process.cwd(), 'apps/web/dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.reaui': 'application/octet-stream', '.svg': 'image/svg+xml', '.png': 'image/png' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`); };

const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', BASE);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || !extname(pathname)) pathname = '/index.html';
    const file = join(dist, normalize(pathname).replace(/^[/\\]+/, ''));
    if (!file.startsWith(dist)) { res.writeHead(403); res.end(); return; }
    try {
        const body = readFileSync(file);
        res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
        res.end(body);
    } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));

const proc = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox', 'about:blank',
], { stdio: 'ignore' });

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

let ws;
try {
    await getJson('/json/version');
    const page = await getJson('/json/new?about:blank', 'PUT');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new Cdp(ws);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 720, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    const evalJs = async expression => {
        const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    const waitFor = async (expression, label, tries = 80) => {
        for (let i = 0; i < tries; i++) { if (await evalJs(expression)) return true; await sleep(150); }
        throw new Error(`timeout waiting for ${label}`);
    };
    const read = () => evalJs(`(() => {
        const rows = [...document.querySelectorAll('.rs-about-list > div')].map(row => [
            row.querySelector('dt')?.textContent?.trim(),
            row.querySelector('dd')?.textContent?.trim(),
            row.querySelector('dd')?.getAttribute('title'),
        ]);
        return {
            rows,
            foot: document.querySelector('.rs-nav-foot')?.textContent?.trim(),
            card: document.querySelector('.rs-about small')?.textContent?.trim(),
            error: document.querySelector('.rs-error')?.textContent?.trim() ?? null,
        };
    })()`);
    const row = (state, label) => state.rows.find(item => item[0] === label)?.[1] ?? '';
    const revisit = async () => {
        await evalJs(`[...document.querySelectorAll('.rs-nav-item')].find(b => b.textContent.includes('通用')).click()`);
        await sleep(200);
        await evalJs(`[...document.querySelectorAll('.rs-nav-item')].find(b => b.textContent.includes('关于')).click()`);
    };
    const openDb = `await new Promise((resolve, reject) => { const req = indexedDB.open('rea-ui', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); })`;

    // 1. Cold boot with an empty workspace: only build-injected versions are available.
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}#settings/about` });
    await waitFor(`!!document.querySelector('.rs-about-list')`, 'about list');
    await sleep(300);
    const empty = await read();
    check('footer shows injected editor version', empty.foot === 'REA UI · v0.1.0', String(empty.foot));
    check('about card shows injected editor version', empty.card?.includes('v0.1.0') === true, String(empty.card));
    check('about shows bundled reaui-cli version', row(empty, 'reaui-cli') === 'v0.1.3', row(empty, 'reaui-cli'));
    check('empty workspace omits manifest version', row(empty, '文档格式') === '.reaui（ZIP）', row(empty, '文档格式'));
    check('unpinned system reads 未固定', row(empty, '设计系统') === '未固定', row(empty, '设计系统'));
    check('no settings error banner', empty.error === null, String(empty.error));

    // 2. Write a v4 document into the shared IndexedDB, then re-enter About to re-read it.
    await evalJs(`(async () => {
        const db = ${openDb};
        const manifest = { format: 'reaui', version: 4, id: 'doc_cdp', name: '核对文档', pages: [{ id: 'main', file: 'pages/main.page.tsx' }], createdAt: '2026-01-01T00:00:00.000Z' };
        const files = { 'rea.json': JSON.stringify(manifest), 'pages/main.page.tsx': 'export default null;' };
        await new Promise((resolve, reject) => {
            const tx = db.transaction(['documents', 'meta'], 'readwrite');
            tx.objectStore('documents').put({ id: 'doc_cdp', name: '核对文档', createdAt: manifest.createdAt, updatedAt: new Date().toISOString(), revision: 1, manifest, files });
            tx.objectStore('meta').put({ key: 'lastOpenedId', value: 'doc_cdp' });
            tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
        return true;
    })()`);
    await revisit();
    await waitFor(`[...document.querySelectorAll('.rs-about-list dd')].some(dd => dd.textContent.includes('清单 v4'))`, 'manifest v4');
    const v4 = await read();
    check('re-reads manifest version on re-entry', row(v4, '文档格式') === '.reaui（ZIP） · 清单 v4', row(v4, '文档格式'));
    check('v4 without snapshot stays 未固定', row(v4, '设计系统') === '未固定', row(v4, '设计系统'));
    const meta = await evalJs(`(async () => {
        const db = ${openDb};
        return await new Promise((resolve, reject) => { const req = db.transaction('meta').objectStore('meta').get('lastOpenedId'); req.onsuccess = () => resolve(req.result?.value); req.onerror = () => reject(req.error); });
    })()`);
    check('viewing About does not rewrite lastOpenedId', meta === 'doc_cdp', String(meta));

    // 3. A broken snapshot must be reported as invalid, not as "unpinned".
    await evalJs(`(async () => {
        const db = ${openDb};
        await new Promise((resolve, reject) => {
            const tx = db.transaction('documents', 'readwrite'), store = tx.objectStore('documents');
            const req = store.get('doc_cdp');
            req.onsuccess = () => { const doc = req.result; doc.files['design/system.json'] = '{broken'; doc.revision += 1; store.put(doc); };
            tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
        return true;
    })()`);
    await revisit();
    await waitFor(`[...document.querySelectorAll('.rs-about-list dd')].some(dd => dd.textContent.includes('快照无效'))`, 'invalid snapshot');
    const broken = await read();
    check('invalid snapshot reads 快照无效', row(broken, '设计系统') === '快照无效', row(broken, '设计系统'));
    check('manifest version survives a broken snapshot', row(broken, '文档格式').includes('清单 v4'), row(broken, '文档格式'));
} catch (error) {
    failures++;
    console.log(`FAIL harness: ${error instanceof Error ? error.message : String(error)}`);
} finally {
    try { ws?.close(); } catch { /* best effort */ }
    proc.kill('SIGTERM');
    server.close();
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* OS will reap it */ }
    console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
    process.exit(failures ? 1 : 0);
}
