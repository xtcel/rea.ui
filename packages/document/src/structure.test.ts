import { describe, expect, it } from 'vitest';
import { DocumentSession, createManifest, canonicalFragment, cloneFragment, parseFragment } from './index';
import { fixedValue } from '@rea/tailwind';
const source = `import { Page, Frame, Rect, Group, Text as Label } from '@rea/design';
export default <Page id="main" designId="page-main"><Frame designId="frame-one" className="absolute left-20 top-10 w-80 h-80"><Rect designId="rect-one" name="矩形" className="absolute left-4 top-8 w-20 h-10"/><Rect designId="rect-two" className="absolute left-32 top-24 w-10 h-20"/><Label designId="text-one">{"designId=rect-one"}</Label></Frame><Frame designId="frame-two" className="absolute left-96 top-0 w-80 h-80"/></Page>`;
const make = () => new DocumentSession({ 'rea.json': JSON.stringify(createManifest('doc_test', 'test', [{ id:'main', file:'pages/main.page.tsx' }])), 'pages/main.page.tsx':source });
const px = (s:DocumentSession,id:string,key:'left'|'top') => fixedValue(s.pages.get('main')!.page.nodes.get(id)!.element.props.className ?? '',key);
describe('source structure transactions', () => {
  it('moves with coordinate patches and restores exact source in one undo', () => {
    const s=make(), moved=s.commit({label:'move',ops:[{type:'move',pageId:'main',id:'rect-one',parentId:'frame-two',index:0,patch:{left:-288,top:72}}]});
    expect(moved.pages.get('main')!.page.nodes.get('rect-one')!.parentId).toBe('frame-two');expect(px(moved,'rect-one','left')).toBe(-288);
    expect(moved.undo().files).toEqual(s.files);expect(moved.undo().redo().files).toEqual(moved.files);
    expect(()=>s.commit({label:'cycle',ops:[{type:'move',pageId:'main',id:'frame-one',parentId:'rect-one',index:0}]})).toThrow();
  });
  it('wraps continuous siblings and unwraps without changing their absolute positions', () => {
    const s=make(), grouped=s.commit({label:'group',ops:[{type:'wrap',pageId:'main',ids:['rect-two','rect-one'],kind:'Group',designId:'group-one'}]});
    expect(px(grouped,'group-one','left')).toBe(16);expect(px(grouped,'rect-one','left')).toBe(0);expect(px(grouped,'rect-two','left')).toBe(112);
    const ungrouped=grouped.commit({label:'ungroup',ops:[{type:'unwrap',pageId:'main',id:'group-one'}]});
    expect(px(ungrouped,'rect-one','left')).toBe(16);expect(px(ungrouped,'rect-two','top')).toBe(96);expect(ungrouped.pages.get('main')!.page.nodes.get('frame-one')!.children).toEqual(['rect-one','rect-two','text-one']);
    expect(grouped.past).toHaveLength(1);expect(grouped.undo().files).toEqual(s.files);
    expect(()=>s.commit({label:'bad',ops:[{type:'wrap',pageId:'main',ids:['rect-one','text-one'],kind:'Group',designId:'group-one'}]})).toThrow('连续');
    expect(()=>s.commit({label:'bad',ops:[{type:'wrap',pageId:'main',ids:['rect-one','frame-two'],kind:'Frame',designId:'frame-new'}]})).toThrow();
  });
  it('duplicates nested ids, preserves import aliases and text, uses unique copy names', () => {
    const s=make(), copied=s.commit({label:'copy',ops:[{type:'duplicate',pageId:'main',ids:['frame-one']}]});
    const p=copied.pages.get('main')!, root=p.page.nodes.get('page-main')!, id=root.children[1];
    expect(p.page.nodes.get(id)!.name).toBe('frame-one 副本');expect(p.page.nodes.get(id)!.children.every(c=>!s.pages.get('main')!.page.nodes.has(c))).toBe(true);
    expect(p.code).toContain('Text as Label');expect(p.code).toContain('designId=rect-one');expect(px(copied,id,'left')).toBe(440);
    const twice=copied.commit({label:'copy',ops:[{type:'duplicate',pageId:'main',ids:['frame-one']}]});expect([...twice.pages.get('main')!.page.nodes.values()].some(n=>n.name==='frame-one 副本 2')).toBe(true);
  });
  it('rejects a failed batch atomically and locked descendants', () => {
    const s=make();expect(()=>s.commit({label:'bad',ops:[{type:'set',pageId:'main',id:'rect-one',styles:{left:500}},{type:'move',pageId:'main',id:'frame-one',parentId:'frame-one',index:0}]})).toThrow();expect(s.past).toHaveLength(0);expect(s.files['pages/main.page.tsx']).toBe(source);
    const locked=s.commit({label:'lock',ops:[{type:'set',pageId:'main',id:'rect-one',props:{locked:true}}]});expect(()=>locked.commit({label:'move',ops:[{type:'move',pageId:'main',id:'frame-one',parentId:null,index:0}]})).toThrow('锁定');
  });
  it('canonicalizes clipboard aliases, regenerates every id and rejects unsafe fragments', () => {
    const p=make().pages.get('main')!, fragment=canonicalFragment(p,['frame-one']);expect(fragment).toContain('<Text');const cloned=cloneFragment(fragment), copy=parseFragment(cloned.fragment);
    expect(cloned.ids).toHaveLength(1);expect([...copy.page.nodes.keys()].filter(id=>id!=='clipboard-root').every(id=>!p.page.nodes.has(id))).toBe(true);
    expect(()=>parseFragment('<Rect designId="bad-one" style="x"/>')).toThrow();expect(()=>parseFragment('<Rect designId="bad-one" className="bg-[url(https://evil.test/x)]"/>')).toThrow();expect(()=>parseFragment('<Rect designId="bad-one" onClick={run()}/>')).toThrow();
  });
});
it('does not create history when submitted text is unchanged',()=>{
  const s=make();expect(s.commit({label:'text',ops:[{type:'text',pageId:'main',id:'text-one',text:'designId=rect-one'}]})).toBe(s);
});
it('unwraps a rotated container while preserving its children centers and rotation',()=>{
  const s=make().commit({label:'rotate',ops:[{type:'set',pageId:'main',id:'frame-one',styles:{rotate:90}}]});
  const next=s.commit({label:'unwrap',ops:[{type:'unwrap',pageId:'main',id:'frame-one'}]});
  expect(px(next,'rect-one','left')).toBeCloseTo(308);expect(px(next,'rect-one','top')).toBeCloseTo(76);expect(fixedValue(next.pages.get('main')!.page.nodes.get('rect-one')!.element.props.className!,'rotate')).toBe(90);
});
