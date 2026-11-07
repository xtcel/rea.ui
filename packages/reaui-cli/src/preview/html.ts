import type { Artboard } from './artboards';

export interface RenderedBoard {
  board: Artboard;
  html?: string;
  error?: string;
}

export interface PreviewPage {
  id: string;
  name: string;
  boards: RenderedBoard[];
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ESCAPES[character] ?? character);
}

const STYLE = `
:root{color-scheme:light}
html,body{margin:0;padding:0}
body{background:#eef0f4;color:#30343b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:13px}
header{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;padding:12px 24px;background:rgba(255,255,255,.94);border-bottom:1px solid #e5e7eb}
header h1{margin:0;font-size:14px;font-weight:500}
header .meta{font-size:12px;color:#656d79}
main{padding:24px}
.page{margin:0 0 40px}
.page-head{display:flex;align-items:baseline;gap:8px;margin:0 0 12px}
.page-head h2{margin:0;font-size:13px;font-weight:500}
.page-head span{font-size:12px;color:#656d79}
.board-row{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
.board{max-width:100%;overflow:auto;background:#fff;border:1px solid #e5e7eb;box-shadow:0 1px 2px rgba(16,24,40,.06)}
.board-head{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid #eef0f3;font-size:11px;color:#656d79;white-space:nowrap}
.board-head b{font-weight:500;color:#30343b}
.board-canvas{position:relative;overflow:hidden;background:#fff}
.board-shift{position:absolute}
.board-error{padding:16px;font-size:12px;color:#a32d2d;background:#fcebeb;max-width:520px}
.note{margin:0 24px 16px;font-size:12px;color:#656d79}
`;

export function previewHtml(documentName: string, pages: readonly PreviewPage[], css: string, generatedAt: string): string {
  const boards = pages.reduce((sum, page) => sum + page.boards.length, 0);
  const sections = pages.map(page => {
    const rows = page.boards.map(rendered => {
      const board = rendered.board;
      const fallback = board.fallback ? ' · 尺寸已回退' : '';
      const body = rendered.error
        ? `<div class="board-error">该画板无法渲染：${escapeHtml(rendered.error)}</div>`
        : `<div class="board-canvas" style="width:${board.width}px;height:${board.height}px"><div class="board-shift" style="left:${-board.left}px;top:${-board.top}px;width:${board.width}px;height:${board.height}px">${rendered.html ?? ''}</div></div>`;
      return `<div class="board"><div class="board-head"><b>${escapeHtml(board.name)}</b><span>${board.width}×${board.height}${fallback}</span></div>${body}</div>`;
    }).join('');
    return `<section class="page"><div class="page-head"><h2>${escapeHtml(page.name)}</h2><span>${escapeHtml(page.id)} · ${page.boards.length} 个画板</span></div><div class="board-row">${rows}</div></section>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="reaui preview">
<title>${escapeHtml(documentName)} · 设计预览</title>
<style>${css.replace(/<\/style/gi, '<\\/style')}</style>
<style>${STYLE}</style>
</head>
<body>
<header><h1>${escapeHtml(documentName)}</h1><span class="meta">静态预览 · ${pages.length} 页 · ${boards} 个画板 · ${escapeHtml(generatedAt)}</span></header>
<p class="note">这是 REA UI 设计源的离线预览，不是可交互原型。文字与图层来自静态 TSX，实例已展开；图片资源与字体不做加载。</p>
<main>${sections}</main>
</body>
</html>
`;
}
