import { zipSync } from 'fflate';

/** 一次导出多个文件时打包成 ZIP，避免连续弹出一堆保存对话框。 */
export function zipArchive(files: readonly { name: string; bytes: Uint8Array }[]): Uint8Array {
  const entries: Record<string, Uint8Array> = Object.create(null);
  for (const file of files) entries[file.name] = file.bytes;
  return zipSync(entries, { level: 6 });
}
