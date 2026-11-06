import { describe, expect, it } from 'vitest';
import { niceStep, rulerTicks, worldToScreen } from './ruler';

describe('ruler geometry', () => {
    it('maps world coordinates to screen with the inverse of screenToWorld', () => {
        expect(worldToScreen(0, 80, 1)).toBe(80);
        expect(worldToScreen(100, 80, 0.5)).toBe(130);
        expect((worldToScreen(120, 40, 2) - 40) / 2).toBe(120);
    });
    it('picks a nice step that keeps ticks at least 8 screen px apart', () => {
        expect(niceStep(1)).toBe(10);
        expect(niceStep(3)).toBe(5);
        expect(niceStep(0.5)).toBe(20);
        expect(niceStep(0.1)).toBe(100);
        for (const zoom of [0.1, 0.25, 0.5, 1, 2, 3]) expect(niceStep(zoom) * zoom).toBeGreaterThanOrEqual(8);
    });
    it('labels major ticks in design px and keeps negative coordinates', () => {
        const ticks = rulerTicks(200, 1, 600);
        expect(ticks.find(tick => tick.position === 0)).toMatchObject({ major: true, label: '0' });
        expect(ticks.find(tick => tick.position === 100)).toMatchObject({ major: true, label: '100' });
        expect(ticks.find(tick => tick.position === -100)).toMatchObject({ major: true, label: '-100' });
        expect(ticks.filter(tick => tick.major).length).toBeGreaterThanOrEqual(6);
    });
    it('follows camera panning and never emits an unbounded tick list', () => {
        const first = rulerTicks(0, 1, 200);
        const panned = rulerTicks(40, 1, 200);
        expect(first[0].position).toBe(0);
        expect(panned[0].position).toBe(-40);
        expect(first.filter(tick => tick.label !== undefined).map(tick => tick.label)).toEqual(['0', '100', '200']);
        expect(rulerTicks(0, 0.1, 400).length).toBeLessThan(2000);
    });
    it('keeps the tick grid anchored to the origin and shifts only the labels', () => {
        const ticks = rulerTicks(0, 1, 200, 50);
        expect(ticks.find(tick => tick.position === 50)).toMatchObject({ major: true, label: '0' });
        expect(ticks.find(tick => tick.position === 150)).toMatchObject({ major: true, label: '100' });
        expect(ticks.find(tick => tick.position === 100)).toMatchObject({ major: false, label: undefined });
    });
    it('labels negative origins symmetrically', () => {
        const ticks = rulerTicks(0, 1, 200, -100);
        expect(ticks.find(tick => tick.position === 0)).toMatchObject({ major: true, label: '100' });
        expect(ticks.find(tick => tick.position === 100)).toMatchObject({ major: true, label: '200' });
    });
});
