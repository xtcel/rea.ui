import { describe, expect, it } from 'vitest';
import { TailwindCompiler, filterCandidates, fixedValue, formatClassToken, parseClassToken, patchClassName, patchClassNames, readProperty } from '../src/index';
describe('Tailwind tokens and property patches', () => {
  it.each(['md:hover:!-left-4', 'md:hover:-left-4!', '[&:nth-child(2)]:bg-[#123456]/50', '[letter-spacing:0.02em]', 'rounded-tl-lg'])('parses utility %s', raw => {
    const token = parseClassToken(raw);
    expect(token.raw).toBe(raw);
    expect(parseClassToken(formatClassToken(token))).toMatchObject({ variants: token.variants, important: token.important, utility: token.utility, value: token.value, negative: token.negative });
  });
  it('keeps unknown and variant classes in place and removes conflicts', () => {
    const value = 'skew-x-3 w-20 hover:w-96 my-class w-[99px] bg-red-500';
    expect(patchClassName(value, 'width', 100)).toBe('skew-x-3 w-[100px] hover:w-96 my-class bg-red-500');
    expect(patchClassName(patchClassName(value, 'width', 100), 'width', 100)).toBe(patchClassName(value, 'width', 100));
    expect(patchClassName('rounded-lg rounded-tl-sm hover:rounded-xl custom', 'rounded', null)).toBe('hover:rounded-xl custom');
    expect(patchClassName('px-4 p-2 md:px-8', 'padding-x', 24)).toBe('px-6 p-2 md:px-8');
    expect(patchClassName('[width:13px] w-20', 'width', 80)).toBe('w-20');
  });
  it.each([0, 16, -16, 13, -13, 317, 320, 960, 1.25])('roundtrips lengths %s', value => {
    const classes = patchClassName('', 'left', value);
    expect(fixedValue(classes, 'left')).toBe(value);
    expect(patchClassName(classes, 'left', value)).toBe(classes);
  });
  it('uses explicit spacing, text, radius and color scales', () => {
    expect(patchClassNames('', { padding: 16, width: 317, rounded: 16, 'text-size': 24, bg: '#2b7fff' })).toBe('p-4 w-[317px] rounded-2xl leading-[24px] text-2xl bg-blue-500');
    expect(patchClassName('', 'bg', { hex: '#123456', opacity: 50 })).toBe('bg-[#123456]/50');
    expect(readProperty('bg-[#123456]/50', 'bg')).toEqual({ hex: '#123456', opacity: 50 });
    expect(patchClassName('', 'opacity', 0.123)).toBe('opacity-[0.123]');
    expect(readProperty('opacity-[0.123]', 'opacity')).toBe(0.123);
    expect(readProperty('rounded-xs', 'rounded')).toEqual({ type: 'fixed', value: 2 });
  });
  it('marks variable sizes and ambiguous groups', () => {
    expect(readProperty('w-full', 'width')).toEqual({ type: 'relative', keyword: 'full' });
    expect(readProperty('w-20 w-[100px]', 'width')).toBe('conflict');
    expect(readProperty('w-20!', 'width')).toEqual({ type: 'fixed', value: 80 });
    expect(() => patchClassName('', 'width', NaN)).toThrow();
    expect(() => patchClassName('', 'width', -1)).toThrow();
    expect(() => patchClassName('', 'bg', 'javascript:alert(1)')).toThrow();
  });
  it.each(['bg-[url(https://example.com/a.png)]', 'bg-[url(//example.com/a.png)]', '[color:red;background:blue]', '[color:expression(x)]', 'bg-[url(assets/../a.png)]', 'bg-[u\\72l(https://example.com/a.png)]', '[@import:foo]', '[color:red}body{]'])('filters unsafe candidate %s', value => {
    const result = filterCandidates([value]); expect(result.candidates).toHaveLength(0); expect(result.diagnostics).toHaveLength(1);
  });
  it('compiles raw v4 theme and preflight, arbitrary classes and variants, incrementally', async () => {
    const compiler = new TailwindCompiler();
    const first = await compiler.build(['w-80 p-4 skew-x-3 hover:bg-red-500 bg-[url(assets/bg.png)]']);
    expect(first.css).toContain('.w-80'); expect(first.css).toContain('box-sizing: border-box');
    expect(first.css).toContain('skew-x-3'); expect(first.css).toContain('hover'); expect(first.css).toContain('url(assets/bg.png)');
    const second = await compiler.build(['w-[317px] bg-[url(https://example.com/a.png)]']);
    expect(second.css).toContain('317px'); expect(second.css).toContain('.w-80');
    expect(second.css).not.toContain('example.com'); expect(second.diagnostics).toHaveLength(1);
    expect((await compiler.build(['w-[317px]'])).css).toBe(second.css);
  });
  it('compiles object-fit utilities so an image can fill its box without distortion', async () => {
    const { css, diagnostics } = await new TailwindCompiler().build(['object-cover', 'object-contain']);
    expect(css).toContain('object-fit: cover'); expect(css).toContain('object-fit: contain');
    expect(diagnostics).toHaveLength(0);
  });
});

describe('editing core styles',()=>{
  it('round-trips rotation values and preserves variants',()=>{
    for(const angle of [-90,0,45,73]) {const cls=patchClassName('hover:rotate-12 rotate-2','rotate',angle);expect(fixedValue(cls,'rotate')).toBe(angle);expect(cls).toContain('hover:rotate-12');}
  });
});
