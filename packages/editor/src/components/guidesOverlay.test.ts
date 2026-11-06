import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The overlay is outside the Shadow DOM and tests run in node, so guard the CSS
// contract that makes the hit strips reachable in a real browser.
const css = readFileSync(new URL('../../../../apps/web/src/theme.css', import.meta.url), 'utf8');

function block(selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
    if (!match) throw new Error(`Missing CSS rule: ${selector}`);
    return match[1];
}

describe('ruler / guide overlay pointer contract', () => {
    it('keeps the containers transparent to pointers', () => {
        expect(block('.rea-rulers')).toContain('pointer-events:none');
        expect(block('.rea-manual-guides')).toContain('pointer-events:none');
    });

    it('opts the ruler bands and guide hit strips back into pointer events', () => {
        expect(block('.rea-ruler')).toContain('pointer-events:auto');
        expect(block('.rea-manual-guide-hit')).toContain('pointer-events:auto');
        expect(block('.rea-manual-guide-hit')).toContain('touch-action:none');
    });

    it('stacks manual guides above the rulers above the temporary snap guides', () => {
        const z = (selector: string) => Number(/z-index:(\d+)/.exec(block(selector))?.[1] ?? -1);
        // Guides must reach their tick value on the ruler, so they paint over it.
        expect(z('.rea-manual-guides')).toBeGreaterThan(z('.rea-rulers'));
        expect(z('.rea-rulers')).toBeGreaterThan(z('.rea-guides'));
    });

    it('keeps the ruler-crossing preview cap solid', () => {
        expect(block('.rea-guide-cap')).toContain('background:var(--rea-manual-guide)');
        expect(block('.rea-guide-cap')).toContain('pointer-events:none');
        expect(block('.rea-guide-cap')).not.toContain('opacity');
        // Dimming lives on the guide itself, so the cap is not inherited into 55%.
        expect(block('.rea-manual-guide.is-draft')).toContain('opacity:.55');
    });

    it('dims the hover preview like a draft and marks drags in the guide colour', () => {
        expect(block('.rea-manual-guide.is-preview')).toContain('opacity:.55');
        // The ruler notch only exists while dragging, and it belongs to the guide colour
        // rather than the accent, so it reads as part of the line it is tracking.
        expect(block('.rea-ruler-indicator')).toContain('background:var(--rea-manual-guide)');
        expect(block('.rea-ruler-indicator')).not.toContain('opacity');
    });
});
