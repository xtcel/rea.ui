import { describe, expect, it } from 'vitest';
import { parseGuides, serializeGuides, withPageGuides, guideSnapRects, appendGuide, MAX_GUIDES_PER_PAGE } from './guides';

const camera = { x: 0, y: 0, zoom: 1 };
const size = { width: 800, height: 600 };
const store = () => parseGuides(JSON.stringify({
    version: 1,
    pages: { main: [{ id: 'a', axis: 'x', position: 120.4 }, { id: 'b', axis: 'y', position: 64 }] },
}), ['main', 'other']);

describe('manual guide metadata', () => {
    it('reads a valid store and rounds positions to design px', () => {
        expect(store().pages.main).toEqual([
            { id: 'a', axis: 'x', position: 120 },
            { id: 'b', axis: 'y', position: 64 },
        ]);
    });
    it('drops broken entries, foreign pages and invalid files without throwing', () => {
        const broken = parseGuides(JSON.stringify({
            version: 1,
            pages: {
                main: [{ id: 'ok', axis: 'x', position: 10 }, { id: 'bad', axis: 'z', position: 1 }, { id: 'nan', axis: 'y', position: null }, null, 'x'],
                removed: [{ id: 'gone', axis: 'y', position: 5 }],
            },
        }), ['main']);
        expect(broken.pages.main).toEqual([{ id: 'ok', axis: 'x', position: 10 }]);
        expect(broken.pages.removed).toBeUndefined();
        for (const text of [undefined, 'not json', '[]', '{"version":9,"pages":{}}', 'x'.repeat(70 * 1024)]) {
            expect(parseGuides(text, ['main']).pages.main).toBeUndefined();
        }
    });
    it('serializes deterministically and returns null when there is nothing to store', () => {
        const value = serializeGuides(store(), ['main', 'other']);
        expect(value).toBeTruthy();
        expect(serializeGuides(store(), ['main', 'other'])).toBe(value);
        expect(JSON.parse(value!).pages.main.map((g: { id: string }) => g.id)).toEqual(['a', 'b']);
        expect(serializeGuides({ version: 1, pages: {} }, ['main'])).toBeNull();
        expect(serializeGuides(withPageGuides(store(), 'main', [], ['main']), ['main'])).toBeNull();
    });
    it('cleans up deleted pages when writing', () => {
        const next = withPageGuides(store(), 'other', [{ id: 'c', axis: 'x', position: 5 }], ['other']);
        expect(Object.keys(next.pages)).toEqual(['other']);
    });
    it('caps the number of guides per page', () => {
        const many = Array.from({ length: MAX_GUIDES_PER_PAGE + 20 }, (_, i) => ({ id: `g${i}`, axis: 'x' as const, position: i }));
        expect(parseGuides(JSON.stringify({ version: 1, pages: { main: many } }), ['main']).pages.main).toHaveLength(MAX_GUIDES_PER_PAGE);
        expect(serializeGuides({ version: 1, pages: { main: many } }, ['main'])!.length).toBeLessThan(64 * 1024);
    });
    it('turns only visible guides into zero-size snap candidates', () => {
        const rects = guideSnapRects([
            { id: 'a', axis: 'x', position: 100 },
            { id: 'b', axis: 'y', position: 50 },
            { id: 'far', axis: 'x', position: 5000 },
        ], camera, size);
        expect(rects).toHaveLength(2);
        expect(rects[0]).toMatchObject({ x: 100, width: 0 });
        expect(rects[0].height).toBeGreaterThan(600);
        expect(rects[1]).toMatchObject({ y: 50, height: 0 });
        expect(rects[1].width).toBeGreaterThan(800);
    });
    it('appends a rounded guide without mutating the input list', () => {
        const base = [{ id: 'a', axis: 'x' as const, position: 10 }];
        const next = appendGuide(base, 'y', 64.7, 'b');
        expect(next).toEqual([
            { id: 'a', axis: 'x', position: 10 },
            { id: 'b', axis: 'y', position: 65 },
        ]);
        expect(base).toHaveLength(1);
        expect(next![0]).toMatchObject({ position: 10 });
    });
    it('refuses to append past the page limit or with an unusable position', () => {
        const full = Array.from({ length: MAX_GUIDES_PER_PAGE }, (_, i) => ({ id: `g${i}`, axis: 'x' as const, position: i }));
        expect(appendGuide(full, 'x', 1, 'new')).toBeNull();
        expect(appendGuide([], 'x', Number.NaN, 'new')).toBeNull();
        expect(appendGuide([], 'y', Number.POSITIVE_INFINITY, 'new')).toBeNull();
        expect(appendGuide(full.slice(0, -1), 'y', -20.5, 'new')).toHaveLength(MAX_GUIDES_PER_PAGE);
    });
});
