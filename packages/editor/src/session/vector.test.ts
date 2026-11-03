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
