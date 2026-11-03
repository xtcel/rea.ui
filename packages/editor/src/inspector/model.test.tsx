import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentSession } from '@rea/document';
import { createDefaultV2Document } from '@rea/storage';
import { fixedValue, readProperty, readStroke, strokePatch, parseShadows, formatShadows } from '@rea/tailwind';
import { alignmentReason, alignmentTransaction, fieldDescriptor, fieldTransaction, layoutTransaction, mergeField, nodeRect, numericTransaction, textFieldPresentation, otherStyles, sectionVisibility } from './model';
import { PropertyPanel } from './PropertyPanel';
function fixture(){const doc=createDefaultV2Document();doc.files['pages/main.page.tsx']=`import {Page,Frame,Rect,Text,Group,Vector} from '@rea/design';export default <Page id="main" designId="page-main"><Frame designId="frame-test" className="absolute left-0 top-0 w-[400px] h-[400px]"><Rect designId="rect-aa" className="absolute left-0 top-0 w-[50px] h-[50px] bg-red-500"/>{/* keep comment */}<Rect designId="rect-bb" className="absolute left-[30px] top-[50px] w-[50px] h-[50px] bg-blue-500 hover:skew-x-3"/><Rect designId="rect-cc" className="absolute left-[200px] top-[100px] w-[50px] h-[50px]"/><Text designId="text-test" className="absolute left-0 top-[300px] text-sm">Hello</Text></Frame><Group designId="group-test"/></Page>`;const session=new DocumentSession(doc.files),page=session.pages.get('main')!.page;return{session,page,nodes:['rect-aa','rect-bb','rect-cc'].map(id=>page.nodes.get(id)!)};}
describe('property fields and transactions',()=>{
  it('merges equal, mixed, conflicting and inapplicable fields',()=>{const {page,nodes}=fixture();expect(mergeField(nodes,fieldDescriptor('width'))).toEqual({type:'fixed',value:50});expect(mergeField(nodes,fieldDescriptor('bg'))).toBe('mixed');expect(mergeField(nodes,fieldDescriptor('text-size',n=>n.kind==='Text'))).toBeUndefined();const conflicted={...nodes[0],element:{...nodes[0].element,props:{...nodes[0].element.props,className:'w-20 w-40'}}};expect(mergeField([conflicted,nodes[1]],fieldDescriptor('width'))).toBe('conflict');expect(page.id).toBe('main');});
  it('edits Mixed in one batch, steps each value, and undoes in one step',()=>{const {session,nodes}=fixture();const descriptor=fieldDescriptor('left');const tx=fieldTransaction(nodes,descriptor,n=>(fixedValue(n.element.props.className!,'left')??0)+1);expect(tx.coalesceKey).toBe('field:left:rect-aa,rect-bb,rect-cc');const changed=session.commit(tx,100);expect(changed.pages.get('main')!.page.nodes.get('rect-bb')!.element.props.className).toContain('left-[31px]');expect(changed.past).toHaveLength(1);expect(changed.undo().files).toEqual(session.files);});
  it('coalesces repeated field edits within 500ms',()=>{const {session,nodes}=fixture();const first=session.commit(fieldTransaction(nodes,fieldDescriptor('width'),100),1000);const next=first.commit(fieldTransaction([...first.pages.get('main')!.page.nodes.values()].filter(n=>nodes.some(s=>s.id===n.id)),fieldDescriptor('width'),101),1200);expect(next.past).toHaveLength(1);expect(next.undo().files).toEqual(session.files);});
  it('keeps unknown styles and variants read-only',()=>{const {nodes}=fixture();expect(otherStyles(nodes[1])).toEqual(['hover:skew-x-3']);});
  it('shows the correct sections for frames, groups and text',()=>{const {page,nodes}=fixture();expect(sectionVisibility([page.nodes.get('frame-test')!],page)).toMatchObject({frame:true,layout:true,text:false});expect(sectionVisibility([page.nodes.get('text-test')!],page)).toEqual({frame:false,layout:false,text:true,appearance:false});expect(sectionVisibility(nodes,page).layout).toBe(false);});
  it('renders only page background when empty and hides other styles for multiselect',()=>{const {page,nodes}=fixture();const props={page,measurements:new Map(),onTransaction:()=>{},onPreview:()=>{},onCreateBoard:()=>{}};const empty=renderToStaticMarkup(<PropertyPanel {...props} nodes={[]}/>);expect(empty).toContain('页面背景');expect(empty).not.toContain('位置与尺寸');const multi=renderToStaticMarkup(<PropertyPanel {...props} nodes={nodes}/>);expect(multi).toContain('Mixed');expect(multi).not.toContain('其他样式');});
});
describe('alignment and auto layout',()=>{
  it('left-aligns and centers without changing dimensions and undoes atomically',()=>{const {session,page,nodes}=fixture();const next=session.commit(alignmentTransaction(nodes,page,'left'));for(const node of nodes)expect(fixedValue(next.pages.get('main')!.page.nodes.get(node.id)!.element.props.className!,'left')).toBe(0);expect(next.undo().files).toEqual(session.files);const centered=session.commit(alignmentTransaction([nodes[0]],page,'center-x'));expect(fixedValue(centered.pages.get('main')!.page.nodes.get(nodes[0].id)!.element.props.className!,'left')).toBe(175);});
  it('distributes using equal edge-to-edge gaps with fixed endpoints',()=>{const {session,page,nodes}=fixture();const next=session.commit(alignmentTransaction(nodes,page,'distribute-x'));expect(fixedValue(next.pages.get('main')!.page.nodes.get('rect-bb')!.element.props.className!,'left')).toBe(100);expect(next.past).toHaveLength(1);});
  it('disables flow and unparented alignment and skips locked nodes',()=>{const {page,nodes}=fixture();expect(alignmentReason([page.nodes.get('frame-test')!],page)).toContain('父容器');expect(alignmentReason([{...nodes[0],position:'flow'}],page)).toContain('布局');expect(alignmentReason(nodes.slice(0,2),page,true)).toContain('三个');const tx=alignmentTransaction([nodes[0],{...nodes[1],locked:true},nodes[2]],page,'left');expect(tx.ops.some(op=>'id' in op&&op.id==='rect-bb')).toBe(false);});
  it('sorts source children and removes positioning when enabling flex',()=>{const {session,page}=fixture();const frame=page.nodes.get('frame-test')!;const next=session.commit(layoutTransaction([frame],page,true,'col',new Map()));const updated=next.pages.get('main')!.page;expect(readProperty(updated.nodes.get(frame.id)!.element.props.className!,'display')).toBe('flex');expect(updated.nodes.get('rect-aa')!.position).toBe('flow');expect(updated.nodes.get(frame.id)!.children).toEqual(['rect-aa','rect-bb','rect-cc','text-test']);expect(next.files['pages/main.page.tsx']).toContain('keep comment');expect(next.undo().files).toEqual(session.files);});
  it('preserves measured screen positions when disabling flex',()=>{const {session,page}=fixture();const enabled=session.commit(layoutTransaction([page.nodes.get('frame-test')!],page,true,'row',new Map()));const flexPage=enabled.pages.get('main')!.page;const measurements=new Map([['frame-test',{x:10,y:20,width:400,height:400}],['rect-aa',{x:30,y:45,width:50,height:50}],['rect-bb',{x:90,y:45,width:50,height:50}],['rect-cc',{x:150,y:45,width:50,height:50}],['text-test',{x:210,y:45,width:80,height:20}]]);const next=enabled.commit(layoutTransaction([flexPage.nodes.get('frame-test')!],flexPage,false,'row',measurements));const n=next.pages.get('main')!.page.nodes.get('rect-bb')!;expect(n.position).toBe('absolute');expect(nodeRect(n,next.pages.get('main')!.page)).toMatchObject({x:80,y:25,width:50,height:50});});
});

