import { readFile, stat } from 'node:fs/promises';
import { DocumentSession } from '@rea/document';
import { readReaui } from '@rea/storage';
import type { ReauiAsset } from '@rea/storage';
import { CliError } from './errors';
import { readDocumentAssets, readDocumentFiles } from './files';

export interface LoadedDocument {
  files: Record<string, string>;
  assets: ReauiAsset[];
  warnings: string[];
  kind: 'dir' | 'reaui';
  source: string;
}

export async function loadDocument(target: string): Promise<LoadedDocument> {
  const info = await stat(target).catch(() => undefined);
  if (!info) throw new CliError('IO_NOT_FOUND', `路径不存在：${target}`, target, '检查路径拼写，或先运行 reaui init。');
  if (info.isDirectory()) {
    return { files: await readDocumentFiles(target), assets: await readDocumentAssets(target), warnings: [], kind: 'dir', source: target };
  }
  if (!/\.reaui$/i.test(target)) throw new CliError('USAGE_TARGET', `只支持文档目录或 .reaui 文件：${target}`, target);
  const contents = readReaui(new Uint8Array(await readFile(target)));
  return { ...contents, kind: 'reaui', source: target };
}

export function openSession(files: Readonly<Record<string, string>>): DocumentSession {
  return new DocumentSession(files);
}
