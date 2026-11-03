import { isTauri } from '@tauri-apps/api/core';
import { StorageService, importReaui } from '@rea/storage';

export const isDesktop = isTauri;

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
