import { describe, expect, it, vi } from 'vitest';
import { DocumentSession } from '@rea/document';
import { createDefaultV2Document } from '@rea/storage';
import { canvasMenu, guideMenu, layerMenu, rulerMenu } from './layerMenu';
import type { LayerMenuActions, RulerMenuActions } from './layerMenu';
import type { ContextMenuEntry } from '../ui';

const labels = (entries: readonly ContextMenuEntry[]) => entries.filter(item => item !== 'separator').map(item => (item as { label: string }).label);
const entry = (entries: readonly ContextMenuEntry[], label: string) => {
    const found = entries.find(item => item !== 'separator' && item.label === label);
    if (!found || found === 'separator') throw new Error(`缺少菜单项：${label}`);
    return found;
};
const page = () => new DocumentSession(createDefaultV2Document().files).pages.get('main')!.page;
const layerActions = new Proxy({}, { get: () => vi.fn() }) as unknown as LayerMenuActions;

describe('independent canvas, layer and guide menus', () => {
    it('keeps the legacy canvas menu unchanged when no view actions are supplied', () => {
        const entries = canvasMenu({ pasteHere: vi.fn(), selectAll: vi.fn(), fit: vi.fn(), actual: vi.fn() });
        expect(labels(entries)).toEqual(['粘贴到此处', '全选', '适应全部', '缩放到 100%']);
    });
    it('adds two independent switches and a clear command to the canvas menu', () => {
        const toggleRulers = vi.fn(), toggleGuides = vi.fn(), clearGuides = vi.fn();
        const entries = canvasMenu({
            pasteHere: vi.fn(), selectAll: vi.fn(), fit: vi.fn(), actual: vi.fn(),
            showRulers: true, showGuides: false, guideCount: 2, toggleRulers, toggleGuides, clearGuides,
        });
        expect(entry(entries, '显示标尺')).toMatchObject({ checked: true });
        expect(entry(entries, '显示参考线')).toMatchObject({ checked: false });
        expect(entry(entries, '清除当前页面参考线').disabled).toBeFalsy();
        expect(labels(entries)).toContain('适应全部');
        expect(labels(entries)).not.toContain('删除');
        (entry(entries, '显示参考线') as { action: () => void }).action();
        expect(toggleGuides).toHaveBeenCalledOnce();
    });
    it('disables clearing when the page has no guides', () => {
        const entries = canvasMenu({
            pasteHere: vi.fn(), selectAll: vi.fn(), fit: vi.fn(), actual: vi.fn(),
            guideCount: 0, toggleRulers: vi.fn(), toggleGuides: vi.fn(), clearGuides: vi.fn(),
        });
        expect(entry(entries, '清除当前页面参考线')).toMatchObject({ disabled: true, hint: '当前页面没有参考线' });
    });
    it('adds explicit add-guide commands above the two switches', () => {
        const addGuide = vi.fn();
        const entries = canvasMenu({
            pasteHere: vi.fn(), selectAll: vi.fn(), fit: vi.fn(), actual: vi.fn(),
            showRulers: false, showGuides: true, guideCount: 1,
            toggleRulers: vi.fn(), toggleGuides: vi.fn(), clearGuides: vi.fn(), addGuide,
        });
        expect(labels(entries).indexOf('添加垂直参考线')).toBeGreaterThan(labels(entries).indexOf('缩放到 100%'));
        expect(labels(entries).indexOf('添加水平参考线')).toBeGreaterThan(labels(entries).indexOf('添加垂直参考线'));
        (entry(entries, '添加垂直参考线') as { action: () => void }).action();
        (entry(entries, '添加水平参考线') as { action: () => void }).action();
        expect(addGuide.mock.calls.map(call => call[0])).toEqual(['x', 'y']);
    });
    it('omits add-guide commands when the host does not provide them', () => {
        const entries = canvasMenu({
            pasteHere: vi.fn(), selectAll: vi.fn(), fit: vi.fn(), actual: vi.fn(),
            showRulers: true, showGuides: true, guideCount: 0,
            toggleRulers: vi.fn(), toggleGuides: vi.fn(), clearGuides: vi.fn(),
        });
        expect(labels(entries)).not.toContain('添加垂直参考线');
        expect(labels(entries)).not.toContain('添加水平参考线');
    });
    it('uses a dedicated menu for guides', () => {
        const deleteGuide = vi.fn();
        const entries = guideMenu({ showGuides: true, guideCount: 3, deleteGuide, toggleGuides: vi.fn(), clearGuides: vi.fn() });
        expect(labels(entries)).toEqual(['删除此参考线', '显示参考线', '清除当前页面参考线']);
        expect(entry(entries, '删除此参考线').danger).toBe(true);
        (entry(entries, '删除此参考线') as { action: () => void }).action();
        expect(deleteGuide).toHaveBeenCalledOnce();
    });
    it('never mixes view commands into the layer menu', () => {
        const entries = layerMenu(page(), ['card-rect'], ['card-rect'], layerActions);
        expect(labels(entries)).not.toContain('显示标尺');
        expect(labels(entries)).not.toContain('显示参考线');
        expect(labels(entries)).not.toContain('清除当前页面参考线');
        expect(labels(entries)).toContain('编组所选项');
    });
});

