export interface ReauiError {
  code: string;
  path?: string;
  message: string;
  hint?: string;
}

export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly path?: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = 'CliError';
  }
}

const RULES: { test: RegExp; code: string; hint: string }[] = [
  { test: /缺少 rea\.json/, code: 'MANIFEST_MISSING', hint: '确认命令指向文档根目录，或用 reaui init 创建新文档。' },
  { test: /清单格式不合法|rea\.json 必须是对象|页面 id、文件路径必须合法/, code: 'MANIFEST_INVALID', hint: '只保留 format/version/id/name/pages/createdAt，页面路径必须是 pages/<id>.page.tsx。' },
  { test: /缺少页面文件/, code: 'PAGE_MISSING', hint: '清单里的每个 file 都必须存在，且路径与 pages/ 下的文件名一致。' },
  { test: /页面 id .* 与清单|与清单 .* 不一致/, code: 'PAGE_ID_MISMATCH', hint: 'Page 的 id 属性必须与 rea.json 中该页面的 id 完全相同。' },
  { test: /禁止非声明式表达式|静态值|只能为静态|不允许数组空项|对象仅允许静态/, code: 'PAGE_STATIC_ONLY', hint: '只使用静态字符串、数字、布尔、数组和普通对象；移除函数、事件、变量与模板表达式。' },
  { test: /仅允许从|不允许|不支持|HTML|外部组件|未注册的设计节点/, code: 'PAGE_SUBSET', hint: '只使用 @rea/design 的页面原语，不要使用 div/span 等 HTML 标签或项目组件。' },
  { test: /designId/, code: 'DESIGN_ID', hint: 'designId 需匹配 ^[a-z][a-z0-9-]{1,63}$，且在同一页面内唯一。' },
  { test: /锁定/, code: 'NODE_LOCKED', hint: '移除目标节点的 locked 属性，或先解锁它的父级容器。' },
  { test: /ZIP|压缩|分卷|加密/, code: 'REAUI_INVALID', hint: '重新从 ReaUI 导出 .reaui，确认文件未损坏或被其他工具改写。' },
  { test: /资源路径|assets\//, code: 'ASSET_INVALID', hint: '资源只能放在 assets/ 下，使用安全的相对路径。' },
];

function pathFromMessage(message: string): string | undefined {
  return message.match(/^((?:pages|components|agent|editor|design)\/[^\s:]+|rea\.json):/)?.[1];
}

export function describe(error: unknown, fallbackPath?: string): ReauiError {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof CliError) return { code: error.code, path: error.path ?? fallbackPath, message, hint: error.hint };
  const rule = RULES.find(item => item.test.test(message));
  return {
    code: rule?.code ?? 'DOC_INVALID',
    path: pathFromMessage(message) ?? fallbackPath,
    message,
    hint: rule?.hint ?? '运行 reaui validate --json 查看完整错误，再按 message 指向的文件与节点修复。',
  };
}

export function printErrors(errors: readonly ReauiError[], json: boolean): void {
  if (json) {
    console.log(JSON.stringify({ ok: false, errors }, null, 2));
    return;
  }
  for (const error of errors) {
    const location = error.path ? `${error.path}: ` : '';
    console.error(`  [FAIL] [${error.code}] ${location}${error.message}`);
    if (error.hint) console.error(`    提示：${error.hint}`);
  }
}