describe('layout coordinates with transforms',()=>{
  it('uses measured layout offsets instead of a rotated visual bounding box',()=>{
    const {session,page}=fixture();const enabled=session.commit(layoutTransaction([page.nodes.get('frame-test')!],page,true,'row',new Map()));const p=enabled.pages.get('main')!.page;
    const measurements=new Map([['frame-test',{x:0,y:0,width:400,height:400}],['rect-aa',{x:15,y:20,width:50,height:50,localX:20,localY:25}]]);
    const next=enabled.commit(layoutTransaction([p.nodes.get('frame-test')!],p,false,'row',measurements));const cls=next.pages.get('main')!.page.nodes.get('rect-aa')!.element.props.className!;
    expect(fixedValue(cls,'left')).toBe(20);expect(fixedValue(cls,'top')).toBe(25);
  });
  it('aligns fixed fractional coordinates without accumulating DOM pixel rounding',()=>{
    const {session,page,nodes}=fixture();const changed=session.commit({label:'fractional',ops:[{type:'set',pageId:page.id,id:nodes[1].id,styles:{left:30.1234}}]});const p=changed.pages.get('main')!.page,node=p.nodes.get(nodes[1].id)!;
    const tx=alignmentTransaction([node],p,'left',new Map([[node.id,{x:30.125,y:50,width:50,height:50}],['frame-test',{x:0,y:0,width:400,height:400}]]));
    expect(tx.ops[0]).toMatchObject({styles:{left:0}});
  });
});

