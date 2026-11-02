import { parse } from '@babel/parser';
import type * as T from '@babel/types';
import { patchClassNames } from '@rea/tailwind';
import type { PropertyGroupKey } from '@rea/tailwind';
import { createManifest, parsePage } from '@rea/document';
import type { DocumentRecord } from './idb';

interface V1Viewport {
  id: string;
  name?: string;
  width: number;
  height: number;
}

export function styleToTailwindClasses(styleObj: Record<string, any>): string[] {
  const classes: string[] = [];
  const patches: Partial<Record<PropertyGroupKey, any>> = {};

  for (const [key, val] of Object.entries(styleObj)) {
    if (val === undefined || val === null) continue;

    if (key === 'background' || key === 'backgroundColor') {
      patches.bg = String(val);
    } else if (key === 'color') {
      patches['text-color'] = String(val);
    } else if (key === 'fontSize') {
      patches['text-size'] = Number(val);
    } else if (key === 'borderRadius') {
      patches.rounded = Number(val);
    } else if (key === 'opacity') {
      patches.opacity = Number(val);
    } else if (key === 'fontWeight') {
      const weightMap: Record<string, string> = {
        '400': 'font-normal',
        '500': 'font-medium',
        '600': 'font-semibold',
        '700': 'font-bold',
        '800': 'font-extrabold',
      };
      const w = weightMap[String(val)] || `font-[${val}]`;
      classes.push(w);
    } else {
      // Arbitrary CSS property: [key:value]
      const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      classes.push(`[${kebabKey}:${val}]`);
    }
  }

  let patched = '';
  if (Object.keys(patches).length > 0) {
    patched = patchClassNames('', patches);
  }

  const all = [patched, ...classes].filter(Boolean).join(' ');
  return all.split(/\s+/).filter(Boolean);
}

function convertV1Node(node: T.JSXElement, idMap: Map<string, string>): string {
  const name = (node.openingElement.name as T.JSXIdentifier).name;
  const rawProps: Record<string, any> = {};

  for (const attr of node.openingElement.attributes) {
    if (attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier') {
      const k = attr.name.name;
      const v = attr.value;
      if (v == null) rawProps[k] = true;
      else if (v.type === 'StringLiteral') rawProps[k] = v.value;
      else if (v.type === 'JSXExpressionContainer') {
        if (v.expression.type === 'NumericLiteral' || v.expression.type === 'StringLiteral' || v.expression.type === 'BooleanLiteral') {
          rawProps[k] = v.expression.value;
        } else if (v.expression.type === 'ObjectExpression') {
          const obj: Record<string, any> = {};
          for (const prop of v.expression.properties) {
            if (prop.type === 'ObjectProperty') {
              const propKey = prop.key.type === 'Identifier' ? prop.key.name : (prop.key as any).value;
              if (prop.value.type === 'StringLiteral' || prop.value.type === 'NumericLiteral') {
                obj[propKey] = prop.value.value;
              }
            }
          }
          rawProps[k] = obj;
        }
      }
    }
  }

  let kind = name;
  const isRect = rawProps['data-shape'] === 'rectangle';
  const isEllipse = rawProps['data-shape'] === 'ellipse';

  if (isRect) kind = 'Rect';
  else if (isEllipse) kind = 'Ellipse';

  const oldId = rawProps.designId;
  const newId = oldId && idMap.has(oldId) ? idMap.get(oldId)! : oldId;

  // Convert styles & positioning to className
  const classList: string[] = [];
  if (rawProps.className) classList.push(rawProps.className);

  if (rawProps.position === 'absolute') {
    classList.push('absolute');
    const x = rawProps.x ?? 0;
    const y = rawProps.y ?? 0;
    classList.push(patchClassNames('', { left: x, top: y }));
  }

  if (rawProps.width !== undefined) {
    classList.push(patchClassNames('', { width: rawProps.width }));
  }
  if (rawProps.height !== undefined) {
    classList.push(patchClassNames('', { height: rawProps.height }));
  }

  if (rawProps.layout === 'flex') classList.push('flex');
  if (rawProps.direction === 'column') classList.push('flex-col');
  if (rawProps.gap !== undefined) classList.push(`gap-[${rawProps.gap}px]`);
  if (rawProps.padding !== undefined) classList.push(patchClassNames('', { padding: rawProps.padding }));

  if (rawProps.fill && isEllipse) {
    classList.push(patchClassNames('', { bg: rawProps.fill }));
  }

  if (rawProps.style && typeof rawProps.style === 'object') {
    classList.push(...styleToTailwindClasses(rawProps.style));
  }

  const finalClassName = classList.filter(Boolean).join(' ').trim();
  const attrStrings: string[] = [];
  if (newId) attrStrings.push(`designId="${newId}"`);
  if (rawProps.name) attrStrings.push(`name="${rawProps.name}"`);
  if (finalClassName) attrStrings.push(`className="${finalClassName}"`);
  if (kind === 'Vector') {
    if (rawProps.d) attrStrings.push(`d="${rawProps.d}"`);
    if (rawProps.viewBox) attrStrings.push(`viewBox="${rawProps.viewBox}"`);
  }

  // Children
  const childrenCode: string[] = [];
  for (const child of node.children) {
    if (child.type === 'JSXElement') {
      childrenCode.push(convertV1Node(child, idMap));
    } else if (child.type === 'JSXText' && child.value.trim()) {
      childrenCode.push(child.value.trim());
    } else if (child.type === 'JSXExpressionContainer' && child.expression.type === 'StringLiteral') {
      childrenCode.push(child.expression.value);
    }
  }

  if (childrenCode.length === 0) {
    return `<${kind} ${attrStrings.join(' ')} />`;
  }

  return `<${kind} ${attrStrings.join(' ')}>\n  ${childrenCode.join('\n  ')}\n</${kind}>`;
}

