import {expect,it} from 'vitest';
import {pathData,inspectPage,Page,Line} from '@rea/design';
import {createElement} from 'react';
import {parseFragment} from '@rea/document';
import {expandVector,shapeDrag,splitPath} from './vector';
it('snaps lines and draws symmetric constrained shapes',()=>{
  const line=shapeDrag({x:10,y:10},{x:75,y:60},true,true,false);expect(line.rect.width).toBeCloseTo(line.rect.height);
  const square=shapeDrag({x:50,y:60},{x:70,y:90},false,true,true);expect(square.rect).toEqual({x:20,y:30,width:60,height:60});
});
it('splits cubic curves without changing their shape',()=>{
  const path={closed:false,anchors:[{id:'a-one',x:0,y:0,out:[0,100] as [number,number]},{id:'a-two',x:100,y:0,in:[0,100] as [number,number]}]};
  const next=splitPath(path,0);expect(next.anchors[1].x).toBe(50);expect(next.anchors[1].y).toBe(75);expect(next.anchors[0].out).toEqual([0,50]);expect(pathData(next)).toContain('C');expect(path.anchors).toHaveLength(2);
});
it('preserves horizontal arrow geometry when converting to editable paths',()=>{
  const page=inspectPage(createElement(Page,{id:'main',designId:'page-main'},createElement(Line,{designId:'line-main',className:'absolute w-[300px] h-[1px]',x1:0,y1:0,x2:100,y2:0,endArrow:true}))),op=expandVector(page.nodes.get('line-main')!);
  if(op.type!=='replace')throw new Error('replacement expected');const n=parseFragment(op.fragment).page.nodes.get('line-main')!,props=n.element.props as unknown as {viewBox:string;path:{anchors:{x:number}[]};endArrow:boolean};expect(props.viewBox).toBe('0 0 300 1');expect(props.path.anchors[1].x).toBe(300);expect(props.endArrow).toBe(true);
});

it('edits the second contour with undo/redo, pack/reopen and preserved hole styling', async () => {
  const { DocumentSession,createManifest,sourceElement }=await import('@rea/document');
  const { exportReaui,readReaui }=await import('@rea/storage');
  const { replacePathContour, vectorPath }=await import('./vector');
  const { pathContours }=await import('@rea/design');
  const files={'rea.json':JSON.stringify(createManifest('doc_hole','孔洞',[{id:'main',file:'pages/main.page.tsx'}])), 'pages/main.page.tsx':`import {Page,Frame,Vector} from '@rea/design'; export default <Page id="main" designId="page-root"><Frame designId="main-frame" className="absolute w-[400px] h-[300px]"><Vector designId="hole-icon" name="孔洞图标" bindings={{hidden:'is-hidden'}} className="absolute w-[24px] h-[24px] fill-[#ff0000] [fill-rule:evenodd]" viewBox="0 0 24 24" d="M0 0 H24 V24 H0 Z M6 6 H18 V18 H6 Z" /></Frame></Page>;`};
  const original=new DocumentSession(files),converted=original.commit({label:'转换',ops:[expandVector(inspectPage(original.pages.get('main')!.source).nodes.get('hole-icon')!)]});
  const icon=converted.pages.get('main')!.page.nodes.get('hole-icon')!,path=vectorPath(icon);
  const hole=splitPath(pathContours(path)[1],0);hole.anchors[0].x=7;
  const next=replacePathContour(path,1,hole);
  expect(next.anchors).toEqual(path.anchors);
  expect(path.contours![0].anchors[0].x).toBe(6);
  const edited=converted.commit({label:'编辑孔洞',ops:[{type:'set',pageId:'main',id:'hole-icon',props:{path:next}}]});
  expect(edited.undo().files).toEqual(converted.files);
  expect(edited.undo().redo().files).toEqual(edited.files);
  const reopened=new DocumentSession(readReaui(await exportReaui({files:{...edited.files}})).files);
  const props=inspectPage(reopened.pages.get('main')!.source).nodes.get('hole-icon')!.element.props;
  expect(props.className).toContain('[fill-rule:evenodd]');
  expect(props.bindings).toEqual({hidden:'is-hidden'});
  expect(vectorPath(reopened.pages.get('main')!.page.nodes.get('hole-icon')!)).toEqual(next);
  expect(sourceElement('Vector',{...props,path:next})).toContain('contours');
});

it('converts a component source without baking its evaluated fill binding into the definition', async () => {
  const { DocumentSession,createManifest }=await import('@rea/document');
  const files={'rea.json':JSON.stringify(createManifest('doc_bound','绑定',[{id:'main',file:'pages/main.page.tsx'}])), 'pages/main.page.tsx':`import {Page,Frame} from '@rea/design';export default <Page id="main" designId="page-root"><Frame designId="main-frame" className="absolute w-[400px] h-[300px]" /></Page>;`};
  const session=new DocumentSession(files).commit({label:'组件',ops:[{type:'catalog',source:`import {Components,Component,Vector} from '@rea/design'; export default <Components><Component id="bound-symbol" designId="bound-definition" name="绑定图标" parameters={{color:{type:'string',default:'#ff0000'}}}><Vector designId="bound-icon" name="图标路径" className="relative w-[24px] h-[24px] fill-[#0000ff]" bindings={{'style:fill':'color'}} viewBox="0 0 24 24" d="M0 0 H24 V24 H0 Z M6 6 H18 V18 H6 Z" /></Component></Components>;`}]});
  const editor=session.componentPages.get('bound-symbol')!;
  expect(editor.page.nodes.get('bound-icon')!.element.props.className?.toLowerCase()).toContain('fill-[#ff0000]');
  const source=inspectPage(editor.source).nodes.get('bound-icon')!;
  const converted=session.commit({label:'转换',ops:[expandVector(source)]});
  const next=converted.componentPages.get('bound-symbol')!;
  const raw=inspectPage(next.source).nodes.get('bound-icon')!;
  expect(raw.element.props.bindings).toEqual({'style:fill':'color'});
  expect(raw.element.props.className).toContain('fill-[#0000ff]');
  expect(next.page.nodes.get('bound-icon')!.element.props.className?.toLowerCase()).toContain('fill-[#ff0000]');
});
