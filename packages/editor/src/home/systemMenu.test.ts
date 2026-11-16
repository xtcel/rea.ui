import { describe, expect, it } from 'vitest';
import { DEFAULT_TOKENS, serializeSystem, tokenUsage } from '@rea/design-system';
import { DocumentSession } from '@rea/document';
import { createDefaultV2Document, unpinTransaction } from '@rea/storage';
import { systemSnapshot } from '../agent/designSystem';
import type { DesignSystem } from '../agent/designSystem';
import { builtInSystems } from './data';
import { buildSystemMenuModel } from './systemMenu';

function customSystem(over: Partial<DesignSystem> = {}): DesignSystem {
  return {
    id: 'brand-custom',
    name: '品牌系统',
    description: '自定义品牌规范',
    color: '#0EA5E9',
    colors: ['#0EA5E9', '#FFFFFF', '#0F172A', '#64748B', '#E2E8F0'],
    tokens: {
      ...structuredClone(DEFAULT_TOKENS),
      color: { ...DEFAULT_TOKENS.color, primary: '#0EA5E9' },
    },
    published: true,
    ...over,
  };
}

describe('buildSystemMenuModel', () => {
  it('offers existing systems and AI creation when the document has no design system', () => {
    const custom = customSystem();
    const broken = customSystem({
      id: 'broken-draft',
      name: '未完成草稿',
      color: '',
      colors: [],
      tokens: {
        ...structuredClone(DEFAULT_TOKENS),
        color: { ...DEFAULT_TOKENS.color, primary: '' },
      },
    });
    const menu = buildSystemMenuModel({
      systems: [...builtInSystems, custom, broken],
      pinned: false,
      canBrowse: true,
      canClear: false,
    });

    expect(menu.editAction).toBeUndefined();
    expect(menu.clearAction).toBeUndefined();
    expect(menu.listLabel).toBe('选择已有设计系统');
    expect(menu.createAction).toEqual({ label: '使用 AI 会话创建设计系统…' });
    expect(menu.browseAction).toEqual({ label: '从更多版本中选择…' });

    const rea = menu.choices.find(item => item.id === 'rea')!;
    expect(rea).toMatchObject({ name: 'REA UI', badge: 'v1', active: false, disabled: false, color: '#356AF0' });

    const draftChoice = menu.choices.find(item => item.id === 'brand-custom')!;
    expect(draftChoice).toMatchObject({ name: '品牌系统', badge: '草稿', active: false, disabled: false, color: '#0EA5E9' });

    const brokenChoice = menu.choices.find(item => item.id === 'broken-draft')!;
    expect(brokenChoice).toMatchObject({ name: '未完成草稿', badge: '待修正', active: false, disabled: true });
    expect(brokenChoice.hint).toContain('令牌不完整');
  });

  it('offers AI editing, switching with hash matching, and clear action when pinned', () => {
    const reaHash = systemSnapshot(builtInSystems[0]).pkg.hash;
    const editedSameId = {
      ...builtInSystems[0],
      tokens: {
        ...structuredClone(DEFAULT_TOKENS),
        color: { ...DEFAULT_TOKENS.color, primary: '#111111' },
      },
      revision: undefined,
      hash: undefined,
    };

    const exactMenu = buildSystemMenuModel({
      systems: builtInSystems,
      pinned: true,
      selectedSystem: 'rea',
      selectedSystemHash: reaHash,
      canBrowse: true,
      canClear: true,
      tokenReferenceCount: 0,
    });

    expect(exactMenu.editAction).toEqual({ label: '编辑 / 用 AI 调整当前设计系统…' });
    expect(exactMenu.createAction).toBeUndefined();
    expect(exactMenu.listLabel).toBe('切换已有设计系统');
    expect(exactMenu.choices.find(item => item.id === 'rea')).toMatchObject({ active: true, badge: '当前' });
    expect(exactMenu.choices.find(item => item.id === 'minimal')).toMatchObject({ active: false, badge: 'v1' });
    expect(exactMenu.clearAction).toEqual({ label: '取消固定设计系统', disabled: false, hint: undefined });

    const staleMenu = buildSystemMenuModel({
      systems: [editedSameId, builtInSystems[1]],
      pinned: true,
      selectedSystem: 'rea',
      selectedSystemHash: reaHash,
      canBrowse: false,
      canClear: true,
      tokenReferenceCount: 2,
    });

    expect(staleMenu.browseAction).toBeUndefined();
    expect(staleMenu.choices[0]).toMatchObject({ id: 'rea', active: false, badge: '草稿' });
    expect(staleMenu.clearAction).toEqual({ label: '取消固定设计系统', disabled: true, hint: '正被 2 处引用' });
  });

  it('handles empty system lists gracefully', () => {
    const menu = buildSystemMenuModel({ systems: [], pinned: false, canBrowse: false });
    expect(menu.choices).toEqual([]);
    expect(menu.createAction).toEqual({ label: '使用 AI 会话创建设计系统…' });
    expect(menu.browseAction).toBeUndefined();
  });
});

describe('document system adoption and unpinning', () => {
  it('pins an existing system onto an unpinned document, supports undo, and guards unpinning when tokens are referenced', () => {
    const base = new DocumentSession(createDefaultV2Document().files);
    expect(base.system).toBeNull();

    const pkg = systemSnapshot(builtInSystems[0]).pkg;
    const pinned = base.commit({ label: '采用项目设计系统', ops: [{ type: 'system', source: serializeSystem(pkg) }] });
    expect(pinned.system?.id).toBe('rea');
    expect(pinned.manifest.version).toBe(4);
    expect(pinned.undo().system).toBeNull();

    const unpinned = pinned.commit(unpinTransaction());
    expect(unpinned.system).toBeNull();

    const withToken = pinned.commit({
      label: '使用令牌',
      ops: [{ type: 'set', pageId: 'main', id: 'card-rect', props: { className: 'absolute left-16 top-44 w-72 h-48 bg-[var(--rea-ds-color-primary)] rounded-xl' } }],
    });
    const usage = tokenUsage(withToken.files);
    expect(usage.count).toBeGreaterThan(0);
    expect(() => withToken.commit(unpinTransaction())).toThrow(/设计令牌引用/);
  });
});
