import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Frame, Page, Text, Vector } from '@rea/design';
import { PageRenderer } from './render';

it('renders source identity and text while excluding hidden subtrees and author-only props', () => {
  const page = <Page id="main" designId="page-main" viewports={[{ id: 'desktop', width: 800, height: 600 }]}>
    <Frame designId="main-frame" layout="flex" gap={16}>
      <Text designId="main-title" as="h1">来自源码</Text>
      <Frame designId="hidden-frame" hidden><Text designId="hidden-copy">不应显示</Text></Frame>
      <Vector designId="main-vector" d="M0 0L10 10" width={10} height={10} viewBox="0 0 10 10" />
    </Frame>
  </Page>;
  const html = renderToStaticMarkup(<PageRenderer page={page} selectedId="main-title" />);
  expect(html).toContain('data-design-id="main-title"');
  expect(html).toContain('is-selected');
  expect(html).toContain('来自源码');
  expect(html).toContain('gap:16px');
  expect(html).toContain('<svg');
  expect(html).not.toContain('不应显示');
  expect(html).not.toContain('designId=');
});
