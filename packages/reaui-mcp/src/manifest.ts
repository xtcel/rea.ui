import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ManifestPage {
  id: string;
  file: string;
}

export interface Manifest {
  format: string;
  version: number;
  id: string;
  name: string;
  pages: ManifestPage[];
  createdAt: string;
  [key: string]: unknown;
}

export const PAGE_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export function pageFile(pageId: string): string {
  return `pages/${pageId}.page.tsx`;
}

export async function readManifest(docDir: string): Promise<Manifest> {
  const raw = await readFile(path.join(docDir, 'rea.json'), 'utf8');
  return JSON.parse(raw) as Manifest;
}

/** 追加页面到清单；已存在则忽略，保持幂等。 */
export async function addManifestPage(docDir: string, page: ManifestPage): Promise<Manifest> {
  const manifest = await readManifest(docDir);
  if (!manifest.pages.some(item => item.id === page.id)) {
    manifest.pages.push(page);
    await writeFile(path.join(docDir, 'rea.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  return manifest;
}
