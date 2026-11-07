import { describe, expect, it } from 'vitest';
import { fixedValue } from '@rea/tailwind';
import { assetPath, contentDigest, fitWithin, imageExtension, imageLayerFragment, layerName, measureImage, prepareImage, sniffImageType, svgSize, MAX_IMAGE_BYTES } from './images';

const bytes = (...values: number[]) => new Uint8Array(values);
const png = () => bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13);
const jpeg = () => bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const gif = () => new TextEncoder().encode('GIF89a');
const webp = () => new TextEncoder().encode('RIFF\x1a\x00\x00\x00WEBPVP8 ');
const svg = (body: string) => new TextEncoder().encode(body);
const file = (name: string, data: Uint8Array, size = data.length) => ({ name, size, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer });

describe('image format sniffing', () => {
  it('identifies every supported container from its bytes', () => {
    expect(sniffImageType(png())).toEqual({ extension: 'png', type: 'image/png' });
    expect(sniffImageType(jpeg())).toEqual({ extension: 'jpg', type: 'image/jpeg' });
    expect(sniffImageType(gif())?.extension).toBe('gif');
    expect(sniffImageType(webp())?.extension).toBe('webp');
    expect(sniffImageType(svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>'))?.type).toBe('image/svg+xml');
  });
  it('accepts an SVG with a BOM, prolog and comments before the root tag', () => {
    expect(sniffImageType(svg('\uFEFF<?xml version="1.0"?><!-- icon --><svg width="8" height="8"/>'))?.extension).toBe('svg');
  });
  it('rejects anything else, including a text file renamed to .png', () => {
    expect(sniffImageType(new TextEncoder().encode('not an image'))).toBeUndefined();
    expect(sniffImageType(bytes())).toBeUndefined();
  });
  it('only accepts the supported extensions', () => {
    expect(imageExtension('photo.PNG')).toBe('png');
    expect(imageExtension('photo.jpeg')).toBe('jpeg');
    expect(imageExtension('photo.tiff')).toBeUndefined();
    expect(imageExtension('photo')).toBeUndefined();
  });
});

describe('asset naming', () => {
  it('derives a stable, safe path from the content', async () => {
    const first = await contentDigest(png()), second = await contentDigest(png());
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(assetPath(first, 'png')).toBe(`assets/img-${first}.png`);
    expect(assetPath(first, 'png')).not.toBe(assetPath(await contentDigest(jpeg()), 'jpg'));
  });
  it('keeps layer names readable but bounded', () => {
    expect(layerName('/Users/me/设计稿/首页 Hero.png')).toBe('首页 Hero');
    expect(layerName('.hidden.png')).toBe('.hidden');
    expect(layerName('   ')).toBe('图片');
    expect(layerName(`${'a'.repeat(200)}.png`)).toHaveLength(80);
  });
});

describe('intrinsic size', () => {
  it('reads pixel attributes', () => {
    expect(svgSize('<svg width="120" height="80"/>')).toEqual({ width: 120, height: 80 });
    expect(svgSize("<svg width='120px' height='80px'/>")).toEqual({ width: 120, height: 80 });
  });
  it('falls back to the viewBox and keeps the aspect ratio', () => {
    expect(svgSize('<svg viewBox="0 0 24 12"/>')).toEqual({ width: 24, height: 12 });
    expect(svgSize('<svg width="48" viewBox="0 0 24 12"/>')).toEqual({ width: 48, height: 24 });
    expect(svgSize('<svg height="24" viewBox="0 0 24 12"/>')).toEqual({ width: 48, height: 24 });
  });
  it('uses the replaced-element default when nothing is declared', () => {
    expect(svgSize('<svg/>')).toEqual({ width: 300, height: 150 });
  });
  it('measures an SVG without a DOM decoder', async () => {
    await expect(measureImage(svg('<svg viewBox="0 0 64 32"/>'), 'svg')).resolves.toEqual({ width: 64, height: 32 });
  });
});

describe('placement', () => {
  it('shrinks oversized images inside the canvas but never enlarges small ones', () => {
    expect(fitWithin({ width: 2000, height: 1000 }, { width: 800, height: 600 })).toEqual({ width: 800, height: 400 });
    expect(fitWithin({ width: 120, height: 90 }, { width: 800, height: 600 })).toEqual({ width: 120, height: 90 });
  });
  it('serializes an Image layer with its asset path and box', () => {
    const fragment = imageLayerFragment({ id: 'img-1', name: '首图', src: 'assets/img-abc.png', frame: { x: 12.4, y: -8.6, width: 320, height: 180 } });
    expect(fragment).toContain('<Image ');
    expect(fragment).toContain('src={"assets/img-abc.png"}');
    const className = JSON.parse(/className=\{("(?:[^"\\]|\\.)*")\}/.exec(fragment)![1]) as string;
    expect(fixedValue(className, 'left')).toBe(12);
    expect(fixedValue(className, 'top')).toBe(-9);
    expect(fixedValue(className, 'width')).toBe(320);
    expect(fixedValue(className, 'height')).toBe(180);
    expect(className.split(' ')).toContain('absolute');
  });
});

describe('preparation', () => {
  it('builds a document asset from file bytes', async () => {
    const { asset, image } = await prepareImage('doc_1', file('首图.svg', svg('<svg width="40" height="20"/>')));
    expect(asset).toMatchObject({ docId: 'doc_1', type: 'image/svg+xml' });
    expect(asset.path).toMatch(/^assets\/img-[0-9a-f]{16}\.svg$/);
    expect(image).toMatchObject({ path: asset.path, width: 40, height: 20, name: '首图.svg' });
    expect(asset.blob.type).toBe('image/svg+xml');
  });
  it('rejects oversized and empty files before reading them', async () => {
    await expect(prepareImage('doc_1', file('big.png', png(), MAX_IMAGE_BYTES + 1))).rejects.toThrow(/上限/);
    await expect(prepareImage('doc_1', file('empty.png', bytes(), 0))).rejects.toThrow(/空文件/);
  });
  it('rejects a renamed file that is not really an image', async () => {
    await expect(prepareImage('doc_1', file('fake.png', new TextEncoder().encode('hello')))).rejects.toThrow(/不是受支持的图片格式/);
  });
});
