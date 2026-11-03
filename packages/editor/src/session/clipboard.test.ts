import { expect, it } from 'vitest';
import { parseFragment } from '@rea/document';
import { fixedValue } from '@rea/tailwind';
import { preparePaste, readClipboard } from './clipboard';
it('centers cross-page fragments while preserving relative spacing and fresh ids',()=>{
  const data=readClipboard('',`<Rect designId="rect-aa" className="absolute left-10 top-20 w-20 h-10"/><Rect designId="rect-bb" className="absolute left-40 top-20 w-20 h-10"/>`);
  const copy=preparePaste(data,{x:500,y:300}),parsed=parseFragment(copy.fragment),nodes=copy.ids.map(id=>parsed.page.nodes.get(id)!);
  expect(copy.ids).toHaveLength(2);expect(copy.ids).not.toContain('rect-aa');expect(fixedValue(nodes[0].element.props.className!,'left')).toBe(400);expect(fixedValue(nodes[1].element.props.className!,'left')).toBe(520);expect(fixedValue(nodes[0].element.props.className!,'top')).toBe(280);
});
it('ignores untrusted metadata and refuses malformed, dynamic or remote clipboard content',()=>{
  expect(()=>readClipboard('{"version":2}', '')).toThrow();expect(()=>readClipboard('', '<Rect designId="rect-aa" style="x"/>')).toThrow();expect(()=>readClipboard('', '<Rect designId="rect-aa" className="bg-[url(https://bad.test)]"/>')).toThrow();
});
