import { expandPath, inspectPage, pathContours } from '@rea/design';
import type { IndexedNode, InspectedPage, PathContour, VectorProps } from '@rea/design';
import { COMPONENT_FILE, componentEditor } from '@rea/document';
import type { DocumentSession } from '@rea/document';

export interface EditabilityIssue {
  code: string;
  severity: 'warning';
  path: string;
  node: string;
  message: string;
  hint: string;
}

const containers = new Set(['Frame', 'Group']);
const genericName = /^(?:frame|group|rect|text|vector|layer|路径|图层|矩形|分组|文本|画板)(?:[\s_-]*\d+)?$/i;

const bounds = (contour: PathContour) => {
  const xs = contour.anchors.flatMap(a => [a.x, a.x + (a.in?.[0] ?? 0), a.x + (a.out?.[0] ?? 0)]);
  const ys = contour.anchors.flatMap(a => [a.y, a.y + (a.in?.[1] ?? 0), a.y + (a.out?.[1] ?? 0)]);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
};

export function auditEditability(session: DocumentSession): EditabilityIssue[] {
  const issues: EditabilityIssue[] = [];
  function scan(page: InspectedPage, file: string, excluded = new Set<string>()) {
    const add = (node: IndexedNode, code: string, message: string, hint: string) => issues.push({ code, severity: 'warning', path: file, node: node.id, message, hint });
    const fingerprints = new Map<string, { signature: string; count: number; text: boolean }>();
    function fingerprint(node: IndexedNode): { signature: string; count: number; text: boolean } {
      const cached = fingerprints.get(node.id); if (cached) return cached;
      const children = node.children.map(id => fingerprint(page.nodes.get(id)!));
      const result = { signature: `${node.kind}(${children.map(c => c.signature).join(',')})`, count: 1 + children.reduce((n,c) => n+c.count, 0), text: node.kind === 'Text' || children.some(c => c.text) };
      fingerprints.set(node.id, result); return result;
    }
    for (const node of page.nodes.values()) {
      if (excluded.has(node.id)) continue;
      const props = node.element.props;
      if (!props.name?.trim() || props.name === node.id || genericName.test(props.name.trim())) add(node, 'EDIT_NAME', '图层缺少业务名称或使用通用名称。', '使用“侧边栏”“搜索图标”“实验记录行”等名称，便于在图层树中定位。');
      const children = node.children.map(id => page.nodes.get(id)!).filter(c => !c.hidden);
      if (containers.has(node.kind)) {
        const leaves = children.filter(c => !c.children.length && c.kind !== 'Instance');
        if (leaves.length >= 12 && leaves.length / children.length >= .8) add(node, 'EDIT_FLAT_HIERARCHY', `疑似布局平铺：${leaves.length} 个叶节点直接放在同一容器下。`, '按侧栏、顶部栏、卡片和记录行建立命名 Frame/Group，使用局部坐标；不要为图层预算合并业务内容。');
      }
      const repeated = new Map<string, IndexedNode[]>();
      for (const child of children) {
        if (!containers.has(child.kind)) continue;
        const f = fingerprint(child);
        if (f.count < 3 || !f.text || child.children.length < 2) continue;
        repeated.set(f.signature, [...(repeated.get(f.signature) ?? []), child]);
      }
      for (const matches of repeated.values()) if (matches.length >= 2) add(matches[0], 'EDIT_REPEATED_STRUCTURE', `疑似重复结构（${matches.length} 处）：${matches.map(n => n.id).join('、')}。`, '评估提取 Component/Instance；文字用参数，状态用变体。该检查只比较结构，需人工判断语义。');
      if (node.kind === 'Vector') {
        try {
          const vector = props as VectorProps, path = vector.path ?? expandPath(vector.d ?? '');
          const boxes = pathContours(path).map(bounds);
          // Separate islands much farther apart than their own sizes suggest unrelated icons.
          // Check sorted neighbours, avoiding quadratic work on large compound SVGs.
          let separated = false;
          for (const axis of ['left', 'top'] as const) {
            const sorted = [...boxes].sort((a,b) => a[axis]-b[axis]);
            for (let i=1; i<sorted.length; i++) {
              const a=sorted[i-1],b=sorted[i], size=Math.max(a.right-a.left,a.bottom-a.top,b.right-b.left,b.bottom-b.top,1);
              const gap=Math.hypot(Math.max(0,b.left-a.right,a.left-b.right),Math.max(0,b.top-a.bottom,a.top-b.bottom));
              if (gap > Math.max(32, size*4)) { separated = true; break; }
            }
            if (separated) break;
          }
          if (separated) add(node, 'EDIT_MERGED_VECTOR', '疑似跨区域合并路径：轮廓间距远大于各自尺寸。', '一个业务图标使用独立容器和局部 viewBox；镂空图标的内外轮廓仍需保留在同一 Vector。');
        } catch (error) {
          add(node, 'EDIT_PATH_UNEDITABLE', `路径无法转换为锚点：${error instanceof Error ? error.message : String(error)}`, '修复 SVG 路径或改为受支持的结构化 path；不要将原始 d 的可渲染性等同于锚点可编辑性。');
        }
      }
    }
  }
  for (const { id, file } of session.manifest.pages) scan(inspectPage(session.pages.get(id)!.source), file);
  for (const definition of session.components.values()) {
    const parsed = componentEditor(definition);
    scan(parsed.page, COMPONENT_FILE, new Set(['component-editor-root','component-editor-surface']));
  }
  return issues;
}
