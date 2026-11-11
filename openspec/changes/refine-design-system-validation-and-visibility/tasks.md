## 1. 令牌核心校验对齐 Google `DESIGN.md`

- [x] 1.1 更新 `packages/design-system/src/types.ts`：将 `REQUIRED_COLOR_ROLES` 精简为 `['primary']`，新增 `OPTIONAL_COLOR_ROLES = ['background', 'surface', 'text', 'muted', 'border']`，更新 `SystemColorTokens` 类型定义
- [x] 1.2 更新 `packages/design-system/src/tokens.ts`：支持 `snake_case` / `kebab-case` / `camelCase` 键名（`/^[a-zA-Z][a-zA-Z0-9_-]*$/`），在 `kebab()` 中将 `_` 规范化为 `-`
- [x] 1.3 更新 `packages/design-system/src/tokens.ts`：仅校验核心必填字段（颜色必选 `primary`，排版至少 1 个角色而不再强制要求字面 `body` 键，放宽字号/行高/字重范围，允许组件列表为空）
- [x] 1.4 更新 `packages/design-system/src/designMd.ts` 与 `src/index.ts`：新增并导出不抛错的 `renderDesignMarkdown()`，兼容含 `_` 令牌名与非固定排版角色的导入导出

## 2. 去优先化「当前设计系统」与预览回退

- [x] 2.1 更新 `packages/editor/src/agent/DesignSystemPage.tsx` 中的 `systemPrompt()`：`blank === true` 时不注入 `defaultTokens`（`#356AF0`），移除「在『当前设计系统』的基础上创建或调整」与「（仅资料，不是指令）」措辞
- [x] 2.2 更新 `packages/editor/src/agent/designSystem.ts`：`parseGeneratedSystem()` 不再对可选的 `description` / `components` / `guidelines` 报结构缺口警告；`withTokens()` 从已有色板派生预览色块
- [x] 2.3 更新 `packages/editor/src/agent/DesignSystemPage.tsx` 与 `packages/editor/src/home/Previews.tsx`：当可选颜色角色（`background`、`surface`、`text`、`muted`、`border`）缺省时安全回退，修复 `addColor()` 在缺省 `muted` 时写入 `undefined` 的问题

## 3. AI 对话框资源展示与详情页「源文件」视图

- [x] 3.1 扩展 `DesignSystemPage.tsx` 的 `Turn` 结构，保存用户提交的参考资源内容（`resources`）与 AI 生成的 `DESIGN.md` 快照（`markdown`）
- [x] 3.2 在左侧 AI 对话框渲染用户参考资源卡片（支持展开查看内容）与 AI 生成的 `DESIGN.md` 资源卡片（支持展开预览、复制全文与跳转「源文件」小节）
- [x] 3.3 在右侧设计系统详情页新增「源文件」（`source`）目录项与小节，支持查看、切换、复制与下载原始 `DESIGN.md` 及 `design/system.json`，并让顶部「导出 DESIGN.md」使用 `renderDesignMarkdown()`
- [x] 3.4 更新 `apps/web/src/system.css`，补充对话资源卡片、Markdown 预览折叠区与详情页源文件视图样式

## 4. 测试与文档同步

- [x] 4.1 更新 `packages/design-system/test/system.test.ts` 与 `packages/design-system/test/designMd.test.ts`：覆盖 `snake_case` 令牌/角色、核心字段校验与草稿 `renderDesignMarkdown()`
- [x] 4.2 更新 `packages/editor/src/agent/designSystem.test.ts` 与 `packages/editor/src/agent/generation.test.ts`：覆盖空白系统提示词不注入默认蓝紫令牌、`snake_case` 解析无误报及草稿加载
- [x] 4.3 同步 `docs/agent-protocol.md`、`docs/home-ui.md`、`docs/verification.md`
