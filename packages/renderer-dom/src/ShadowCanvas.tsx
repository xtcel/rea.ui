import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { patchClassNames, TailwindCompiler } from '@rea/tailwind';
import type { StyleDiagnostic } from '@rea/tailwind';
import { inspectPage } from '@rea/design';
import { PageRenderer } from './render';
import { designPixelCss } from './designUnits';
import type { PageRendererProps } from './render';

export function ShadowCanvas(props: PageRendererProps & { onReady?: () => void; onDiagnostics?: (diagnostics: StyleDiagnostic[]) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [css, setCss] = useState('');
  const compiler = useRef<TailwindCompiler | null>(null);
  useLayoutEffect(() => { if (host.current) setRoot(host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' })); }, []);
  useEffect(() => {
    let active = true;
    compiler.current ??= new TailwindCompiler();
    const nodes = inspectPage(props.page, true).nodes;
    const classes = [...nodes.values()].map(node => node.element.props.className ?? '');
    classes.push('rounded-full');
    if (props.draft) classes.push(props.draft.element.props.className ?? '');
    if (props.preview) {
      const patches = 'get' in props.preview ? props.preview : new Map([[props.preview.id, props.preview.styles]]);
      for (const [id, patch] of patches) { const node = nodes.get(id); if (node) classes.push(patchClassNames(node.element.props.className ?? '', patch)); }
    }
    void compiler.current.build(classes).then(result => {
      if (active) { setCss(result.css); props.onDiagnostics?.(result.diagnostics); }
    }).catch(error => { if (active) props.onDiagnostics?.([{ candidate: '', message: `样式编译失败：${String(error)}` }]); });
    return () => { active = false; };
  }, [props.page, props.preview, props.draft, props.onDiagnostics]);
  useLayoutEffect(() => { if (css) props.onReady?.(); }, [css, props.page, props.preview, props.onReady]);
  const resolvedCss = css.replace(/url\((['"]?)(assets\/[^)'"\s]+)\1\)/g, (_, _quote: string, path: string) => `url("${props.assetUrls?.[path] ?? 'data:,'}")`);
  return <div ref={host} data-shadow-canvas="">{root && createPortal(<>
    <style>{designPixelCss(resolvedCss)}</style>
    <style>{`:host { display:block; font:16px/1.5 system-ui,sans-serif; color:#111; } [data-page-origin] { position:relative; width:0; height:0; } [data-coordinate-probe] { position:absolute; left:0; top:0; width:100px; height:100px; visibility:hidden; pointer-events:none; } @layer base { [data-design-kind="Group"], [data-design-kind="Frame"] { position:relative; } [data-design-kind="Text"] { white-space:pre-wrap; } } [data-design-locked] { pointer-events:none; }`}</style>
    <span data-coordinate-probe="" aria-hidden="true" />
    <PageRenderer {...props} />
  </>, root)}</div>;
}
