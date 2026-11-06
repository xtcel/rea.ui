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

    it('stacks rulers above the temporary snap guides above manual guides', () => {
        const z = (selector: string) => Number(/z-index:(\d+)/.exec(block(selector))?.[1] ?? -1);
        expect(z('.rea-rulers')).toBeGreaterThan(z('.rea-guides'));
        expect(z('.rea-guides')).toBeGreaterThan(z('.rea-manual-guides'));
    });
});
