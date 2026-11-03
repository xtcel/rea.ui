import { describe, expect, it } from 'vitest';
import { compile } from '@tailwindcss/node';
import { createManifest, DocumentSession } from '@rea/document';
import { exportPageCode, exportReaui } from '@rea/storage';
import { TailwindCompiler } from '@rea/tailwind';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const pageSource=`import { Page, Frame, Rect, Text } from '@rea/design';
export default <Page id="main" designId="page-main" className="relative bg-slate-100"><Frame designId="frame-export" className="absolute left-8 top-8 w-[640px] h-[480px] bg-white rounded-2xl overflow-hidden"><Rect designId="rect-export" name="导出样式抽样" className="absolute left-8 top-8 w-[317px] h-[120px] bg-blue-500/40 rounded-tl-sm rounded-tr-xl rounded-br-2xl rounded-bl-lg rotate-3 outline-[3px] outline-[#123456] outline-offset-[-1.5px] shadow-[0px_4px_12px_0px_rgba(0,0,0,0.25),inset_0px_2px_4px_0px_rgba(0,0,0,0.15)]"/><Text designId="text-export" className="absolute left-8 top-48 font-['Noto_Sans_SC'] font-semibold text-2xl leading-[36px] tracking-[0.02em] text-[#123456] underline">属性面板样式抽样</Text></Frame></Page>`;
describe('export into default Tailwind v4',()=>{
  it('uses the same sampled declarations in a standard @import tailwindcss build',async()=>{
    const manifest=createManifest('doc_export_qa','属性面板 QA',[{id:'main',file:'pages/main.page.tsx'}]);
    const files={'rea.json':JSON.stringify(manifest),'pages/main.page.tsx':pageSource};const session=new DocumentSession(files);
    const classes=[...session.pages.get('main')!.page.nodes.values()].map(n=>n.element.props.className??'');const runtime=await new TailwindCompiler().build(classes);
    const compiler=await compile('@import "tailwindcss";',{base:resolve('apps/web'),onDependency:()=>{}});const css=compiler.build(classes.flatMap(c=>c.split(/\s+/)));
    for(const value of ['317px','120px','36px','0.02em','Noto Sans SC','-1.5px','rgba(0,0,0,0.25)']){expect(runtime.css).toContain(value);expect(css).toContain(value);}
    const dir=resolve('test-results/property-export');mkdirSync(dir,{recursive:true});
    writeFileSync(resolve(dir,'page.tsx'),exportPageCode(pageSource));writeFileSync(resolve(dir,'sample.css'),css);
    writeFileSync(resolve(dir,'fixture.reaui'),await exportReaui({files}));
    writeFileSync(resolve(dir,'index.html'),'<html lang="zh-CN"><head><meta charset="utf-8"><link rel="stylesheet" href="./sample.css"></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
    writeFileSync(resolve(dir,'main.tsx'),`import {createRoot} from 'react-dom/client';import page from './page';import {PageRenderer} from '../../packages/renderer-dom/src/render';import {ShadowCanvas} from '../../packages/renderer-dom/src/ShadowCanvas';createRoot(document.getElementById('root')!).render(<main><section style={{position:'relative',height:540}} aria-label="默认 Tailwind 导出"><PageRenderer page={page}/></section><section style={{position:'relative',height:540}} aria-label="编辑器运行时"><ShadowCanvas page={page}/></section></main>);`);
  });
});
