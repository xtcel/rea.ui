import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { EDITOR_GUIDES_FILE } from '@rea/document';
import { createDefaultV2Document, decodeReaui, exportReaui } from '../src/index';

const guides = JSON.stringify({ version: 1, guides: [{ axis: 'x', position: 120 }] });

function container(files: Record<string, string>): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));
}

describe('.reaui editor guides file', () => {
  it('exports editor/guides.json and restores it on import', async () => {
    const doc = createDefaultV2Document();
    const withGuides = { files: { ...doc.files, [EDITOR_GUIDES_FILE]: guides } };
    const decoded = decodeReaui(await exportReaui(withGuides));
    expect(decoded.document.files[EDITOR_GUIDES_FILE]).toBe(guides);
    expect(decoded.warnings).toEqual([]);
  });
  it('produces byte-identical output on two consecutive exports', async () => {
    const doc = createDefaultV2Document();
    const withGuides = { files: { ...doc.files, [EDITOR_GUIDES_FILE]: guides } };
    const first = await exportReaui(withGuides);
    const second = await exportReaui(withGuides);
    expect(Buffer.from(second)).toEqual(Buffer.from(first));
  });
  it('drops a corrupted guides file with a warning', () => {
    const doc = createDefaultV2Document();
    const decoded = decodeReaui(container({ ...doc.files, [EDITOR_GUIDES_FILE]: '{broken' }));
    expect(decoded.document.files[EDITOR_GUIDES_FILE]).toBeUndefined();
    expect(decoded.warnings.join()).toContain('参考线文件');
  });
  it('drops a non-object top-level guides file with a warning', () => {
    const doc = createDefaultV2Document();
    for (const invalid of ['42', 'null', '[]']) {
      const decoded = decodeReaui(container({ ...doc.files, [EDITOR_GUIDES_FILE]: invalid }));
      expect(decoded.document.files[EDITOR_GUIDES_FILE]).toBeUndefined();
      expect(decoded.warnings.join()).toContain('参考线文件');
    }
  });
  it('drops an oversized guides file with a warning', () => {
    const doc = createDefaultV2Document();
    const oversized = Array.from({ length: Math.ceil((64 * 1024 + 1) / 36) }, () => crypto.randomUUID()).join('').slice(0, 64 * 1024 + 1);
    const decoded = decodeReaui(container({ ...doc.files, [EDITOR_GUIDES_FILE]: oversized }));
    expect(decoded.document.files[EDITOR_GUIDES_FILE]).toBeUndefined();
    expect(decoded.warnings.join()).toContain('参考线文件');
  });
  it('imports a legacy container without guides and without warnings', async () => {
    const doc = createDefaultV2Document();
    const decoded = decodeReaui(await exportReaui({ files: doc.files }));
    expect(decoded.document.files[EDITOR_GUIDES_FILE]).toBeUndefined();
    expect(decoded.warnings).toEqual([]);
  });
});
