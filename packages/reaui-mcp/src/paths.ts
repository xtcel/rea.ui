import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export class WorkspaceError extends Error {}

/** 把用户传入的相对路径限制在工作区内，拒绝 `..` 逃逸与绝对路径。 */
export function resolveInRoot(root: string, input: string): string {
  const target = path.resolve(root, input);
  const relative = path.relative(root, target);
  if (relative === '') return target;
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new WorkspaceError(`路径不在工作区内：${input}`);
  }
  return target;
}

/** 相对于工作区的路径，用于传给 CLI，避免绝对路径出现在工具返回值里。 */
export function relativeTo(root: string, target: string): string {
  return path.relative(root, target) || '.';
}

export async function ensureDir(dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  return dir;
}
