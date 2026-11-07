// One-off CDP check: the editor canvas must follow the dark theme instead of the
// sampled (light) page background. Raw CDP over Node's built-in WebSocket.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9333;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-'));
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

try {
    await getJson('/json/version'); // wait for the endpoint
    const target = await getJson('/json/new?about:blank', 'PUT');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new Cdp(ws);

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    // Headless Chrome defaults to prefers-color-scheme: dark; force light for scenario 1.
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    async function evalJs(expression) {
        const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    }
    async function openEditor(theme) {
        const boot = theme ? `try{localStorage.setItem('rea-theme','${theme}')}catch(e){}` : '';
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: boot });
        await cdp.send('Page.navigate', { url: `http://127.0.0.1:5173/#demo?r=${Math.random()}` });
        for (let i = 0; i < 60; i++) {
            if (await evalJs(`!!document.querySelector('.rea-canvas')`)) { await sleep(800); return; }
            await sleep(250);
        }
        throw new Error('editor never mounted .rea-canvas');
    }
    const probe = () => evalJs(`(() => {
        const canvas = document.querySelector('.rea-canvas');
        const pageOrigin = document.querySelector('[data-shadow-canvas]')?.shadowRoot?.querySelector('[data-page-origin]');
        return { theme: document.documentElement.dataset.theme,
            canvasBg: getComputedStyle(canvas).backgroundColor,
            inlineVar: canvas.style.getPropertyValue('--rea-page-bg'),
            pageClass: pageOrigin?.className ?? null,
            bodyBg: getComputedStyle(document.body).backgroundColor };
    })()`);

    // 1. Light (system default, emulated light): the authored page background paints the pasteboard.
    await openEditor(null);
    const light = await probe();
    console.log('light :', JSON.stringify(light));

    // 2. Live toggle to dark without reload (same event bus path as the toolbar ThemeButton).
    await evalJs(`(localStorage.setItem('rea-theme','dark'), window.dispatchEvent(new CustomEvent('rea:theme',{detail:'dark'})), true)`);
    await sleep(400);
    const darkLive = await probe();
    console.log('dark  :', JSON.stringify(darkLive));

    // 3. Cold boot in dark: the boot script writes the preference before first paint.
    await cdp.send('Page.navigate', { url: 'about:blank' }); // drop the previous document + boot script scope
    await openEditor('dark');
    const darkBoot = await probe();
    console.log('boot  :', JSON.stringify(darkBoot));

    const expect = (name, value, wanted) => {
        const ok = value === wanted;
        console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${value} (want ${wanted})`);
        if (!ok) process.exitCode = 1;
    };
    expect('light theme attr', light.theme, 'light');
    // The demo document authors its page background; light mode must paint it on the pasteboard.
    expect('light canvas uses authored page bg', light.canvasBg, light.inlineVar);
    expect('dark theme attr (live toggle)', darkLive.theme, 'dark');
    expect('dark canvas follows theme (live toggle)', darkLive.canvasBg, 'rgb(13, 15, 17)');
    expect('dark theme attr (cold boot)', darkBoot.theme, 'dark');
    expect('dark canvas follows theme (cold boot)', darkBoot.canvasBg, 'rgb(13, 15, 17)');
} finally {
    proc.kill('SIGTERM');
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* OS will reap the temp dir */ }
}
