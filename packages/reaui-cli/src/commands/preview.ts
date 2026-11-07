import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cloneElement, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageRenderer } from '@rea/renderer-dom/render';
import { TailwindCompiler } from '@rea/tailwind';
import { value } from '../args';
import type { Args } from '../args';
import { loadDocument, openSession } from '../document';
import { artboardsOf } from '../preview/artboards';
import { previewHtml } from '../preview/html';
import type { PreviewPage, RenderedBoard } from '../preview/html';

export async function runPreview(args: Args): Promise<number> {
  const target = args.positionals[0] ?? '.';
  const output = path.resolve(value(args, 'out', path.join(process.cwd(), 'preview.html')) as string);
  const loaded = await loadDocument(target);
  const session = openSession(loaded.files);
  const compiler = new TailwindCompiler();
  const classNames: string[] = ['rounded-full'];
  for (const parsed of session.pages.values()) {
    for (const node of parsed.page.nodes.values()) {
      if (node.element.props.className) classNames.push(node.element.props.className);
    }
  }
  const { css, diagnostics } = await compiler.build(classNames);
  const pages: PreviewPage[] = [];
  for (const entry of session.manifest.pages) {
    const parsed = session.pages.get(entry.id);
    if (!parsed) continue;
    const boards: RenderedBoard[] = artboardsOf(parsed.page.source).map(board => {
      try {
        const page = cloneElement(parsed.page.source, {}, board.frame);
        return { board, html: renderToStaticMarkup(createElement(PageRenderer, { page, interactive: false })) };
      } catch (error) {
        return { board, error: error instanceof Error ? error.message : String(error) };
      }
    });
    pages.push({ id: entry.id, name: parsed.page.name, boards });
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, previewHtml(session.manifest.name, pages, css, new Date().toISOString()), 'utf8');
  console.log(`已生成预览：${path.relative(process.cwd(), output) || output}`);
  console.log(`  文档：${session.manifest.name}，页面：${pages.length}，画板：${pages.reduce((sum, page) => sum + page.boards.length, 0)}`);
  console.log(`  样式：${(css.length / 1024).toFixed(1)} KB${diagnostics.length ? `，${diagnostics.length} 个类未生成 CSS` : ''}`);
  for (const warning of loaded.warnings) console.log(`  警告：${warning}`);
  return 0;
}