describe('ruler context menus', () => {
    const actions = (over: Partial<RulerMenuActions> = {}): RulerMenuActions => ({
        showRulers: true, showGuides: true, guideCount: 3, verticalCount: 2, horizontalCount: 1,
        toggleRulers: vi.fn(), toggleGuides: vi.fn(), clearGuides: vi.fn(), ...over,
    });
    it('removes only vertical guides from the top ruler', () => {
        const clearGuides = vi.fn();
        const entries = rulerMenu('top', actions({ clearGuides }));
        expect(labels(entries)).toContain('删除所有垂直参考线');
        expect(labels(entries)).not.toContain('删除所有水平参考线');
        expect(labels(entries)).not.toContain('清除所有参考线');
        (entry(entries, '删除所有垂直参考线') as { action: () => void }).action();
        expect(clearGuides).toHaveBeenCalledWith('x');
    });
    it('removes only horizontal guides from the left ruler', () => {
        const clearGuides = vi.fn();
        const entries = rulerMenu('left', actions({ clearGuides }));
        expect(labels(entries)).toContain('删除所有水平参考线');
        expect(labels(entries)).not.toContain('删除所有垂直参考线');
        (entry(entries, '删除所有水平参考线') as { action: () => void }).action();
        expect(clearGuides).toHaveBeenCalledWith('y');
    });
    it('clears both axes from the corner block', () => {
        const clearGuides = vi.fn();
        const entries = rulerMenu('corner', actions({ clearGuides }));
        expect(labels(entries)).toContain('清除所有参考线');
        (entry(entries, '清除所有参考线') as { action: () => void }).action();
        expect(clearGuides).toHaveBeenCalledWith();
    });
    it('disables removal for an empty axis and for an empty page', () => {
        expect(entry(rulerMenu('top', actions({ verticalCount: 0 })), '删除所有垂直参考线')).toMatchObject({ disabled: true, hint: '当前页面没有参考线' });
        expect(entry(rulerMenu('corner', actions({ guideCount: 0 })), '清除所有参考线')).toMatchObject({ disabled: true });
    });
    it('exposes only the ruler switches in every zone (no draggable zero point)', () => {
        for (const zone of ['top', 'left', 'corner'] as const) {
            const entries = rulerMenu(zone, actions({ showRulers: false }));
            expect(entry(entries, '显示标尺')).toMatchObject({ checked: false, shortcut: '⌃R' });
            expect(entry(entries, '显示参考线')).toMatchObject({ checked: true });
            expect(labels(entries)).not.toContain('锁定标尺原点');
            expect(labels(entries)).not.toContain('重置标尺原点');
        }
    });
});
