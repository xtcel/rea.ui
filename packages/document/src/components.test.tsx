import { describe, expect, it } from 'vitest';
import { ALL_IMPORTS, COMPONENT_FILE, DocumentSession, createManifest, parseCatalog } from './index';

const catalog=(body:string)=>`import { ${ALL_IMPORTS} } from '@rea/design';export default <Components>${body}</Components>;`;
const button=`<Component id="button-main" designId="component-button" name="按钮" parameters={{label:{type:'string',default:'按钮'}}} variants={[{name:'小号',axes:{size:'small'},overrides:{'button-root':{styles:{width:100}}}},{name:'大号',axes:{size:'large'},overrides:{'button-root':{styles:{width:200}}}}]}><Frame designId="button-root" className="relative w-40 h-12 bg-blue-500 rounded-lg p-4"><Text designId="button-text" binding="label" /></Frame></Component>`;
function doc(body:string,definitions=button){const manifest={...createManifest('doc_component','组件',[{id:'home',file:'pages/home.page.tsx'}]),version:3};return new DocumentSession({'rea.json':JSON.stringify(manifest),[COMPONENT_FILE]:catalog(definitions),'pages/home.page.tsx':`import { ${ALL_IMPORTS} } from '@rea/design';export default <Page id="home" designId="page-home">${body}</Page>;`});}
describe('declarative components and instances',()=>{
  it('expands 100 instances from a single source and routes text edits to one instance',()=>{
    let s=doc(Array.from({length:100},(_,i)=>`<Instance designId="instance-${i}" component="button-main" className="absolute left-0 top-0" />`).join(''));
    expect(s.components.size).toBe(1);expect(s.pages.get('home')!.page.nodes.size).toBe(301);
    const original=s.files;s=s.commit({label:'改文字',ops:[{type:'text',pageId:'home',id:'instance-12/button-text',text:'购买'}]});
    expect(s.pages.get('home')!.page.nodes.get('instance-12/button-text')!.element.props.children).toBe('购买');
    expect(s.pages.get('home')!.page.nodes.get('instance-13/button-text')!.element.props.children).toBe('按钮');
    expect(s.files[COMPONENT_FILE]).toBe(original[COMPONENT_FILE]);expect(s.undo().files).toEqual(original);
  });
  it('merges property overrides and preserves them through variant changes',()=>{
    let s=doc('<Instance designId="instance-one" component="button-main" variant={{size:"small"}} />');
    s=s.commit({label:'颜色',ops:[{type:'set',pageId:'home',id:'instance-one/button-root',styles:{bg:'#ff0000'}}]});
    const root=()=>s.pages.get('home')!.page.nodes.get('instance-one/button-root')!.element.props.className!;
    expect(root()).toContain('rounded-lg p-4');expect(root()).toContain('bg-[#FF0000]');
    s=s.commit({label:'切换',ops:[{type:'set',pageId:'home',id:'instance-one',props:{variant:{size:'large'}}}]});
    expect(root()).toContain('bg-[#FF0000]');expect(s.pages.get('home')!.page.nodes.get('instance-one')!.element.props.className).toContain('w-[200px]');
    expect(()=>s.commit({label:'非法',ops:[{type:'set',pageId:'home',id:'instance-one',props:{variant:{size:'missing'}}}]})).toThrow('组合');
  });
  it('edits main component source and synchronizes instances atomically',()=>{
    let s=doc('<Instance designId="instance-one" component="button-main" />');
    s=s.commit({label:'主组件',ops:[{type:'set',pageId:'edit-button-main',id:'button-root',styles:{bg:'#123456'}}]});
    expect(s.pages.get('home')!.page.nodes.get('instance-one/button-root')!.element.props.className).toContain('bg-[#123456]');
    expect(s.componentPages.get('button-main')!.page.nodes.has('button-text')).toBe(true);
  });
  it('allows slot-owned source children and rejects changes outside slots',()=>{
    const card=`<Component id="card-main" designId="component-card"><Frame designId="card-root" className="relative w-80 h-64"><Slot designId="card-slot" slotId="content-main" accepts={['Text','Instance']}><Text designId="card-default">默认</Text></Slot></Frame></Component>`;
    let s=doc('<Instance designId="card-one" component="card-main" />',card);
    expect(()=>s.commit({label:'错误结构',ops:[{type:'insert',pageId:'home',parentId:'card-one/card-root',fragment:'<Text designId="bad-text">bad</Text>'}]})).toThrow('插槽');
    s=s.commit({label:'填充',ops:[{type:'insert',pageId:'home',parentId:'card-one/card-slot',fragment:'<Text designId="own-text">正文</Text>'}]});
    expect(s.pages.get('home')!.page.nodes.has('own-text')).toBe(true);expect(s.pages.get('home')!.page.nodes.has('card-one/card-default')).toBe(false);
    s=s.commit({label:'正文编辑',ops:[{type:'text',pageId:'home',id:'own-text',text:'独立内容'}]});
    expect(s.pages.get('home')!.page.nodes.get('own-text')!.element.props.children).toBe('独立内容');
  });
  it('rejects recursive definitions, dangling overrides and invalid properties',()=>{
    expect(()=>parseCatalog(catalog('<Component id="cycle-main" designId="component-cycle"><Instance designId="cycle-instance" component="cycle-main" /></Component>'))).toThrow('循环');
    expect(()=>doc('<Instance designId="instance-one" component="button-main" overrides={{missing:{text:"bad"}}} />')).toThrow('目标');
    expect(()=>doc('<Instance designId="instance-one" component="button-main" values={{label:3}} />')).toThrow('类型');
  });
  it('routes nested exposed and unexposed text values and fills nested slots by stable paths',()=>{
    const inner='<Component id="inner-card" designId="component-inner" parameters={{label:{type:"string",default:"内部"}}}><Frame designId="inner-root" className="relative w-40 h-20"><Text designId="inner-text" binding="label"/><Slot designId="inner-slot" slotId="content-main" /></Frame></Component>';
    const outer='<Component id="outer-card" designId="component-outer" parameters={{title:{type:"string",default:"外层"}}}><Frame designId="outer-root" className="relative w-80 h-64"><Instance designId="nested-card" component="inner-card" bindings={{"value:label":"title"}} /><Instance designId="nested-second" component="inner-card"/></Frame></Component>';
    let s=doc('<Instance designId="outer-one" component="outer-card"/>',inner+outer);
    s=s.commit({label:'暴露文字',ops:[{type:'text',pageId:'home',id:'outer-one/nested-card/inner-text',text:'已修改'}]});
    expect(s.pages.get('home')!.page.nodes.get('outer-one/nested-card/inner-text')!.element.props.children).toBe('已修改');
    s=s.commit({label:'嵌套文字',ops:[{type:'text',pageId:'home',id:'outer-one/nested-second/inner-text',text:'独立嵌套'}]});
    expect(s.pages.get('home')!.page.nodes.get('outer-one/nested-second/inner-text')!.element.props.children).toBe('独立嵌套');
    s=s.commit({label:'嵌套插槽',ops:[{type:'insert',pageId:'home',parentId:'outer-one/nested-card/inner-slot',fragment:'<Text designId="nested-own">正文</Text>'}]});
    expect(s.pages.get('home')!.page.nodes.get('nested-own')!.element.props.children).toBe('正文');
  });
});
