import { describe, expect, it } from 'vitest';
import { classifyRulerDrag, clickGuideAxis, isOutsideCanvas, shiftOrigin } from './rulerGesture';

describe('ruler gestures', () => {
    it('treats a press that never moves as a click', () => {
        expect(classifyRulerDrag(0, 0, 'top')).toBe('pending');
        expect(classifyRulerDrag(3, -2, 'top')).toBe('pending');
        expect(classifyRulerDrag(1, 1, 'left')).toBe('pending');
    });
    it('splits along-the-ruler drags from perpendicular ones', () => {
        expect(classifyRulerDrag(30, 2, 'top')).toBe('origin');
        expect(classifyRulerDrag(2, 30, 'top')).toBe('guide');
        expect(classifyRulerDrag(2, 30, 'left')).toBe('origin');
        expect(classifyRulerDrag(30, 2, 'left')).toBe('guide');
    });
    it('moves the zero origin opposite the drag so it follows the pointer', () => {
        expect(shiftOrigin({ x: 10, y: 20 }, 'top', -50, 0, 2)).toEqual({ x: 35, y: 20 });
        expect(shiftOrigin({ x: 10, y: 20 }, 'left', 0, 40, 1)).toEqual({ x: 10, y: -20 });
        expect(shiftOrigin({ x: 0, y: 0 }, 'top', 10, 0, 0)).toEqual({ x: -10, y: 0 });
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
