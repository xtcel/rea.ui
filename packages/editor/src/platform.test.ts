import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ isTauri: vi.fn(), invoke: vi.fn(), listen: vi.fn(), save: vi.fn(), writeFile: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: mocks.isTauri, invoke: mocks.invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: mocks.save }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: mocks.writeFile }));
import { listenForExitRequests, listenForOpenedFiles, pickDocumentFile, saveBoundDocument, saveDocument, saveFile } from './platform';

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

describe('desktop document saving', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.isTauri.mockReturnValue(true); });
  it('overwrites the file the document was opened from without asking again', async () => {
    mocks.invoke.mockResolvedValue('/tmp/设计.reaui');
    const bytes = new Uint8Array([80, 75, 3, 4]);
    const result = await saveDocument(new Blob([bytes]), '设计:稿.reaui', { id: 'doc_1', path: '/tmp/设计.reaui' });
    expect(mocks.invoke).toHaveBeenCalledWith('save_document', { id: 'doc_1', name: '设计_稿.reaui', bytes: [80, 75, 3, 4], path: '/tmp/设计.reaui', choosePath: false });
    expect(result).toEqual({ status: 'saved', path: '/tmp/设计.reaui' });
  });
  it('lets the app ask for a path when the document has no file yet', async () => {
    mocks.invoke.mockResolvedValue(null);
    const result = await saveDocument(new Blob(['zip']), 'a.reaui', { id: 'doc_1' });
    expect(mocks.invoke).toHaveBeenCalledWith('save_document', expect.objectContaining({ path: null, choosePath: false }));
    expect(result).toEqual({ status: 'cancelled' });
  });
  it('always asks for a path when saving as a new file', async () => {
    mocks.invoke.mockResolvedValue('/tmp/副本.reaui');
    await saveDocument(new Blob(['zip']), 'a.reaui', { id: 'doc_1', path: '/tmp/a.reaui', choosePath: true });
    expect(mocks.invoke).toHaveBeenCalledWith('save_document', expect.objectContaining({ path: '/tmp/a.reaui', choosePath: true }));
  });
  it('surfaces a failed write instead of reporting success', async () => {
    mocks.invoke.mockRejectedValue(new Error('写入文件失败：permission denied'));
    await expect(saveDocument(new Blob(['zip']), 'a.reaui', { id: 'doc_1', path: '/tmp/a.reaui' })).rejects.toThrow('写入文件失败');
  });
  it('downloads instead of writing a path in the browser', async () => {
    mocks.isTauri.mockReturnValue(false);
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.stubGlobal('document', { createElement: () => anchor });
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:design', revokeObjectURL: vi.fn() });
    try {
      const result = await saveDocument(new Blob(['zip']), '设计:稿.reaui', { id: 'doc_1', path: '/tmp/a.reaui' });
      expect(result).toEqual({ status: 'downloaded' });
      expect(anchor.download).toBe('设计_稿.reaui');
      expect(anchor.href).toBe('blob:design');
      expect(anchor.click).toHaveBeenCalledOnce();
      expect(mocks.invoke).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('desktop file opening', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.isTauri.mockReturnValue(true); });
  it('subscribes before consuming a cold-launch file and preserves its bytes and Unicode name', async () => {
    const unlisten=vi.fn(), onFile=vi.fn(async (file:File, _path:string|null) => {
      expect(file.name).toBe('中文 设计.REAUI');
      expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([80,75,0,255]));
    });
    mocks.listen.mockResolvedValue(unlisten);
    mocks.invoke.mockImplementation(async () => {
      expect(mocks.listen).toHaveBeenCalledWith('reaui-open-files',expect.any(Function));
      return [{name:'中文 设计.REAUI',path:'/Users/me/中文 设计.REAUI',bytes:[80,75,0,255],error:null}];
    });
    const stop=await listenForOpenedFiles(onFile,vi.fn());
    await vi.waitFor(()=>expect(onFile).toHaveBeenCalledOnce());
    // ⌘S needs the path the OS handed over; dropping it was why the file never updated.
    expect(onFile.mock.calls[0][1]).toBe('/Users/me/中文 设计.REAUI');
    stop();expect(unlisten).toHaveBeenCalledOnce();
  });
  it('opens without a writable path when the OS reports none', async () => {
    const unlisten=vi.fn(), onFile=vi.fn(async (_file:File, _path:string|null) => {});
    mocks.listen.mockResolvedValue(unlisten);
    mocks.invoke.mockResolvedValue([{name:'one.reaui',bytes:[1],error:null}]);
    const stop=await listenForOpenedFiles(onFile,vi.fn());
    await vi.waitFor(()=>expect(onFile).toHaveBeenCalledOnce());
    expect(onFile.mock.calls[0][1]).toBeNull();
    stop();
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

describe('in-place auto-save, desktop document picker and quit flush', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.isTauri.mockReturnValue(true); });

  it('writes back in place silently on desktop and reports unavailable when missing or in browser', async () => {
    mocks.invoke.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const bytes = new Uint8Array([80, 75, 3, 4]);
    await expect(saveBoundDocument(new Blob([bytes]), { id: 'doc_1', path: '/tmp/app.reaui' })).resolves.toBe('saved');
    expect(mocks.invoke).toHaveBeenCalledWith('save_document_in_place', { id: 'doc_1', bytes: [80, 75, 3, 4], path: '/tmp/app.reaui' });
    await expect(saveBoundDocument(new Blob([bytes]), { id: 'doc_1', path: '/tmp/gone.reaui' })).resolves.toBe('unavailable');
    mocks.isTauri.mockReturnValue(false);
    await expect(saveBoundDocument(new Blob([bytes]), { id: 'doc_1', path: '/tmp/app.reaui' })).resolves.toBe('unavailable');
  });

  it('picks a desktop document preserving its path and surfaces read errors', async () => {
    mocks.invoke.mockResolvedValueOnce(null);
    await expect(pickDocumentFile()).resolves.toBeNull();
    mocks.invoke.mockResolvedValueOnce({ name: 'bad.reaui', path: null, bytes: null, error: '损坏文件' });
    await expect(pickDocumentFile()).rejects.toThrow('损坏文件');
    mocks.invoke.mockResolvedValueOnce({ name: 'design.reaui', path: '/tmp/design.reaui', bytes: [80, 75], error: null });
    const picked = await pickDocumentFile();
    expect(picked?.path).toBe('/tmp/design.reaui');
    expect(picked?.file.name).toBe('design.reaui');
    expect(new Uint8Array(await picked!.file.arrayBuffer())).toEqual(new Uint8Array([80, 75]));
  });

  it('flushes before finishing exit on ⌘Q and cancels exit if flushing fails', async () => {
    let onExitRequested: (() => void) | undefined;
    const unlisten = vi.fn();
    mocks.listen.mockImplementation(async (event, cb) => {
      if (event === 'reaui-exit-requested') onExitRequested = cb;
      return unlisten;
    });
    mocks.invoke.mockResolvedValue(undefined);
    const onError = vi.fn();
    const flush = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('disk full'));
    const stop = await listenForExitRequests(flush, onError);

    onExitRequested!();
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('finish_exit'));
    expect(onError).not.toHaveBeenCalled();

    onExitRequested!();
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('cancel_exit'));
    expect(onError.mock.calls[0][0]).toContain('disk full');
    stop();
    expect(unlisten).toHaveBeenCalledOnce();
  });
});
