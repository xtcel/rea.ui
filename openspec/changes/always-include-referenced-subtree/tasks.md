## 1. 数据模型

- [x] 1.1 `AgentRef` 去掉 `subtree` 字段，注释改为「引用即整棵子树」
- [x] 1.2 `normalizeRef()` 不再读取 `subtree`，旧记录照常加载
- [x] 1.3 `AgentCanvasContext` 删除 `toggleSubtree()`；`EditorApp` 删除 `toggleAgentRefSubtree()`

## 2. 范围判定与提示词

- [x] 2.1 `classifyChanges()` 改为「节点本身或后代命中引用」即算范围内
- [x] 2.2 `changesToRefs()` 不再写 `subtree: false`
- [x] 2.3 `elementContext()` 的描述行不再输出「仅自身 / 含子级」
- [x] 2.4 `workspacePrompt()` / `apiWorkspacePrompt()` 的引用规则改为「只修改上面列出的节点及其子级」
- [x] 2.5 `DesignAgentPanel` 历史轮次的引用只显示名称

## 3. 界面

- [x] 3.1 `HomeComposer` 删除引用胶囊上的作用域按钮与 `onToggleElement`，悬停提示只保留名称
- [x] 3.2 删除 `refContainers` 与 `apps/web/src/home.css` 里的 `.chip-scope` 样式

## 4. 测试

- [x] 4.1 `context.test.ts`：引用容器的后代改动计入范围内，引用节点的同级改动算范围外
- [x] 4.2 `context.test.ts`：描述行断言去掉作用域标记，改为断言 `[1] 标题 · Text · designId=hero-title`
- [x] 4.3 `changesToRefs()` 断言不再包含 `subtree`

## 5. 文档与契约

- [x] 5.1 新增 `openspec/changes/always-include-referenced-subtree/` 变更
- [x] 5.2 更新 `docs/local-agent.md` 的「引用画布元素」一节

## 6. 验证

- [x] 6.1 `pnpm typecheck`
- [x] 6.2 `pnpm exec vitest run packages/editor/src/agent`
- [x] 6.3 全量 `vitest run`
- [x] 6.4 `pnpm build`
- [x] 6.5 `openspec validate always-include-referenced-subtree --strict`
- [x] 6.6 `git diff --check`
