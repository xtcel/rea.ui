import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Ellipse, Frame, Group, Image, Page, Rect, Text, Vector } from '@rea/design';
import { PageRenderer } from './render';
const page = <Page id="home" designId="page-home"><Frame designId="frame-main" className="absolute w-80 h-80 bg-white"><Group designId="group-main"><Rect designId="rect-main" className="w-20 bg-red-500 hover:bg-red-600 custom" /><Ellipse designId="ellipse-main" className="w-10 h-10" /><Text designId="text-main" className="text-xl">hello</Text><Image designId="image-main" src="assets/a.png" /><Vector designId="vector-main" d="M0 0" viewBox="0 0 10 10" className="fill-blue-500 stroke-black" /></Group></Frame></Page>;
describe('className rendering', () => {
  it('renders all primitives with source classes and asset blob URLs', () => {
    const html = renderToStaticMarkup(<PageRenderer page={page} assetUrls={{ 'assets/a.png': 'blob:test-image' }} />);
    expect(html).toContain('class="w-20 bg-red-500 hover:bg-red-600 custom"');
    expect(html).toContain('class="rounded-full w-10 h-10"');
    expect(html).toContain('src="blob:test-image"'); expect(html).toContain('<path d="M0 0"');
    expect(html).not.toContain('style='); expect(html).not.toContain('designId=');
  });
  it('patches preview classes while retaining source and variants', () => {    const html = renderToStaticMarkup(<PageRenderer page={page} preview={{ id: 'rect-main', styles: { width: 317 } }} />);
    expect(html).toContain('w-[317px] bg-red-500 hover:bg-red-600 custom');
    expect(renderToStaticMarkup(<PageRenderer page={page} />)).toContain('w-20');
  });
  it('uses path geometry instead of a transparent viewBox rectangle and respects inherited locks', () => {
    const vector=<Vector designId="vector-icon" d="M0 0 L4 4" viewBox="-2 -3 24 20" />;
    const html=renderToStaticMarkup(<PageRenderer page={<Page id="home" designId="page-home">{vector}</Page>}/>);
    expect(html).not.toContain('<rect');expect(html).toContain('pointer-events="stroke"');expect(html).toContain('stroke-width="8"');
    const locked=renderToStaticMarkup(<PageRenderer page={<Page id="home" designId="page-home"><Group designId="group-lock" locked>{vector}</Group></Page>}/>);
    expect(locked).not.toContain('pointer-events="stroke"');expect(locked).toContain('pointer-events="none"');
  });
  it('inherits hidden and locked, omits missing asset src', () => {
    const hidden = <Page id="home" designId="page-home"><Frame designId="frame-main" className="absolute" hidden><Rect designId="rect-main" /></Frame><Group designId="group-main" locked><Text designId="text-main">locked</Text></Group></Page>;
    const html = renderToStaticMarkup(<PageRenderer page={hidden} />);
    expect(html).not.toContain('rect-main'); expect(html.match(/data-design-locked/g)).toHaveLength(2);
    expect(renderToStaticMarkup(<PageRenderer page={page} />)).not.toContain('src="assets/');
  });
});

it('previews multiple nodes, shows Alt-drag originals and hides only the text being edited',()=>{
  const preview=new Map([['rect-main',{left:40}],['ellipse-main',{width:80}]]);
  const html=renderToStaticMarkup(<PageRenderer page={page} preview={preview} duplicatePreview editingId="text-main"/>);
  expect(html).toContain('original-rect-main');expect(html).toContain('original-ellipse-main');expect(html).toContain('left-10');expect(html).toContain('style="visibility:hidden"');
  expect(renderToStaticMarkup(<PageRenderer page={page}/>)).not.toContain('original-');
});
it('lifts the preflight max-width cap that would collapse an image to zero width',()=>{
  const render=(className:string)=>renderToStaticMarkup(<PageRenderer page={<Page id="home" designId="page-home"><Image designId="image-fit" src="assets/a.png" className={className}/></Page>}/>);
  expect(render('absolute w-[600px] h-[300px]')).toContain('class="max-w-none absolute w-[600px] h-[300px]"');
  // An explicit cap from the source stays authoritative.
  expect(render('absolute w-[600px] max-w-[320px]')).toContain('class="absolute w-[600px] max-w-[320px]"');
  expect(render('')).toContain('class="max-w-none"');
});
it('renders an uncommitted new text draft inside its container',()=>{
  const html=renderToStaticMarkup(<PageRenderer page={page} draft={{parentId:'group-main',element:<Text designId="draft-text" className="w-fit whitespace-nowrap">draft</Text>}} editingId="draft-text"/>);
  expect(html).toContain('draft-text');expect(html).toContain('draft</p>');expect(renderToStaticMarkup(<PageRenderer page={page}/>)).not.toContain('draft-text');
});
