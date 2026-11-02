import { describe, expect, it } from 'vitest';
import { applyOperation, commitSource, parseDocument, redoSource, undoSource } from './index';
import type { HistoryState } from './index';

const source = `import { DesignDocument, Page, Frame, Text } from '@rea/design';
// Keep this comment, spacing and quotes.
export default (<DesignDocument version={1} name="Test">
  <Page designId="page-main" id="main" viewports={[{id:'desktop',width:800,height:600}]}>
    <Frame designId="root-main" layout="free">
      <Text designId="text-main" position="absolute" x={10} y={20}>Hello</Text>
    </Frame>
  </Page>
</DesignDocument>);`;

describe('TSX source transactions', () => {
  it('changes only the requested source attribute, preserving identity and trivia', () => {
    const result = applyOperation(source, { type: 'set', id: 'text-main', props: { x: 30 } });
    expect(result.code).toBe(source.replace('x={10}', 'x={30}'));
    expect(result.document.nodes.get('text-main')?.element.props.x).toBe(30);
  });
  it('rejects invalid candidates atomically', () => {
    const original = parseDocument(source);
    expect(() => applyOperation(source, { type: 'insert', parentId: 'root-main', fragment: '<Text designId="text-main">Duplicate</Text>' })).toThrow('重复');
    expect(original.code).toBe(source);
    expect(() => applyOperation(source, { type: 'delete', id: 'page-main' })).toThrow('至少一个');
  });
  it('inserts into a self-closing frame and preserves existing attributes', () => {
    const compact = source.replace(/<Frame designId="root-main"[\s\S]*?<\/Frame>/, '<Frame designId="root-main" layout="free" />');
    const result = applyOperation(compact, { type: 'insert', parentId: 'root-main', fragment: '<Text designId="new-text">New</Text>' });
    expect(result.document.nodes.has('new-text')).toBe(true);
    expect(result.document.nodes.get('root-main')?.element.props).toMatchObject({ designId: 'root-main' });
  });
  it('undoes and redoes exact source, clearing redo on a new branch', () => {
    const state: HistoryState = { current: parseDocument(source), past: [], future: [] };
    const edited = commitSource(state, applyOperation(source, { type: 'text', id: 'text-main', text: '中文 "引号"\n换行' }));
    const undone = undoSource(edited);
    expect(undone.current.code).toBe(source);
    expect(redoSource(undone).current.code).toBe(edited.current.code);
    expect(commitSource(undone, applyOperation(source, { type: 'set', id: 'text-main', props: { y: 40 } })).future).toEqual([]);
  });
  it('refuses code execution, spread and event handlers', () => {
    expect(() => parseDocument(source.replace('x={10}', 'x={alert(1)}'))).toThrow('非声明式');
    expect(() => parseDocument(source.replace('x={10}', '{...window}'))).toThrow('属性展开');
    expect(() => parseDocument(source.replace('x={10}', 'onClick="bad"'))).toThrow('不允许');
    expect(() => parseDocument(source.replace('export default', 'console.log(1); export default'))).toThrow('仅允许');
  });
  it('preserves imported aliases and refuses mutation of locked nodes', () => {
    expect(parseDocument(source.replace('Frame, Text', 'Frame as Box, Text').replaceAll('<Frame ', '<Box ').replaceAll('</Frame>', '</Box>')).document.nodes.size).toBe(3);
    expect(() => applyOperation(source.replace('position="absolute"', 'locked position="absolute"'), { type: 'set', id: 'text-main', props: { x: 30 } })).toThrow('锁定');
  });
  it('preserves intentional leading and trailing spaces in JSX text', () => {
    const result = parseDocument(source.replace('>Hello</Text>', '> Hello </Text>'));
    expect(result.document.nodes.get('text-main')?.element.props.children).toBe(' Hello ');
    expect(parseDocument(source.replace('>Hello</Text>', '> </Text>')).document.nodes.get('text-main')?.element.props.children).toBe(' ');
  });
});
