import { expect, it } from 'vitest';
import { fixedValue, readTextSizing, writeTextSizing } from '../src/index';
it('switches all three text size modes without leaving conflicting utilities',()=>{
  const auto=writeTextSizing('w-20 h-10 overflow-hidden whitespace-pre-wrap hover:w-40 custom','auto-width');expect(auto).toContain('w-fit');expect(auto).toContain('whitespace-nowrap');expect(auto).not.toContain('overflow-hidden');expect(fixedValue(auto,'width')).toBeUndefined();expect(readTextSizing(auto)).toBe('auto-width');
  const height=writeTextSizing(auto,'auto-height',200);expect(height).toContain('w-[200px]');expect(height).toContain('h-auto');expect(height).toContain('whitespace-pre-wrap');expect(readTextSizing(height)).toBe('auto-height');
  const fixed=writeTextSizing(height,'fixed',200,90);expect(fixed).toContain('h-[90px]');expect(fixed).toContain('overflow-hidden');expect(fixed).toContain('hover:w-40 custom');expect(readTextSizing(fixed)).toBe('fixed');
});
