import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parsePage } from '@rea/document';
import { PageRenderer } from '@rea/renderer-dom/render';
import { artboardBounds, artboardsOf } from '../src/preview/artboards';
import { previewHtml } from '../src/preview/html';

const SOURCE = `import { Page, Frame, Text, Ellipse } from '@rea/design';

export default (
  <Page id="main" designId="page-root" name="首页">
    <Frame designId="desktop" name="桌面" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-white">
      <Text designId="page-title" name="标题" className="absolute left-[64px] top-[64px] w-[600px] h-[40px] text-[28px] text-[#30343b]">首页</Text>
      <Text designId="ghost" name="隐藏" hidden className="absolute left-0 top-0">不该出现</Text>
      <Ellipse designId="dot" name="圆点" className="absolute left-[40px] top-[140px] w-[20px] h-[20px] bg-blue-500" />
    </Frame>
    <Frame designId="mobile" name="移动" className="absolute left-[1500px] top-0 w-[390px] h-[844px] bg-white" />
  </Page>
);
`;

const page = parsePage(SOURCE).page.source;

describe('画板计算', () => {
  it('按顶层 Frame 读取固定尺寸', () => {
    const boards = artboardsOf(page);
    expect(boards).toHaveLength(2);
    expect(boards[0]).toMatchObject({ designId: 'desktop', width: 1440, height: 1024, fallback: false });
    expect(boards[1]).toMatchObject({ designId: 'mobile', width: 390, height: 844 });
    expect(artboardBounds(boards)).toEqual({ left: 0, top: 0, width: 1890, height: 1024 });
  });

  it('非固定尺寸回退并标注', () => {
    const fallbackPage = parsePage(`import { Page, Frame } from '@rea/design';
export default <Page id="main" designId="page-root" name="首页"><Frame designId="fluid" name="铺满" className="absolute left-0 top-0 w-full h-[600px] bg-white" /></Page>;`).page.source;
    const [board] = artboardsOf(fallbackPage);
    expect(board.width).toBe(1440);
    expect(board.height).toBe(600);
    expect(board.fallback).toBe(true);
  });
});

describe('静态渲染', () => {
  it('复用画布渲染语义', () => {
    const markup = renderToStaticMarkup(createElement(PageRenderer, { page, interactive: false }));
    expect(markup).toContain('data-design-id="page-title"');
    expect(markup).toContain('>首页<');
    expect(markup).not.toContain('不该出现');
    expect(markup).toContain('rounded-full');
  });
});

describe('预览文档', () => {
  it('内联样式、标注画板并转义文档名', () => {
    const boards = artboardsOf(page).map((board, index) => ({
      board,
      html: index === 0 ? renderToStaticMarkup(createElement(PageRenderer, { page, interactive: false })) : '',
    }));
    const html = previewHtml('测试<script>', [{ id: 'main', name: '首页', boards }], 'body{margin:0}', '2026-11-06T00:00:00.000Z');
    expect(html).toContain('<style>body{margin:0}</style>');
    expect(html).toContain('width:1440px;height:1024px');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<link');
    expect(html).not.toContain('@import');
  });

  it('单页失败不影响其他页', () => {
    const board = artboardsOf(page)[0];
    const html = previewHtml('应用', [
      { id: 'main', name: '首页', boards: [{ board, error: '不支持的节点：Instance' }] },
      { id: 'settings', name: '设置', boards: [{ board: artboardsOf(page)[1], html: '<div>ok</div>' }] },
    ], '', 'now');
    expect(html).toContain('该画板无法渲染');
    expect(html).toContain('<div>ok</div>');
  });
});
