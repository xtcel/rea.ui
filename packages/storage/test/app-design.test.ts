import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DocumentSession } from '@rea/document';
import { decodeReaui, exportReaui } from '../src/reaui';

describe('bundled ReaUI_App design document', () => {
  it('opens both editable UI pages and survives an export/import round trip', async () => {
    const bytes = new Uint8Array(readFileSync(new URL('../../../ReaUI_App.reaui', import.meta.url)));
    const decoded = decodeReaui(bytes);
    expect(decoded.warnings).toEqual([]);
    expect(decoded.document.name).toBe('ReaUI_App');
    const session = new DocumentSession(decoded.document.files);
    expect([...session.pages.keys()]).toEqual(['home', 'editor']);
    for (const { page } of session.pages.values()) {
      expect([...page.nodes.values()].filter(node => node.parentId === page.source.props.designId && node.kind === 'Frame')).toHaveLength(1);
      expect(page.nodes.size).toBeGreaterThan(80);
    }
    const exported = decodeReaui(await exportReaui(decoded.document));
    for (const { file } of session.manifest.pages) {
      expect(exported.document.files[file]).toBe(decoded.document.files[file]);
    }
  });
});
