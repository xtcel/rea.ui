import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ isTauri: vi.fn(), save: vi.fn(), writeFile: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: mocks.isTauri }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: mocks.save }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: mocks.writeFile }));
import { saveFile } from './platform';

describe('desktop file export', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.isTauri.mockReturnValue(true); });
  it('writes the original ZIP bytes only to the path selected in the native dialog', async () => {
    mocks.save.mockResolvedValue('/tmp/My Design.reaui');
    const bytes = new Uint8Array([80, 75, 3, 4, 0, 255]);
    await saveFile(new Blob([bytes]), 'My:Design.reaui');
    expect(mocks.save).toHaveBeenCalledWith({ defaultPath: 'My_Design.reaui', filters: [{ name: 'REA UI 文档', extensions: ['reaui'] }] });
    expect(mocks.writeFile).toHaveBeenCalledWith('/tmp/My Design.reaui', bytes);
  });
  it('does not write a file when the user cancels', async () => {
    mocks.save.mockResolvedValue(null);
    await saveFile(new Blob(['page']), '首页.tsx');
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });
  it('reports filesystem failure to the editor instead of silently discarding it', async () => {
    mocks.save.mockResolvedValue('/tmp/test.reaui');
    mocks.writeFile.mockRejectedValueOnce(new Error('permission denied'));
    await expect(saveFile(new Blob(['zip']), 'test.reaui')).rejects.toThrow('permission denied');
  });
});
