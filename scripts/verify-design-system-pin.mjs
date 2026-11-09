// End-to-end check for the design-system release path: publish a version from the workbench,
// pin it to the open document, confirm the canvas injects :host variables, reload to prove the
// v4 snapshot persisted, then unpin. Raw CDP, same harness as verify-canvas-drag.mjs.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9337;
const BASE = process.env.REA_BASE ?? 'http://127.0.0.1:5199';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-ds-'));
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
    const waitFor = async (expression, label, tries = 100) => {
        for (let i = 0; i < tries; i++) { if (await evalJs(expression)) return true; await sleep(200); }
        throw new Error(`timeout waiting for ${label}`);
    };
    const clickText = (scope, text, exact = false) => evalJs(`(() => {
        const root = ${scope};
        const button = [...root.querySelectorAll('button')].find(node => {
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
    const hostVariable = name => evalJs(`(() => { const host = document.querySelector('[data-shadow-canvas]'); return host ? getComputedStyle(host).getPropertyValue('${name}').trim() : null; })()`);

    // 1. Authoring: fork a built-in system and publish revision 1.
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}` });
    await waitFor(`!!document.querySelector('.home-shell')`, 'home shell');
    await evalJs(`[...document.querySelectorAll('.home-nav-item')].find(b => b.textContent.includes('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.home-system-card')`, 'system cards');
    await evalJs(`document.querySelector('.home-system-card').click()`);
    await waitFor(`!!document.querySelector('.system-workbench')`, 'workbench');
    check('publishes a built-in as a copy', await clickText(`document.querySelector('.system-heading-actions')`, '复制并发布'));
    const record = await (async () => {
        for (let i = 0; i < 60; i++) {
            const value = await evalJs(`(() => { const list = JSON.parse(localStorage.getItem('rea-home:systems') ?? '[]'); return list.find(item => item.revision >= 1) ?? null; })()`);
            if (value) return value;
            await sleep(250);
        }
        return null;
    })();
    check('copy stores its published revision and hash', !!record && record.id !== 'rea' && record.revision === 1 && /^[0-9a-f]{64}$/.test(record.hash ?? ''), JSON.stringify(record && { id: record.id, revision: record.revision, hash: record.hash?.slice(0, 8) }));
    await clickText(`document.querySelector('.system-section-nav')`, '版本');
    const versions = await evalJs(`(() => { const list = document.querySelector('.system-version-list'); return list ? [...list.querySelectorAll('li')].map(li => li.textContent.replace(/\\s+/g, ' ').trim()) : []; })()`);
    check('version list shows v1 as current', versions.length === 1 && versions[0].includes('v1') && versions[0].includes('当前'), JSON.stringify(versions));
    await shot('rea-ds-workbench-versions');

    // 2. Pinning: open the demo document and bind the published revision.
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}#demo` });
    await waitFor(`!!document.querySelector('.rea-canvas')`, 'canvas');
    await sleep(800);
    check('document starts without a design system', (await hostVariable('--rea-ds-color-primary')) === '');
    await evalJs(`document.querySelector('button[aria-label="主菜单"]').click()`);
    await waitFor(`!!document.querySelector('[role="menu"][aria-label="主菜单"]')`, 'main menu');
    check('main menu exposes the design system entry', await clickText(`document.querySelector('[role="menu"][aria-label="主菜单"]')`, '设计系统'));
    await waitFor(`!!document.querySelector('.rea-dialog[open]')`, 'design system dialog');
    const dialogText = await evalJs(`document.querySelector('.rea-dialog[open]').textContent.replace(/\\s+/g, ' ').trim()`);
    check('dialog starts unpinned and lists the published system', dialogText.includes('未固定') && dialogText.includes('REA UI'), dialogText.slice(0, 90));
    await shot('rea-ds-dialog-list');
    check('pin button is available', await clickText(`document.querySelector('.rea-dialog[open]')`, '固定', true));
    await waitFor(`document.querySelector('.rea-dialog[open]')?.textContent.includes('版本变更')`, 'change preview');
    const changeRows = await evalJs(`document.querySelectorAll('.rea-ds-changes li').length`);
    check('upgrade preview lists the token additions', changeRows > 0, `${changeRows} rows`);
    await shot('rea-ds-pin-preview');
    check('applies the pin transaction', await clickText(`document.querySelector('.rea-dialog[open]')`, '固定此版本'));
    await waitFor(`!document.querySelector('.rea-dialog[open]')`, 'dialog closed');
    await sleep(500);
    const primary = await hostVariable('--rea-ds-color-primary');
    check('canvas injects :host variables from the pinned snapshot', primary.toLowerCase() === '#356af0', primary);
    const radius = await hostVariable('--rea-ds-radius-md');
    check('numeric tokens are exposed too', Number(radius) > 0, radius);
    const shell = await evalJs(`getComputedStyle(document.documentElement).getPropertyValue('--rea-accent').trim()`);
    check('shell tokens stay independent', !!shell, shell);
    await shot('rea-ds-pinned-canvas');

    // 3. Persistence: reload the same document, the snapshot must come back from rea.json.
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}#demo` });
    await waitFor(`!!document.querySelector('.rea-canvas')`, 'canvas after reload');
    await sleep(1200);
    const reloaded = await hostVariable('--rea-ds-color-primary');
    check('pinned snapshot survives reload', reloaded.toLowerCase() === '#356af0', reloaded);
    await evalJs(`document.querySelector('button[aria-label="主菜单"]').click()`);
    await waitFor(`!!document.querySelector('[role="menu"][aria-label="主菜单"]')`, 'main menu after reload');
    const menuLabel = await evalJs(`[...document.querySelectorAll('[role="menu"][aria-label="主菜单"] button')].map(b => b.textContent.trim()).find(t => t.startsWith('设计系统'))`);
    check('menu reports the pinned revision', menuLabel === '设计系统 · v1', menuLabel);
    await evalJs(`[...document.querySelectorAll('[role="menu"][aria-label="主菜单"] button')].find(b => b.textContent.trim().startsWith('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.rea-dialog[open]')`, 'dialog after reload');
    const pinnedText = await evalJs(`document.querySelector('.rea-dialog[open]').textContent.replace(/\\s+/g, ' ').trim()`);
    check('dialog shows the pinned version as active', pinnedText.includes('已固定') && pinnedText.includes('v1'), pinnedText.slice(0, 90));

    // 4. Upgrading: edit the copy, publish revision 2, then accept it from the same dialog.
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}` });
    await waitFor(`!!document.querySelector('.home-shell')`, 'home shell for v2');
    await evalJs(`[...document.querySelectorAll('.home-nav-item')].find(b => b.textContent.includes('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.home-system-card')`, 'system cards for v2');
    await evalJs(`[...document.querySelectorAll('.home-system-card')].filter(card => card.textContent.includes('REA UI')).at(-1).click()`);
    await waitFor(`!!document.querySelector('.system-workbench')`, 'workbench for v2');
    await evalJs(`(() => {
        const input = document.querySelector('.system-color-fields input[type=color]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, '#e0447c');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return input.value;
    })()`);
    await sleep(300);
    check('publishes revision 2 after a token edit', await clickText(`document.querySelector('.system-heading-actions')`, '发布版本'));
    const second = await (async () => {
        for (let i = 0; i < 60; i++) {
            const value = await evalJs(`(() => { const list = JSON.parse(localStorage.getItem('rea-home:systems') ?? '[]'); const item = list.find(entry => entry.revision >= 1); return item?.revision ?? null; })()`);
            if (value === 2) return true;
            await sleep(250);
        }
        return false;
    })();
    check('copy advances to revision 2', second);
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}#demo` });
    await waitFor(`!!document.querySelector('.rea-canvas')`, 'canvas before upgrade');
    await sleep(800);
    await evalJs(`document.querySelector('button[aria-label="主菜单"]').click()`);
    await waitFor(`!!document.querySelector('[role="menu"][aria-label="主菜单"]')`, 'main menu before upgrade');
    await evalJs(`[...document.querySelectorAll('[role="menu"][aria-label="主菜单"] button')].find(b => b.textContent.trim().startsWith('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.rea-dialog[open]')`, 'dialog before upgrade');
    check('upgrade button is offered for the newer revision', await clickText(`document.querySelector('.rea-dialog[open]')`, '升级', true));
    await waitFor(`document.querySelector('.rea-dialog[open]')?.textContent.includes('版本变更')`, 'upgrade preview');
    const upgradeRows = await evalJs(`document.querySelectorAll('.rea-ds-changes li').length`);
    check('upgrade preview reports only the token change', upgradeRows === 1, `${upgradeRows} rows`);
    check('applies the upgrade transaction', await clickText(`document.querySelector('.rea-dialog[open]')`, '应用此版本'));
    await waitFor(`!document.querySelector('.rea-dialog[open]')`, 'dialog closed after upgrade');
    await sleep(500);
    const upgraded = await hostVariable('--rea-ds-color-primary');
    check('canvas picks up the upgraded token value', upgraded.toLowerCase() === '#e0447c', upgraded);

    // 5. Unpinning: one transaction removes the snapshot and the variables.
    await evalJs(`document.querySelector('button[aria-label="主菜单"]').click()`);
    await waitFor(`!!document.querySelector('[role="menu"][aria-label="主菜单"]')`, 'main menu for unpin');
    await evalJs(`[...document.querySelectorAll('[role="menu"][aria-label="主菜单"] button')].find(b => b.textContent.trim().startsWith('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.rea-dialog[open]')`, 'dialog for unpin');
    check('unpin is offered', await clickText(`document.querySelector('.rea-dialog[open]')`, '取消固定'));
    await waitFor(`!document.querySelector('.rea-dialog[open]')`, 'dialog closed after unpin');
    await sleep(500);
    check('variables disappear after unpin', (await hostVariable('--rea-ds-color-primary')) === '');
    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}#demo` });
    await waitFor(`!!document.querySelector('.rea-canvas')`, 'canvas after unpin reload');
    await sleep(1200);
    check('unpin survives reload', (await hostVariable('--rea-ds-color-primary')) === '');
} catch (error) {
    failures++;
    console.log(`FAIL harness: ${error instanceof Error ? error.message : String(error)}`);
} finally {
    proc.kill();
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold the profile. */ }
    console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
    process.exit(failures ? 1 : 0);
}
