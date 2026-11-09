import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { SYSTEM_FILE } from '@rea/document';
import { createSystem, DEFAULT_TOKENS, serializeSystem } from '@rea/design-system';
import { createDefaultV2Document, decodeReaui, exportReaui } from '../src/index';

const system = () => createSystem({
  id: 'rea', name: 'REA UI', tokens: structuredClone(DEFAULT_TOKENS),
  components: [{ key: 'button', name: '按钮', description: '主操作使用主色。' }], guidelines: '',
});
function v4(extra: Record<string, string> = {}) {
  const doc = createDefaultV2Document();
  const manifest = { ...JSON.parse(doc.files['rea.json']) as Record<string, unknown>, version: 4 };
  return { files: { ...doc.files, 'rea.json': JSON.stringify(manifest), ...extra } };
}
const container = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])));

describe('.reaui design system snapshot', () => {
  it('exports and restores the snapshot with byte-identical output', async () => {
    const source = serializeSystem(system());
    const doc = v4({ [SYSTEM_FILE]: source });
    const first = await exportReaui(doc);
    const second = await exportReaui(doc);
    expect(Buffer.from(second)).toEqual(Buffer.from(first));
    const decoded = decodeReaui(first);
    expect(decoded.document.files[SYSTEM_FILE]).toBe(source);
    expect(decoded.warnings).toEqual([]);
  });

  it('drops a corrupt snapshot with a warning', () => {
    const decoded = decodeReaui(container(v4({ [SYSTEM_FILE]: '{broken' }).files));
    expect(decoded.document.files[SYSTEM_FILE]).toBeUndefined();
    expect(decoded.warnings.join()).toContain('设计系统快照');
  });

  it('drops a snapshot whose hash no longer matches', () => {
    const tampered = JSON.stringify({ ...system(), name: '被改名' });
    const decoded = decodeReaui(container(v4({ [SYSTEM_FILE]: tampered }).files));
    expect(decoded.document.files[SYSTEM_FILE]).toBeUndefined();
    expect(decoded.warnings.join()).toContain('hash 不匹配');
  });

  it('rejects a snapshot on a v3 document', () => {
    const doc = createDefaultV2Document();
    const manifest = { ...JSON.parse(doc.files['rea.json']) as Record<string, unknown>, version: 3 };
    expect(() => decodeReaui(container({ ...doc.files, 'rea.json': JSON.stringify(manifest), [SYSTEM_FILE]: serializeSystem(system()) }))).toThrow(/v4/);
  });

  it('drops an oversized snapshot', () => {
    let filler = '';
    for (let index = 0; index < 300 * 1024; index++) filler += String.fromCharCode(33 + (index * 37) % 90);
    const huge = JSON.stringify({ ...system(), guidelines: filler });
    const decoded = decodeReaui(container(v4({ [SYSTEM_FILE]: huge }).files));
    expect(decoded.document.files[SYSTEM_FILE]).toBeUndefined();
    expect(decoded.warnings.join()).toContain('过大');
  });
});
