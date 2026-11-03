import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ isTauri: vi.fn(), invoke: vi.fn(), listen: vi.fn(), save: vi.fn(), writeFile: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: mocks.isTauri, invoke: mocks.invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: mocks.save }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: mocks.writeFile }));
import { listenForOpenedFiles, saveFile } from './platform';

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

describe('desktop file opening', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.isTauri.mockReturnValue(true); });
  it('subscribes before consuming a cold-launch file and preserves its bytes and Unicode name', async () => {
    const unlisten=vi.fn(), onFile=vi.fn(async (file:File) => {
      expect(file.name).toBe('中文 设计.REAUI');
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([80,75,0,255]));
    });
    mocks.listen.mockResolvedValue(unlisten);
    mocks.invoke.mockImplementation(async () => {
      expect(mocks.listen).toHaveBeenCalledWith('reaui-open-files',expect.any(Function));
      return [{name:'中文 设计.REAUI',bytes:[80,75,0,255],error:null}];
    });
    const stop=await listenForOpenedFiles(onFile,vi.fn());
    await vi.waitFor(()=>expect(onFile).toHaveBeenCalledOnce());stop();expect(unlisten).toHaveBeenCalledOnce();
  });
  it('serializes new Finder requests arriving while another document is opening', async () => {
    let opened:(()=>void)|undefined, release:(()=>void)|undefined;
    const gate=new Promise<void>(resolve=>{release=resolve;}), order:string[]=[];
    mocks.listen.mockImplementation(async (_event,callback)=>{opened=callback;return vi.fn();});
    mocks.invoke.mockResolvedValueOnce([{name:'one.reaui',bytes:[1],error:null}]).mockResolvedValueOnce([{name:'two.reaui',bytes:[2],error:null}]);
    const stop=await listenForOpenedFiles(async file=>{order.push(file.name);if(file.name==='one.reaui')await gate;},vi.fn());
    await vi.waitFor(()=>expect(order).toEqual(['one.reaui']));opened!();opened!();expect(mocks.invoke).toHaveBeenCalledTimes(1);
    release!();await vi.waitFor(()=>expect(order).toEqual(['one.reaui','two.reaui']));expect(mocks.invoke).toHaveBeenCalledTimes(2);stop();
  });
  it('reports unreadable and invalid files and still opens the following valid document', async () => {
    mocks.listen.mockResolvedValue(vi.fn());
    mocks.invoke.mockResolvedValue([{name:'missing.reaui',bytes:null,error:'not found'},{name:'bad.reaui',bytes:[0],error:null},{name:'good.reaui',bytes:[80,75],error:null}]);
    const errors=vi.fn(), onFile=vi.fn(async (file:File)=>{if(file.name==='bad.reaui')throw new Error('ZIP 目录损坏。');});
    const stop=await listenForOpenedFiles(onFile,errors);
    await vi.waitFor(()=>expect(onFile).toHaveBeenCalledTimes(2));expect(errors).toHaveBeenCalledTimes(2);expect(errors.mock.calls[0][0]).toContain('missing.reaui');expect(onFile.mock.calls[1][0].name).toBe('good.reaui');stop();
  });
  it('does not consume startup requests for a disposed subscription', async () => {
    const controller=new AbortController(),unlisten=vi.fn();
    mocks.listen.mockImplementation(async ()=>{controller.abort();return unlisten;});
    await listenForOpenedFiles(vi.fn(),vi.fn(),controller.signal);
    expect(mocks.invoke).not.toHaveBeenCalled();expect(unlisten).toHaveBeenCalledOnce();
  });
  it('leaves browser-only sessions unchanged', async () => {
    mocks.isTauri.mockReturnValue(false);await listenForOpenedFiles(vi.fn(),vi.fn());expect(mocks.listen).not.toHaveBeenCalled();expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
