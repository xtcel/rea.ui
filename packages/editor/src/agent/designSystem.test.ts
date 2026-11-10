import { describe, expect, it } from 'vitest';
import { legacySystemToPackage } from '@rea/design-system';
import { agentSystem, systemSnapshot } from './designSystem';
import { builtInSystems, isSystems } from '../home/data';
import type { DesignSystem } from './designSystem';

const record = (primary = '#356AF0'): DesignSystem => ({
  id: 'custom', name: '自定义系统', description: '本地系统',
  color: primary, colors: [primary, '#FAFBFC', '#30343B', '#656D79', '#E5E7EB'],
  tokens: { primary, background: '#FAFBFC', surface: '#FFFFFF', text: '#30343B', muted: '#656D79', border: '#E5E7EB', fontFamily: 'Inter', fontSize: 14, spacing: 8, radius: 8 },
} as unknown as DesignSystem);

describe('design system version reference', () => {
  it('treats built-ins as a read-only revision 1', () => {
    expect(builtInSystems.every(system => system.revision === 1 && system.hash === legacySystemToPackage(system).hash)).toBe(true);
    for (const system of builtInSystems) expect(systemSnapshot(system).ref).toMatchObject({ revision: 1, draft: false });
  });

  it('keeps a never-published record a draft', () => {
    expect(systemSnapshot(record()).ref).toMatchObject({ revision: null, draft: true });
  });

  it('drops the revision once the tokens no longer match the published hash', () => {
    const published = { ...record(), revision: 3, schemaVersion: 2, hash: legacySystemToPackage(record()).hash };
    expect(systemSnapshot(published).ref).toMatchObject({ revision: 3, draft: false });
    expect(systemSnapshot({ ...published, tokens: { ...(published.tokens as object), primary: '#FF0000' } as unknown as DesignSystem['tokens'] }).ref).toMatchObject({ revision: null, draft: true });
  });

  it('validates the optional revision and hash fields on stored systems', () => {
    expect(isSystems([{ ...record(), revision: 2, schemaVersion: 2, hash: legacySystemToPackage(record()).hash }])).toBe(true);
    expect(isSystems([{ ...record(), revision: 0 }])).toBe(false);
    expect(isSystems([{ ...record(), hash: 'abc' }])).toBe(false);
  });

  it('marks a system as bound only when a document pins it', () => {
    expect(agentSystem(builtInSystems[0], false).bound).toBe(false);
    expect(agentSystem(builtInSystems[0], true).bound).toBe(true);
    expect(agentSystem(record(), true).bound).toBe(false);
    expect(agentSystem(builtInSystems[0], true).ref).toMatchObject({ revision: 1, draft: false });
  });
});
