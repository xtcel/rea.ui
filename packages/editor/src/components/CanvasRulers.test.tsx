import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CanvasRulers } from './CanvasRulers';

const noop = () => {};
const props = {
    camera: { x: 0, y: 0, zoom: 1 },
    size: { width: 800, height: 600 },
    visible: true,
    onRulerPointerDown: noop,
    onRulerClick: noop,
    onRulerContextMenu: noop,
};

describe('canvas ruler tick labels', () => {
    it('keeps x-axis labels horizontal and writes y-axis labels vertically', () => {
        const html = renderToStaticMarkup(<CanvasRulers {...props} />);
        const xBand = html.slice(html.indexOf('rea-ruler-x'), html.indexOf('rea-ruler-y'));
        const yBand = html.slice(html.indexOf('rea-ruler-y'));

        expect(xBand).toContain('<text x="2" y="10">0</text>');
        expect(xBand).not.toContain('rotate(-90)');

        // The left band is 20px wide: rotating around the tick keeps multi-digit
        // readings (including negatives) inside the band instead of clipping/wrapping.
        expect(yBand).toContain('transform="translate(8 0) rotate(-90)"');
        expect(yBand).toContain('text-anchor="middle"');
        expect(yBand).toContain('<text transform=');
        expect(yBand).not.toContain('<text x="2"');
    });

    it('places every y-axis label at its own tick coordinate', () => {
        const html = renderToStaticMarkup(<CanvasRulers {...props} camera={{ x: 0, y: 137, zoom: 1 }} />);
        const yBand = html.slice(html.indexOf('rea-ruler-y'));
        expect(yBand).toContain('translate(8 37) rotate(-90)');
        expect(yBand).toContain('translate(8 137) rotate(-90)');
        expect(yBand).toContain('translate(8 237) rotate(-90)');
    });

    it('keeps 0 at the page world origin and has no origin-lock affordances', () => {
        // Regression: a draggable zero point let world 0 read as -9000 on the top ruler.
        const html = renderToStaticMarkup(<CanvasRulers {...props} camera={{ x: 137, y: 0, zoom: 1 }} />);
        expect(html).toContain('<text x="139" y="10">0</text>');
        expect(html).not.toContain('-9000');
        expect(html).not.toContain('is-locked');
        expect(html).not.toContain('锁定标尺原点');
    });
});
