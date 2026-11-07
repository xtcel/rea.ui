import { describe, expect, it } from 'vitest';
import { classifyRulerDrag, clickGuideAxis, isOutsideCanvas } from './rulerGesture';

describe('ruler gestures', () => {
    it('treats a press that never moves as a click', () => {
        expect(classifyRulerDrag(0, 0, 'top')).toBe('pending');
        expect(classifyRulerDrag(3, -2, 'top')).toBe('pending');
        expect(classifyRulerDrag(1, 1, 'left')).toBe('pending');
    });
    it('ignores along-the-ruler slides and hands perpendicular drags to guides', () => {
        // A slide along a ruler must never move the zero point: 0 stays at page (0,0).
        expect(classifyRulerDrag(30, 2, 'top')).toBe('ignored');
        expect(classifyRulerDrag(2, 30, 'left')).toBe('ignored');
        expect(classifyRulerDrag(2, 30, 'top')).toBe('guide');
        expect(classifyRulerDrag(30, 2, 'left')).toBe('guide');
    });
    it('keeps a long along-axis slide inert (no -9000 style offset)', () => {
        expect(classifyRulerDrag(-900, 0, 'top')).toBe('ignored');
        expect(classifyRulerDrag(0, 900, 'left')).toBe('ignored');
    });
    it('creates the guide perpendicular to the clicked ruler', () => {
        expect(clickGuideAxis('top')).toBe('x');
        expect(clickGuideAxis('left')).toBe('y');
    });
    it('deletes only when the guide leaves the canvas along its normal', () => {
        const bounds = { left: 100, right: 900, top: 50, bottom: 650 };
        expect(isOutsideCanvas('x', { clientX: 99, clientY: 300 }, bounds)).toBe(true);
        expect(isOutsideCanvas('x', { clientX: 901, clientY: 300 }, bounds)).toBe(true);
        expect(isOutsideCanvas('x', { clientX: 500, clientY: 300 }, bounds)).toBe(false);
        expect(isOutsideCanvas('y', { clientX: 500, clientY: 49 }, bounds)).toBe(true);
        expect(isOutsideCanvas('y', { clientX: 500, clientY: 651 }, bounds)).toBe(true);
        expect(isOutsideCanvas('y', { clientX: 500, clientY: 300 }, bounds)).toBe(false);
    });
    it('never deletes a vertical guide that is dragged out vertically', () => {
        const bounds = { left: 100, right: 900, top: 50, bottom: 650 };
        expect(isOutsideCanvas('x', { clientX: 500, clientY: 20 }, bounds)).toBe(false);
        expect(isOutsideCanvas('y', { clientX: 20, clientY: 300 }, bounds)).toBe(false);
    });
});
