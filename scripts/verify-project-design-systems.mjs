// Isolated project-system regression: library creation, ownership, local/AI edits, undo,
// responsive layout, persistence and a real .reaui download. Only the model boundary is mocked.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { unzipSync, strFromU8 } = createRequire(new URL('../packages/storage/package.json', import.meta.url))('fflate');
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 9347;
const BASE = process.env.REA_BASE ?? 'http://127.0.0.1:5199';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-project-systems-'));
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

let checks = 0;
const check = (label, valid) => { if (!valid) throw new Error(`FAIL ${label}`); checks++; console.log(`PASS ${label}`); };
try {
    await getJson('/json/version');
    const page = await getJson('/json/new?about:blank', 'PUT');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: profile });
    const evaluate = async expression => {
        const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.result.exceptionDetails) throw new Error(JSON.stringify(result.result.exceptionDetails));
        return result.result.result.value;
    };
    const wait = async (expression, label) => {
        for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await sleep(150); }
        throw new Error(`Timeout: ${label}`);
    };
    const click = async (selector, text) => {
        check(`click ${text || selector}`, await evaluate(`(() => { const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find(n => !n.disabled && ${text ? `n.textContent.includes(${JSON.stringify(text)})` : 'true'}); if (!node) return false; node.click(); return true; })()`));
    };
    const field = async (selector, value, commit = false) => {
        await evaluate(`(() => { const node=document.querySelector(${JSON.stringify(selector)}); if(!node) throw new Error('Missing field'); node.focus(); Object.getOwnPropertyDescriptor(node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype,'value').set.call(node,${JSON.stringify(value)}); node.dispatchEvent(new Event('input',{bubbles:true})); node.dispatchEvent(new Event('change',{bubbles:true})); })()`);
        if (commit) { await sleep(50); await evaluate(`document.querySelector(${JSON.stringify(selector)}).blur()`); }
    };
    const data = async () => evaluate(`(async () => { const db = await new Promise((r,j)=>{const q=indexedDB.open('rea-ui',1);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});const read=(store)=>new Promise((r,j)=>{const q=db.transaction(store).objectStore(store).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});const docs=await read('documents'),meta=await read('meta');db.close();return {docs,meta};})()`);
    const shot = async name => { const result = await cdp.send('Page.captureScreenshot'); writeFileSync(`/tmp/${name}.png`, Buffer.from(result.result.data, 'base64')); };
    const primary = () => evaluate(`getComputedStyle(document.querySelector('[data-shadow-canvas]')).getPropertyValue('--rea-ds-color-primary').trim()`);

    await cdp.send('Page.navigate', { url: BASE });
    await wait(`!!document.querySelector('.home-shell')`, 'home');
    await click('.home-nav-item', '设计系统');
    await click('.home-system-card', 'REA UI');
    await field('input[aria-label="设计系统名称"]', '独立品牌测试');
    await wait(`document.querySelector('.sys-status')?.textContent.includes('已保存')`, 'library save');
    await click('.sys-actions button', '设为新建默认');
    await wait(`!!document.querySelector('.home-shell')`, 'home after save');
    let stored = await data();
    const draft = stored.meta.find(item => item.key === 'design-system-drafts').value.find(item => item.name === '独立品牌测试');
    check('standalone draft persists in IndexedDB', !!draft && draft.id !== 'rea');

    async function create(name, systemId) {
        await click('.home-nav-item', '首页');
        await field('select[aria-label="选择设计系统"]', systemId);
        await click('.home-nav-item', '全部项目');
        await click('.home-page-heading button', '新建项目');
        await field('.home-create-form input', name);
        await click('.home-create-form button[type="submit"]');
        await wait(`!!document.querySelector('.rea-canvas')`, 'editor');
        await sleep(600);
    }
    await create('隔离项目 A', draft.id);
    await click('button[aria-label="返回首页"]');
    await create('隔离项目 B', 'botanical');
    const before = await data();
    const a = before.docs.find(doc => doc.name === '隔离项目 A'), b = before.docs.find(doc => doc.name === '隔离项目 B');
    check('projects carry different independent snapshots', JSON.parse(a.files['design/system.json']).id === draft.id && JSON.parse(b.files['design/system.json']).id === 'botanical');
    check('adopting a draft does not publish', !(before.meta.find(item => item.key === 'design-system-versions')?.value ?? []).some(version => version.id === draft.id));
    await click('button[aria-label="编辑项目设计系统"]');
    await wait(`!!document.querySelector('.sys-page')`, 'project system editor');
    await field('input[aria-label="primary 色值"]', '#AA2244', true);
    await wait(`document.querySelector('.sys-status')?.textContent.includes('已保存')`, 'project system save');
    await shot('rea-project-system-desktop');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(200); await shot('rea-project-system-mobile');
    check('mobile system editor has no page overflow', await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    check('mobile save action remains visible and inside the viewport', await evaluate(`(() => {const button=document.querySelector('.sys-actions .home-primary-button');const box=button.getBoundingClientRect();return box.width>0&&box.left>=0&&box.right<=innerWidth;})()`));
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await click('.sys-actions button', '保存并返回项目');
    await wait(`!!document.querySelector('.rea-canvas')`, 'canvas after edit');
    check('canvas receives local primary', (await primary()).toUpperCase() === '#AA2244');
    await click('button[aria-label^="撤销"]');
    check('undo restores the source snapshot', (await primary()).toLowerCase() === '#39725a');
    await click('button[aria-label^="重做"]');
    check('redo restores the project variant', (await primary()).toUpperCase() === '#AA2244');
    await click('button[aria-label="编辑项目设计系统"]');
    await click('.sys-actions button', '另存到系统库');
    await wait(`document.querySelector('[role="status"]')?.textContent.includes('已另存')`, 'save as library');

    // Mock only the model boundary; the UI, persistence, validation and document transactions are real.
    await evaluate(`(() => { const original=window.fetch; let output; window.fetch=async (url,options)=>{ if(String(url)!=='/__rea/agent')return original(url,options);const call=JSON.parse(options.body);if(call.method==='start'){const input=document.querySelector('input[aria-label="primary 色值"]'); output={summary:'已将项目主色改为测试色',name:'项目系统 AI 测试',description:'测试',guidelines:'保持一致',components:[],tokens:{color:{primary:'#123ABC'},typography:{family:'system-ui',roles:{body:{size:14,lineHeight:1.5,weight:400}}},space:{unit:4,scale:[4,8,16]},radius:{sm:4,md:8,lg:12}}};return new Response(JSON.stringify({result:{id:'mock-project-system'}}),{headers:{'Content-Type':'application/json'}});}if(call.method==='status')return new Response(JSON.stringify({result:{id:'mock-project-system',state:'completed',events:['测试模型返回'],result:output,error:null}}),{headers:{'Content-Type':'application/json'}});return new Response(JSON.stringify({result:{path:'mock',version:'test',loggedIn:true}}),{headers:{'Content-Type':'application/json'}});};})()`);
    await field('textarea[aria-label="描述你需要的设计系统"]', '将当前项目系统主色改为测试色');
    await click('button[aria-label="发送给 Agent"]');
    await wait(`document.querySelector('.sys-agent-message')?.textContent.includes('已将项目主色')`, 'system AI result');
    await click('.sys-actions button', '保存并返回项目');
    await wait(`!!document.querySelector('.rea-canvas')`, 'canvas after AI');
    check('project AI edits use document transactions', (await primary()).toUpperCase() === '#123ABC');
    await sleep(700);
    stored = await data();
    const edited = stored.docs.find(doc => doc.id === b.id), snapshot = JSON.parse(edited.files['design/system.json']);
    check('origin survives local and AI edits', snapshot.projectId === b.id && snapshot.origin.id === 'botanical');
    check('other project and library remain unchanged', stored.docs.find(doc => doc.id === a.id).files['design/system.json'] === a.files['design/system.json'] && stored.meta.find(item => item.key === 'design-system-drafts').value.find(item => item.id === draft.id).color === draft.color);
    check('system AI conversation belongs to the file', edited.files['agent/system-sessions.json'].includes('将当前项目系统主色'));
    await click('button[aria-label="主菜单"]');
    await click('[role="menu"] button', '导出为 .reaui');
    for (let i=0;i<60&&!readdirSync(profile).some(file=>file.endsWith('.reaui'));i++)await sleep(100);
    const download = readdirSync(profile).find(file => file.endsWith('.reaui'));
    check('UI exports a reaui file', !!download);
    const zip = unzipSync(readFileSync(join(profile, download)));
    check('export contains the exact project system and authoring history', strFromU8(zip['design/system.json']) === edited.files['design/system.json'] && strFromU8(zip['agent/system-sessions.json']).includes('将当前项目系统主色'));
    await cdp.send('Page.reload');
    await wait(`!!document.querySelector('.home-shell')`, 'reloaded home');
    await click('.home-project-card', '隔离项目 B');
    await wait(`!!document.querySelector('.rea-canvas')`, 'reloaded editor');
    check('project snapshot survives reload', (await primary()).toUpperCase() === '#123ABC');
    await click('button[aria-label="编辑项目设计系统"]');
    check('project system conversation survives reload', await evaluate(`document.querySelector('.sys-chat-log').textContent.includes('将当前项目系统主色')`));
    await shot('rea-project-system-ai');
    await click('.sys-actions button', '保存并返回项目');
    await wait(`!!document.querySelector('.rea-canvas')`, 'canvas before adopt');
    await click('button[aria-label="主菜单"]');
    await click('[role="menu"] button', '设计系统');
    await wait(`!!document.querySelector('.rea-dialog[open] .rea-ds-versions')`, 'system chooser');
    check('existing projects can choose an unpublished library draft', await evaluate(`(() => {const section=[...document.querySelectorAll('.rea-ds-versions')].find(node=>node.querySelector('header strong').textContent==='独立品牌测试');const button=section?.querySelector('button');if(!button)return false;button.click();return true;})()`));
    await wait(`document.querySelector('.rea-dialog[open]')?.textContent.includes('版本变更')`, 'adoption preview');
    await click('.rea-dialog[open] button', '应用此版本');
    await wait(`!document.querySelector('.rea-dialog[open]')`, 'adoption committed');
    check('adoption changes only the project snapshot', (await primary()).toUpperCase() === draft.color.toUpperCase());
    console.log(`Verified ${checks} browser checks.`);
    ws.close();
} catch (error) { console.error(error); process.exitCode = 1; }
finally { proc.kill('SIGTERM'); await sleep(200); rmSync(profile, { recursive: true, force: true }); }

