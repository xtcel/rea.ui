// Regression check: ⌘S inside the editor must save the document to a .reaui file instead of
// falling through to the browser's own "save page" dialog. Before the fix the shortcut was not
// bound at all, so nothing was written and the file on disk kept the old design.
// The download anchor is observed in the page so the check does not depend on Chrome's policy for
// repeated automatic downloads. Raw CDP over Node's built-in WebSocket, same harness as
// verify-canvas-drag.mjs.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9339, URL = process.env.REA_URL ?? 'http://127.0.0.1:5173/';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-save-'));
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
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    async function evalJs(expression) {
        const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    }
    const waitFor = async (expression, label, tries = 100) => {
        for (let i = 0; i < tries; i++) { if (await evalJs(expression)) return true; await sleep(100); }
        throw new Error(`timeout waiting for ${label}`);
    };
    const press = async (modifiers) => {
        const base = { modifiers, key: 's', code: 'KeyS', windowsVirtualKeyCode: 83, nativeVirtualKeyCode: 1 };
        await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    };

    await cdp.send('Page.navigate', { url: `${URL}?verify=${Date.now()}#demo` });
    await waitFor("!!document.querySelector('.rea-canvas') && !!document.querySelector('.rea-save')", 'editor shell with the built-in design');

    // Observe the download the editor starts, then read the bytes it produced.
    await evalJs(`(() => {
      window.__saves = [];
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        window.__saves.push({ name: this.download, href: this.href });
        if (!this.download) click.call(this);
      };
      return true;
    })()`);

    await press(4); // Meta
    await waitFor('window.__saves.length === 1', '⌘S to start a save').catch(() => {});
    const saves = await evalJs('window.__saves');
    check('⌘S saves a .reaui', saves.length === 1 && saves[0].name.toLowerCase().endsWith('.reaui'), JSON.stringify(saves.map(s => s.name)));
    const bytes = await evalJs(`(async () => {
      const buffer = new Uint8Array(await (await fetch(window.__saves[0].href)).arrayBuffer());
      const text = new TextDecoder().decode(buffer);
      return { magic: [...buffer.slice(0, 2)], size: buffer.length, manifest: text.includes('rea.json'), pages: text.includes('pages/') };
    })()`);
    check('saved bytes are a ZIP document', bytes.magic[0] === 0x50 && bytes.magic[1] === 0x4b, bytes.magic.join(','));
    check('saved bytes carry the manifest and a page', bytes.manifest && bytes.pages);
    check('saved bytes are not empty', bytes.size > 1024, `${bytes.size} bytes`);
    const notice = await evalJs("document.querySelector('.rea-notice')?.textContent ?? ''");
    check('the editor reports the save', notice.includes('已下载'), notice || '无提示');

    await press(4 | 8); // Meta+Shift
    await waitFor('window.__saves.length === 2', '⇧⌘S to start a save-as').catch(() => {});
    check('⇧⌘S also saves a file', (await evalJs('window.__saves.length')) === 2);

    // ⌘S must not depend on focus: the shortcut is handled before the "typing" guard.
    await evalJs(`(() => {
      const input = document.createElement('input');
      input.id = 'verify-focus';
      document.body.append(input);
      input.focus();
      return document.activeElement === input;
    })()`);
    await press(4);
    await waitFor('window.__saves.length === 3', '⌘S from a focused input').catch(() => {});
    check('⌘S saves while a text field has focus', (await evalJs('window.__saves.length')) === 3);
    await evalJs("document.getElementById('verify-focus')?.remove()");

    ws.close();
} catch (error) {
    failures++;
    console.log(`FAIL harness: ${error instanceof Error ? error.message : String(error)}`);
} finally {
    proc.kill('SIGKILL');
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
    console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
    process.exit(failures ? 1 : 0);
}
