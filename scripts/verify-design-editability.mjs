// Browser regression for the editable workbench. Run after building apps/web.
// Uses a temporary Chrome profile and localhost server; never touches user documents.
// Verifies compound selection, hole editing, insertion and persisted reopen.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const PORT = 9347;
const BASE = 'http://127.0.0.1:4187';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'rea-cdp-editability-'));
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
await new Promise(resolve => server.listen(4187, '127.0.0.1', resolve));

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


let ws, cdp;
const exceptions=[];
try {
  await getJson('/json/version');
  const page = await getJson('/json/new?about:blank', 'PUT');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.addEventListener('open',res);ws.addEventListener('error',rej);});
  cdp=new Cdp(ws);
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);});
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1600,height:1100,deviceScaleFactor:1,mobile:false});
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');
  const evalJs=async expression=>{const r=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.result.exceptionDetails)throw new Error(r.result.exceptionDetails.exception?.description??JSON.stringify(r.result.exceptionDetails));return r.result.result.value;};
  const waitFor=async(expression,label)=>{for(let i=0;i<100;i++){if(await evalJs(expression))return;await sleep(150);}throw new Error('timeout: '+label);};
  await cdp.send('Page.navigate',{url:BASE});
  await waitFor('!!document.querySelector("button")','app');await sleep(500);
  const files=Object.fromEntries(['rea.json','pages/main.page.tsx','components/main.components.tsx'].map(file=>[file,readFileSync(join(process.cwd(),'examples/editable-workbench',file),'utf8')]));
  const manifest=JSON.parse(files['rea.json']);
  await evalJs(`(async()=>{const files=${JSON.stringify(files)},manifest=${JSON.stringify(manifest)};const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('rea-ui',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});await new Promise((resolve,reject)=>{const tx=db.transaction(['documents','meta'],'readwrite');tx.objectStore('documents').put({id:manifest.id,name:manifest.name,createdAt:manifest.createdAt,updatedAt:new Date().toISOString(),revision:1,manifest,files});tx.objectStore('meta').put({key:'desktop:app-design:v1',value:manifest.id});tx.objectStore('meta').put({key:'lastOpenedId',value:manifest.id});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();return true;})()`);
  await cdp.send('Page.reload',{});
  await waitFor(`document.body.innerText.includes('可编辑工作台示例')`,'sample card');
  await evalJs(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='可编辑工作台示例')?.click()`);
  await waitFor('!!document.querySelector(".rea-canvas")','sample canvas');await sleep(1200);
  const state=await evalJs(`(()=>{const root=document.querySelector('[data-shadow-canvas]').shadowRoot;const icon=root.querySelector('[data-design-id="compound-icon"]');return {names:root.textContent.includes('新材料稳定性验证'),instances:root.querySelectorAll('[data-design-kind="Instance"]').length,fillRule:getComputedStyle(icon).fillRule,d:icon.querySelector('path').getAttribute('d')};})()`);
  check('sample renders component instances and bound copy',state.instances>=16&&state.names,JSON.stringify({instances:state.instances}));
  check('compound icon preserves evenodd and two contours',state.fillRule==='evenodd'&&(state.d.match(/M /g)??[]).length===2);
  const full=await cdp.send('Page.captureScreenshot',{});writeFileSync('/tmp/reaui-editability-full.png',Buffer.from(full.result.data,'base64'));
  await evalJs(`document.querySelector('#rea-tab-layers').click()`);
  for(const id of ['desktop-artboard','sidebar','brand']){
    await evalJs(`(()=>{const row=document.querySelector('[data-layer-id="${id}"]');row?.querySelector('button[aria-expanded="false"]')?.click();return !!row;})()`);await sleep(100);
  }
  await evalJs(`document.querySelector('[data-layer-id="compound-icon"] [data-layer-name]').click()`);
  await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent==='编辑锚点')`,'edit action');
  await evalJs(`[...document.querySelectorAll('button')].find(b=>b.textContent==='编辑锚点').click()`);
  await waitFor(`document.querySelector('select[aria-label="选择路径轮廓"]')?.options.length===2`,'contour selector');
  check('compound path enters anchor editing with both contours',true);
  await evalJs(`(()=>{const select=document.querySelector('select[aria-label="选择路径轮廓"]');select.value='1';select.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);await sleep(200);
  const anchor=await evalJs(`(()=>{const a=document.querySelector('.rea-vector-overlay rect[data-anchor="0"]');const b=a.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()`);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...anchor,button:'left',buttons:1,clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:anchor.x+5,y:anchor.y+2,button:'left',buttons:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:anchor.x+5,y:anchor.y+2,button:'left',buttons:0,clickCount:1});await sleep(300);
  const readPath=`document.querySelector('[data-shadow-canvas]').shadowRoot.querySelector('[data-design-id="compound-icon"] path').getAttribute('d')`;
  const changed=await evalJs(readPath),beforeContours=state.d.split(' M '),afterContours=changed.split(' M ');
  check('dragging a hole anchor preserves the outer contour',beforeContours[0]===afterContours[0]&&beforeContours[1]!==afterContours[1]);
  await evalJs(`[...document.querySelectorAll('.rea-vector-actions button')].find(b=>b.textContent==='插入锚点').click()`);await sleep(150);
  check('inserts an anchor on the selected contour',await evalJs(`document.querySelectorAll('.rea-vector-overlay rect[data-anchor]').length===5`));
  const shot=await cdp.send('Page.captureScreenshot',{});writeFileSync('/tmp/reaui-editability-contours.png',Buffer.from(shot.result.data,'base64'));
  await evalJs(`[...document.querySelectorAll('.rea-vector-actions button')].find(b=>b.textContent==='完成').click()`);
  await sleep(1000);
  await cdp.send('Page.navigate',{url:BASE+'/#demo'});await waitFor('!!document.querySelector(".rea-canvas")','reopened sample');await sleep(800);
  const reopened=await evalJs(readPath);
  check('saved compound path reopens with changed hole and original outer contour',reopened.split(' M ')[0]===beforeContours[0]&&reopened!==state.d);
} catch(error) {
  failures++;console.log('FAIL harness: '+(error.stack??String(error)));
  if(cdp){const debug=await cdp.send('Runtime.evaluate',{expression:'document.body.innerText',returnByValue:true});console.log('page:',debug.result?.result?.value);const shot=await cdp.send('Page.captureScreenshot',{});if(shot.result?.data)writeFileSync('/tmp/reaui-editability-failure.png',Buffer.from(shot.result.data,'base64'));}
  const dump=await cdp.send('Runtime.evaluate',{expression:`(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('rea-ui',1);q.onsuccess=()=>r(q.result);});return await new Promise(r=>{const q=db.transaction('documents').objectStore('documents').getAll();q.onsuccess=()=>r(q.result.map(d=>({id:d.id,name:d.name})));});})()`,returnByValue:true,awaitPromise:true});console.log('records:',dump.result?.result?.value);console.log('exceptions:',JSON.stringify(exceptions));
}
finally {
  try{ws?.close();}catch{}
  proc.kill('SIGTERM');server.close();
  try{rmSync(profile,{recursive:true,force:true,maxRetries:5});}catch{}
  console.log(failures?`${failures} check(s) failed`:'all checks passed');process.exit(failures?1:0);
}