/**
 * Migrates a v1 TSX document string to a v2 DocumentRecord.
 */
export function migrateV1ToV2(v1Code: string): DocumentRecord {
  const ast = parse(v1Code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  let docName = '迁移设计';
  const pages: { id: string; name: string; viewports: V1Viewport[]; rootFrame?: T.JSXElement }[] = [];

  for (const statement of ast.program.body) {
    if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'JSXElement') {
      const root = statement.declaration;
      // DesignDocument
      for (const attr of root.openingElement.attributes) {
        if (attr.type === 'JSXAttribute' && attr.name.name === 'name' && attr.value?.type === 'StringLiteral') {
          docName = attr.value.value;
        }
      }

      for (const child of root.children) {
        if (child.type === 'JSXElement' && (child.openingElement.name as any).name === 'Page') {
          let pageId = 'main';
          let pageName = '页面';
          let viewports: V1Viewport[] = [];
          let rootFrame: T.JSXElement | undefined;

          for (const attr of child.openingElement.attributes) {
            if (attr.type === 'JSXAttribute') {
              const k = attr.name.name;
              if (k === 'id' && attr.value?.type === 'StringLiteral') pageId = attr.value.value;
              if (k === 'name' && attr.value?.type === 'StringLiteral') pageName = attr.value.value;
              if (k === 'viewports' && attr.value?.type === 'JSXExpressionContainer' && attr.value.expression.type === 'ArrayExpression') {
                for (const elem of attr.value.expression.elements) {
                  if (elem && elem.type === 'ObjectExpression') {
                    const vp: any = {};
                    for (const prop of elem.properties) {
                      if (prop.type === 'ObjectProperty') {
                        const pk = prop.key.type === 'Identifier' ? prop.key.name : (prop.key as any).value;
                        if (prop.value.type === 'StringLiteral' || prop.value.type === 'NumericLiteral') {
                          vp[pk] = prop.value.value;
                        }
                      }
                    }
                    if (vp.id && vp.width && vp.height) {
                      viewports.push(vp);
                    }
                  }
                }
              }
            }
          }

          for (const pageChild of child.children) {
            if (pageChild.type === 'JSXElement' && (pageChild.openingElement.name as any).name === 'Frame') {
              rootFrame = pageChild;
              break;
            }
          }

          if (viewports.length === 0) {
            viewports.push({ id: 'default', width: 960, height: 640 });
          }

          pages.push({ id: pageId, name: pageName, viewports, rootFrame });
        }
      }
    }
  }

  if (pages.length === 0) {
    throw new Error('未在代码中找到有效的 v1 Page 元素。');
  }

  const docId = `doc_${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date().toISOString();
  const manifest = createManifest(
    docId,
    docName,
    pages.map((p) => ({ id: p.id, file: `pages/${p.id}.page.tsx` })),
  );

  const files: Record<string, string> = {
    'rea.json': JSON.stringify(manifest, null, 2),
  };

  for (const p of pages) {
    let currentX = 0;
    const artboardFrames: string[] = [];

    p.viewports.forEach((vp, idx) => {
      const artboardId = `artboard-${idx + 1}`;
      const artboardName = vp.name || `画板 ${idx + 1}`;
      const artboardClass = `absolute left-[${currentX}px] top-0 w-[${vp.width}px] h-[${vp.height}px] bg-white overflow-hidden`;

      const idMap = new Map<string, string>();
      if (idx > 0 && p.rootFrame) {
        // Collect and regenerate all designIds for subsequent viewports
        const collectIds = (el: T.JSXElement) => {
          for (const attr of el.openingElement.attributes) {
            if (attr.type === 'JSXAttribute' && attr.name.name === 'designId' && attr.value?.type === 'StringLiteral') {
              const old = attr.value.value;
              idMap.set(old, `${old}-v${idx + 1}`);
            }
          }
          for (const c of el.children) {
            if (c.type === 'JSXElement') collectIds(c);
          }
        };
        collectIds(p.rootFrame);
      }

      let innerChildren = '';
      if (p.rootFrame) {
        const convertedChildren: string[] = [];
        for (const child of p.rootFrame.children) {
          if (child.type === 'JSXElement') {
            convertedChildren.push(convertV1Node(child, idMap));
          }
        }
        innerChildren = convertedChildren.join('\n    ');
      }

      const frameCode = `<Frame designId="${artboardId}" name="${artboardName}" className="${artboardClass}">\n    ${innerChildren}\n  </Frame>`;
      artboardFrames.push(frameCode);

      currentX += vp.width + 64; // Spacing 64 between artboards
    });

    const pageCode = `import { Page, Frame, Rect, Ellipse, Text, Vector, Image, Group } from '@rea/design';\n\nexport default (\n  <Page id="${p.id}" designId="page-${p.id}" name="${p.name}" className="bg-slate-100">\n  ${artboardFrames.join('\n\n  ')}\n  </Page>\n);\n`;

    // Validate that the migrated page passes v2 parser!
    parsePage(pageCode, `pages/${p.id}.page.tsx`);
    files[`pages/${p.id}.page.tsx`] = pageCode;
  }

  return {
    id: docId,
    name: docName,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    manifest,
    files,
  };
}
