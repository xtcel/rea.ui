## 1. 解析只做形状转换

- [x] 1.1 `parseGeneratedSystem()` 返回 `{ system, warnings }`，不再抛格式错误
- [x] 1.2 角色数组折回记录；对象形态继续接受
- [x] 1.3 只把缺失的令牌分组开成空容器，不填任何数值、不做别名映射、不排序刻度
- [x] 1.4 结构缺口（名称 / 组件 / 指南）与 `validateTokens()` 问题一并写入 `warnings`

## 2. 界面提示与闸门

- [x] 2.1 对话轮次列出全部问题，并声明「已按 AI 返回写入」
- [x] 2.2 顶部警告条汇总待修正数量（按消息去重后取前三条）
- [x] 2.3 左侧目录按 `SystemIssue.path` 标出受影响的小节
- [x] 2.4 有令牌问题时禁用「发布版本」与「用于 UI 生成」，并在调用入口给出原因
- [x] 2.5 `isSystems()` 放宽为记录外壳校验，允许不完整草稿在刷新后仍能加载

## 3. 验证

- [x] 3.1 `designSystem.test.ts`：原样保留缺字段 / 非法取值、组件为空不套默认、对象形态兼容
- [x] 3.2 `generation.test.ts`：不完整草稿可加载，非法令牌由 `validateTokens()` 拦截
- [x] 3.3 `pnpm typecheck`
- [x] 3.4 `pnpm test`
- [x] 3.5 `pnpm build`
- [x] 3.6 `openspec validate report-design-system-format-issues --strict`
- [x] 3.7 CDP 真机复核：注入不合规记录后刷新，三层警告齐备、发布与启用禁用、就地修改后计数下降

## 4. 文档

- [x] 4.1 同步 `docs/architecture.md`、`docs/agent-protocol.md`、`docs/verification.md`
- [x] 4.2 更新项目记忆
