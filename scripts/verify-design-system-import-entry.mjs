// End-to-end check for the design-system import entry: a plain-prose DESIGN.md must join the
// conversation as reference material instead of failing the frontmatter grammar check.
// Raw CDP, same harness as verify-design-system-pin.mjs.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9343;
const BASE = process.env.REA_BASE ?? 'http://127.0.0.1:5173';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-import-'));
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

// Exactly the shape that used to be rejected: a prose design guide with no frontmatter.
const PROSE = `# Monday.com Design System

> Work management with vivid color coding, polished SaaS structure.

---

## 1. Visual Theme & Atmosphere

### Overall Aesthetic
Monday.com feels like structured work software with energetic visual coding.

## 2. Color Palette & Roles
| Token | Hex | Role |
|-------|-----|------|
| \`--monday-blue\` | \`#006BFF\` | Primary action |
| \`--monday-ink\` | \`#1F2430\` | Text |
`;

try {
    await getJson('/json/version');
    const page = await getJson('/json/new?about:blank', 'PUT');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const cdp = new Cdp(ws);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const evalJs = async expression => {
        const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    const waitFor = async (expression, label, tries = 80) => {
        for (let i = 0; i < tries; i++) { if (await evalJs(expression)) return true; await sleep(200); }
        throw new Error(`timeout waiting for ${label}`);
    };
    const shot = async name => {
        const png = await cdp.send('Page.captureScreenshot', {});
        writeFileSync(`/tmp/${name}.png`, Buffer.from(png.result.data, 'base64'));
    };

    await cdp.send('Page.navigate', { url: `${BASE}/?r=${Math.random()}` });
    await waitFor(`!!document.querySelector('.home-shell')`, 'home shell');
    await evalJs(`[...document.querySelectorAll('.home-nav-item')].find(node => node.textContent.includes('设计系统')).click()`);
    await waitFor(`!!document.querySelector('.home-system-card')`, 'system cards');
    await evalJs(`document.querySelector('.home-system-card').click()`);
    await waitFor(`!!document.querySelector('.sys-page')`, 'design system page');

    check('entry card names the import path', (await evalJs(`[...document.querySelectorAll('.sys-entry')].some(node => node.textContent.includes('导入 DESIGN.md'))`)));
    check('file input exists for the header entry', (await evalJs(`!!document.querySelector('input[aria-label="导入设计系统素材"]')`)));

    await evalJs(`(() => {
        const file = new File([${JSON.stringify(PROSE)}], 'DESIGN (1).md', { type: 'text/markdown' });
        const data = new DataTransfer();
        data.items.add(file);
        const input = document.querySelector('input[aria-label="导入设计系统素材"]');
        input.files = data.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.files.length;
    })()`);

    await waitFor(`!!document.querySelector('.sys-chips')`, 'attachment chip');
    await sleep(400);

    const banners = await evalJs(`[...document.querySelectorAll('.sys-banner')].map(node => node.textContent.replace(/\\s+/g, ' ').trim())`);
    const draft = await evalJs(`document.querySelector('textarea[aria-label="描述你需要的设计系统"]')?.value ?? ''`);
    const staged = await evalJs(`document.querySelector('.sys-chips')?.innerText.replace(/\\s+/g, ' ').trim() ?? ''`);
    const turnsBefore = await evalJs(`document.querySelectorAll('.sys-chat-log .sys-turn').length`);
    check('frontmatter error is gone', !banners.some(text => text.includes('frontmatter')), JSON.stringify(banners));
    check('attachment is staged in the composer', staged.includes('DESIGN (1).md'), staged);
    check('prompt is pre-filled instead of sent', draft.includes('提取设计系统') && draft.includes('DESIGN (1).md') && turnsBefore === 0, draft.slice(0, 90));
    check('entry no longer blocks on syntax', !banners.some(text => text.includes('DS_MD_INVALID')));
    await shot('rea-ds-import-prefill');

    // The staged prompt only becomes a turn after the user confirms.
    await evalJs(`document.querySelector('.sys-send')?.click()`);
    await waitFor(`!!document.querySelector('.sys-chat-log .sys-turn')`, 'turn after confirm');
    await sleep(400);
    const log = await evalJs(`document.querySelector('.sys-chat-log')?.innerText.replace(/\\s+/g, ' ').trim() ?? ''`);
    check('confirmed prompt sends the file with it', log.includes('DESIGN (1).md') && log.includes('提取设计系统'), log.slice(0, 120));
    await evalJs(`(() => {
        const file = new File(['# 第二份参考'], 'SECOND.md', { type: 'text/markdown' });
        const data = new DataTransfer();
        data.items.add(file);
        const input = document.querySelector('input[aria-label="导入设计系统素材"]');
        input.files = data.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.files.length;
    })()`);
    await sleep(400);
    const bannerText = await evalJs(`[...document.querySelectorAll('.sys-banner')].map(node => node.textContent).join(' ')`);
    const stagedChips = await evalJs(`document.querySelectorAll('.sys-chips > span').length`);
    // Either the run already finished (the file is staged again) or the entry reports the busy state; never a silent drop.
    check('a second file is staged again or refused with a reason', /正在生成/.test(bannerText) || stagedChips >= 1, bannerText || `${stagedChips} chip(s)`);
    await shot('rea-ds-import-entry');
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
