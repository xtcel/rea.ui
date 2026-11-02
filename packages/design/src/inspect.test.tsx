import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { Ellipse, Frame, Group, Image, Page, Rect, Text, Vector, inspectPage } from './index';
import type { PageProps } from './index';
const page = (children?: unknown) => createElement(Page, { id: 'home', designId: 'page-home' }, children as never);
const valid = () => <Page id="home" designId="page-home"><Frame designId="frame-main" className="absolute"><Group designId="group-main"><Rect designId="rect-main" /><Ellipse designId="ellipse-main" /><Text designId="text-main">hello</Text><Image designId="image-main" src="assets/photo.png" /><Vector designId="vector-main" d="M0 0" viewBox="0 0 10 10" /></Group></Frame></Page>;
describe('v2 page index', () => {
  it('indexes all eight primitives and permits floating layers and empty pages', () => {
    const result = inspectPage(valid());
    expect([...result.nodes.values()].map(n => n.kind)).toEqual(['Page', 'Frame', 'Group', 'Rect', 'Ellipse', 'Text', 'Image', 'Vector']);
    expect(inspectPage(page(<Rect designId="floating-rect" />)).nodes.size).toBe(2);
    expect(inspectPage(page()).nodes.size).toBe(1);
  });
  it('permits containers and strings in Text, rejects text in other containers and nested Page', () => {
    expect(inspectPage(page(<Group designId="group-main"><Frame designId="frame-nested"><Text designId="text-main">text</Text></Frame></Group>))).toBeTruthy();
    expect(() => inspectPage(page('text'))).toThrow('Text');
    expect(() => inspectPage(page(<Page id="nested" designId="page-nested" />))).toThrow('嵌套');
    expect(() => inspectPage(page(createElement(Text, { designId: 'text-main' }, <Rect designId="rect-main" /> as never)))).toThrow('字符串');
    expect(() => inspectPage(page(createElement(Text, { designId: 'text-main' }, 3 as never)))).toThrow();
  });
  it.each([Rect, Ellipse, Image, Vector])('rejects children in leaf %s', component => {
    const props = { designId: 'leaf-main', src: 'assets/a.png', d: 'M0 0', viewBox: '0 0 10 10' };
    const specific = component === Image ? { src: props.src } : component === Vector ? { d: props.d, viewBox: props.viewBox } : {};
    const node = createElement(component as typeof Rect, { designId: props.designId, ...specific, children: 'text' } as never);
    expect(() => inspectPage(page(node))).toThrow('不能包含子节点');
  });
  it('requires absolute top-level frames; nested frames can use flow layout', () => {
    expect(() => inspectPage(page(<Frame designId="frame-main" />))).toThrow('absolute');
    expect(inspectPage(page(<Frame designId="frame-main" className="absolute flex"><Frame designId="frame-child" /></Frame>)).nodes.get('frame-child')?.position).toBe('flow');
  });
  it.each(['', 'a', 'Bad-ID', '12', 'x'.repeat(65)])('rejects invalid identity %s', id => {
    expect(() => inspectPage(page(<Rect designId={id} />))).toThrow('designId');
  });
  it('rejects missing or duplicate identities; identities can repeat across pages', () => {
    expect(() => inspectPage(page(createElement(Rect, {} as never)))).toThrow('designId');
    expect(() => inspectPage(page([<Rect key="a" designId="same-id" />, <Rect key="b" designId="same-id" />]))).toThrow('重复');
    expect(inspectPage(valid()).nodes.get('rect-main')).toBeTruthy();
    expect(inspectPage(valid()).nodes.get('rect-main')).toBeTruthy();
  });
  it('inherits hidden and locked flags', () => {
    const result = inspectPage(page(<Group designId="group-main" hidden locked><Rect designId="rect-main" /></Group>));
    expect(result.nodes.get('rect-main')).toMatchObject({ hidden: true, locked: true });
  });
  it.each(['https://a.com/a.png', '/assets/a.png', 'assets/../a.png', 'assets/a%2fb.png', 'assets/a\\b.png', 'assets//a.png'])('rejects unsafe image path %s', src => {
    expect(() => inspectPage(page(<Image designId="image-main" src={src} />))).toThrow('assets/');
  });
  it('rejects removed props and invalid root', () => {
    expect(() => inspectPage(page(createElement(Rect, { designId: 'rect-main', style: {} } as never)))).toThrow('className');
    expect(() => inspectPage(<Rect designId="rect-main" /> as ReactElement<PageProps>)).toThrow('Page');
  });
});
