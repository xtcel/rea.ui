import { invoke, isTauri } from '@tauri-apps/api/core';
import { StorageService, importReaui } from '@rea/storage';

export const isDesktop = isTauri;

interface OpenedFile { name: string; bytes: number[] | null; error: string | null }

/** Subscribe before draining so startup and subsequent Finder requests use one queue. */
export async function listenForOpenedFiles(onFile: (file: File) => Promise<void>, onError: (message: string) => void, signal?: AbortSignal): Promise<() => void> {
  if (!isDesktop()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  let active = true, running = false, requested = false;
  async function drain() {
    requested = true;
    if (running || !active) return;
    running = true;
    try {
      while (requested && active) {
        requested = false;
        const files = await invoke<OpenedFile[]>('take_pending_open_files');
        for (const file of files) {
          try {
            if (file.error || !file.bytes) throw new Error(file.error ?? '没有读取到文件内容。');
            await onFile(new File([new Uint8Array(file.bytes)], file.name, { type: 'application/vnd.reaui+zip' }));
          } catch (error) { onError(`无法打开「${file.name}」：${error instanceof Error ? error.message : String(error)}`); }
        }
      }
    } catch (error) { if (active) onError(`无法接收打开文件请求：${String(error)}`); }
    finally { running = false; }
  }
  const unlisten = await listen('reaui-open-files', () => { void drain(); });
  const stop = () => { active = false; unlisten(); signal?.removeEventListener('abort', stop); };
  if (signal?.aborted) { stop(); return stop; }
  signal?.addEventListener('abort', stop, { once: true });
  void drain();
  return stop;
}

/** The save dialog grants filesystem access to its selected path only. */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  const name = filename.replace(/[\\/:*?"<>|]/g, '_');
  if (isDesktop()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs'),
    ]);
    const extension = name.split('.').at(-1) ?? 'reaui';
    const path = await save({ defaultPath: name, filters: [{ name: extension === 'reaui' ? 'REA UI 文档' : 'React 页面代码', extensions: [extension] }] });
    if (path) await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return;
  }
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Install the editable UI example once, without replacing existing projects. */
export async function installDesktopExample(url: string): Promise<void> {
  if (!isDesktop()) return;
  const storage = new StorageService();
  try {
    if (await storage.getMeta('desktop:app-design:v1')) return;
    const response = await fetch(url);
    if (!response.ok) throw new Error('无法读取内置 UI 设计示例。');
    await importReaui(storage, new Uint8Array(await response.arrayBuffer()));
    await storage.setMeta('desktop:app-design:v1', 'installed');
  } finally { await storage.close(); }
}