describe('composite Mixed fields',()=>{
  it('steps stroke widths independently and cancels previews without changing history',()=>{
    const {session,nodes}=fixture();const seeded=session.commit({label:'strokes',ops:nodes.slice(0,2).map((n,i)=>({type:'set' as const,pageId:'main',id:n.id,styles:strokePatch({width:i?4:2,color:{hex:i?'#123456':'#000000'},position:'inside',style:'solid'})}))});
    const p=seeded.pages.get('main')!.page,selected=nodes.slice(0,2).map(n=>p.nodes.get(n.id)!);
    const read=(n:typeof selected[number])=>readStroke(n.element.props.className!)!.width;
    const write=(n:typeof selected[number],width:number)=>strokePatch({...readStroke(n.element.props.className!)!,width});
    const tx=numericTransaction(selected,'stroke:width',read,write,{delta:1},0),changed=seeded.commit(tx);
    expect(selected.map(n=>read(changed.pages.get('main')!.page.nodes.get(n.id)!))).toEqual([3,5]);expect(changed.undo().files).toEqual(seeded.files);
    const preview=seeded.commit(numericTransaction(selected,'stroke:width',read,write,{delta:30},0));expect(selected.map(n=>read(preview.pages.get('main')!.page.nodes.get(n.id)!))).toEqual([32,34]);expect(seeded.past).toHaveLength(1);
  });
  it('steps each shadow offset while retaining the other shadow and color',()=>{
    const {session,nodes}=fixture();const seeded=session.commit({label:'shadows',ops:nodes.slice(0,2).map((n,i)=>({type:'set' as const,pageId:'main',id:n.id,styles:{shadow:formatShadows([{inset:false,x:i?20:4,y:4,blur:12,spread:0,color:'#123456'},{inset:true,x:0,y:2,blur:3,spread:0,color:'#000000'}])}}))});const p=seeded.pages.get('main')!.page,selected=nodes.slice(0,2).map(n=>p.nodes.get(n.id)!);
    const read=(n:typeof selected[number])=>parseShadows(readProperty(n.element.props.className!,'shadow') as string)!;
    const tx=numericTransaction(selected,'shadow:x',n=>read(n)[0].x,(n,x)=>({shadow:formatShadows(read(n).map(s=>s.inset?s:{...s,x}))}),{delta:10});
    const changed=seeded.commit(tx);expect(selected.map(n=>read(changed.pages.get('main')!.page.nodes.get(n.id)!)[0].x)).toEqual([14,30]);expect(read(changed.pages.get('main')!.page.nodes.get(nodes[0].id)!)[1]).toMatchObject({inset:true,x:0,color:'#000000'});
  });
  it('presents Mixed/conflict text as an empty draft without a committable sentinel',()=>{
    expect(textFieldPresentation('mixed','system-ui')).toEqual({value:'',placeholder:'Mixed'});expect(textFieldPresentation('conflict','1.5')).toEqual({value:'',placeholder:'冲突'});
    const {page}=fixture(),texts=[page.nodes.get('text-test')!,{...page.nodes.get('text-test')!,id:'text-second',element:{...page.nodes.get('text-test')!.element,props:{...page.nodes.get('text-test')!.element.props,className:"font-['Inter'] leading-[2]"}}}];
    const html=renderToStaticMarkup(<PropertyPanel nodes={texts} page={page} measurements={new Map()} onTransaction={()=>{throw new Error('Rendering must not commit');}} onPreview={()=>{}} onCreateBoard={()=>{}}/>);
    expect(html).toContain('aria-label="字体"');expect(html).toContain('placeholder="Mixed"');expect(html).not.toContain('value="mixed"');
  });
});

describe('shared child-order transaction',()=>{
  it('retains complete child source and comments, validates membership and undoes atomically',()=>{
    const {session,page}=fixture(),frame=page.nodes.get('frame-test')!,ids=[...frame.children].reverse();
    const changed=session.commit({label:'排序',ops:[{type:'reorderChildren',pageId:page.id,id:frame.id,ids}]});
    expect(changed.pages.get(page.id)!.page.nodes.get(frame.id)!.children).toEqual(ids);expect(changed.files['pages/main.page.tsx']).toContain('keep comment');expect(changed.undo().files).toEqual(session.files);
    expect(()=>session.commit({label:'invalid',ops:[{type:'reorderChildren',pageId:page.id,id:frame.id,ids:ids.slice(1)}]})).toThrow('完整');
  });
});
