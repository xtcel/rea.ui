import { describe, expect, it } from 'vitest';
import { createManifest, parsePage } from '@rea/document';
import { elementContext } from './elementContext';
import { changesBetween, changesToRefs, classifyChanges } from './scope';
import type { AgentRef } from './sessions';

const source = (title: string, card = 'absolute left-10 top-24 w-40 h-24', extra = '') => `import { Page, Frame, Text, Rect, Ellipse } from '@rea/design';
export default <Page id="main" designId="page-root" name="首页"><Frame designId="main-frame" name="主界面" className="absolute left-0 top-0 w-[800px] h-[600px] bg-white"><Text designId="hero-title" name="标题" className="absolute left-10 top-10 text-2xl">${title}</Text><Rect designId="card" name="卡片" className="${card}" />${extra}</Frame></Page>;`;
const files = (code: string) => ({ 'rea.json': JSON.stringify(createManifest('doc_scope', '范围', [{ id: 'main', file: 'pages/main.page.tsx' }])), 'pages/main.page.tsx': code });
const ref = (designId: string, subtree = false): AgentRef => ({ pageId: 'main', designId, kind: 'Text', name: designId, subtree });

describe('element context', () => {
  it('describes a referenced node with its path, class, text and source', () => {
    const page = parsePage(source('欢迎使用'), 'pages/main.page.tsx');
    const result = elementContext(new Map([['main', page]]), [ref('hero-title')]);
    expect(result.missing).toEqual([]);
    expect(result.text).toContain('[1] 标题 · Text · designId=hero-title · 仅自身');
    expect(result.text).toContain('父级路径：首页(Page) / 主界面(Frame)');
    expect(result.text).toContain('className: absolute left-10 top-10 text-2xl');
    expect(result.text).toContain('文本：「欢迎使用」');
    expect(result.text).toContain('designId="hero-title"');
  });
  it('marks subtree references, reports missing nodes and truncates long context', () => {
    const page = parsePage(source('欢迎使用'), 'pages/main.page.tsx');
    const pages = new Map([['main', page]]);
    expect(elementContext(pages, [ref('main-frame', true)]).text).toContain('含子级');
    expect(elementContext(pages, [ref('gone')]).missing).toEqual([ref('gone')]);
    const long = elementContext(pages, [ref('main-frame', true)], 80).text;
    expect(long.length).toBeLessThan(200);
    expect(long).toContain('已截断');
  });
});

describe('scope diff', () => {
  it('detects a text change and keeps it inside the referenced node', () => {
    const changes = changesBetween(files(source('欢迎使用')), files(source('欢迎回来')));
    expect(changes.map(change => change.designId)).toEqual(['hero-title']);
    expect(changes[0].action).toBe('modified');
    const { inside, outside } = classifyChanges(changes, [ref('hero-title')]);
    expect(inside).toHaveLength(1);
    expect(outside).toHaveLength(0);
  });
  it('flags changes outside a self-only reference', () => {
    const changes = changesBetween(files(source('欢迎使用')), files(source('欢迎使用', 'absolute left-10 top-24 w-40 h-32', '<Ellipse designId="badge" name="徽标" className="absolute left-60 top-10 w-4 h-4" />')));
    expect(changes.map(change => change.designId).sort()).toEqual(['badge', 'card']);
    const { inside, outside } = classifyChanges(changes, [ref('hero-title')]);
    expect(inside).toHaveLength(0);
    expect(outside.map(change => change.designId).sort()).toEqual(['badge', 'card']);
  });
  it('accepts descendants only when the reference includes the subtree', () => {
    const changes = changesBetween(files(source('欢迎使用')), files(source('欢迎回来')));
    expect(classifyChanges(changes, [ref('main-frame', true)]).inside).toHaveLength(1);
    expect(classifyChanges(changes, [ref('main-frame', false)]).outside).toHaveLength(1);
    expect(changesToRefs(changes)[0]).toMatchObject({ designId: 'hero-title', pageId: 'main', subtree: false });
  });
  it('returns nothing when either snapshot is invalid', () => {
    expect(changesBetween(files('<oops />'), files(source('a')))).toEqual([]);
  });
  it('treats every change as in scope when nothing is referenced', () => {
    const changes = changesBetween(files(source('欢迎使用')), files(source('欢迎回来')));
    const { inside, outside } = classifyChanges(changes, []);
    expect(inside.map(change => change.designId)).toEqual(['hero-title']);
    expect(outside).toHaveLength(0);
  });
});
