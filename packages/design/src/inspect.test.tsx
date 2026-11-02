import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { DesignDocument, Frame, Page, Text, Vector, inspectDocument } from './index';

const viewports = [{ id: 'desktop', width: 800, height: 600 }];
function documentWith(children: ReactNode) {
  return <DesignDocument version={1} name="测试"><Page designId="page-main" id="main" viewports={viewports}>{children}</Page></DesignDocument>;
}

describe('trusted TSX inspection', () => {
  it('indexes original elements without creating an editable copy', () => {
    const title = <Text designId="title-main">你好</Text>;
    const source = documentWith(<Frame designId="frame-main">{title}</Frame>);
    const result = inspectDocument(source);
    expect(result.source).toBe(source);
    expect(result.nodes.get('title-main')?.element).toBe(title);
    expect(result.nodes.get('title-main')?.parentId).toBe('frame-main');
    expect(result.nodes.get('title-main')?.pageId).toBe('main');
  });

  it('rejects duplicate identities, including identities from different levels', () => {
    expect(() => inspectDocument(documentWith(<Frame designId="same-id"><Text designId="same-id">重复</Text></Frame>))).toThrow('重复 designId');
  });

  it('propagates hidden and locked state to descendants', () => {
    const result = inspectDocument(documentWith(<Frame designId="parent-node" locked hidden><Text designId="child-node">文字</Text></Frame>));
    expect(result.nodes.get('child-node')).toMatchObject({ hidden: true, locked: true });
  });

  it('rejects unsupported source nodes and invalid parent-child relationships', () => {
    expect(() => inspectDocument(documentWith(<Frame designId="main-frame"><div /></Frame>))).toThrow('只支持');
    expect(() => inspectDocument(documentWith(<Text designId="loose-text">文字</Text>))).toThrow('子节点类型');
  });

  it('rejects invalid viewports before the renderer can measure them', () => {
    const source = <DesignDocument version={1} name="错误"><Page designId="page-main" id="main" viewports={[{ id: 'bad', width: 0, height: 600 }]}><Frame designId="main-frame" /></Page></DesignDocument>;
    expect(() => inspectDocument(source)).toThrow('尺寸不合法');
  });

  it('retains vector geometry on the source element', () => {
    const result = inspectDocument(documentWith(<Frame designId="main-frame"><Vector designId="line-path" d="M0 0L20 20" width={20} height={20} viewBox="0 0 20 20" /></Frame>));
    expect(result.nodes.get('line-path')?.kind).toBe('Vector');
    expect(result.nodes.size).toBe(3);
  });
});
