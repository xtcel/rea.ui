import {expect,it} from 'vitest';
import {designPixelCss} from './designUnits';
it('anchors rem-based spacing and fonts without changing selectors or literal content',()=>{
 const css=String.raw`.w-\[calc\(2rem\+1px\)\] {
  --spacing: .25rem;
  width: calc(2rem + 1px);
  font-size: 1.25rem;
  content: "2rem";
  font-family: "Family 1rem", sans-serif;
}`;
 const output=designPixelCss(css);expect(output).toContain(String.raw`.w-\[calc\(2rem\+1px\)\]`);expect(output).toContain('--spacing: 4px');expect(output).toContain('width: calc(32px + 1px)');expect(output).toContain('font-size: 20px');expect(output).toContain('content: "2rem"');expect(output).toContain('"Family 1rem"');
});
