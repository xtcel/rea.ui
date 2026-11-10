> 本变更把设计系统从「生成提示词里的 10 个字段」扩展为可表达语义层与排版阶梯的契约，并把「选择」提前到创建文档的那一刻。未勾选项表示尚未验证，不因自动检查通过而代签。

## 1. 令牌模型 v2（@rea/design-system）

- [x] 1.1 `SystemTypographyTokens` 改为 `{ family, roles }`，`body` 必需；`TypeToken` 增加可选 `letterSpacing` 与 `family`；保留 `SystemTypographyV1` 供 v1 校验
- [x] 1.2 颜色保留必需 6 色，新增 `CANONICAL_COLOR_ROLES` 与可选语义角色；v2 接受 `var(--rea-ds-color-*)` 别名，校验目标存在、禁止自引用与环（`resolveColor()` 最多 8 跳）
- [x] 1.3 `radius` 增加 `xl/full`；新增 `motion: { duration, easing }` 校验（0–2000ms、缓动白名单）
- [x] 1.4 `systemVariables()` 为每个角色输出 `--rea-ds-type-<role>-*`，`body/heading/caption` 追加 `--rea-ds-typography-*` 兼容别名；`motion` 输出 `--rea-ds-motion-*`
- [x] 1.5 `parseSystem()` 同时接受 v1 / v2；`upgradeSystem()` 显式迁移；`SYSTEM_SCHEMA_VERSION` 升为 2
- [x] 1.6 测试 `system.test.ts`：type ramp 变量、别名与环、动效越界、v1 包可读、扁平旧记录保持 v1 哈希

## 2. DESIGN.md 双向通道

- [x] 2.1 新增 `designMd.ts`：受约束的 YAML 子集解析 / 发射（映射、序列、块标量、引号键），不引入依赖
- [x] 2.2 `exportDesignMarkdown()`：frontmatter 承载完整契约（含 `guidelines`、组件 `description/states/variants`），正文按 8 个小节生成
- [x] 2.3 `importDesignMarkdown()`：解析 frontmatter，展开三位 hex、解析 px、补齐必需颜色与 `body`、映射自有圆角 / 间距命名、过滤非令牌样式并返回 warning
- [x] 2.4 测试 `designMd.test.ts`：导出→导入 hash 相同、二次导出字节一致、正文小节齐全、真实 `DESIGN.md` 可导入、缺少 frontmatter 报错

## 3. 记录与迁移（editor）

- [x] 3.1 `DesignSystem.tokens` 改为 v2；`resolvedTokens()` 归一化 v1 与扁平形状；`withTokens()` 从颜色派生 `color/colors`
- [x] 3.2 记录新增可选 `schemaVersion`；`legacySystemToPackage()` 仅在「有 revision/hash 且无 schemaVersion 2」时按 v1 形状重建
- [x] 3.3 `isTokens()` / `isSystems()` 接受 v2、v1 与扁平形状并校验值域
- [x] 3.4 测试 `designSystem.test.ts`：内置只读 v1、编辑后降级草稿、绑定标记只在固定时为真

## 4. 创建即固定（storage + editor）

- [x] 4.1 `ensureSystemVersion()`：按 `id + hash` 幂等注册，已有版本时复用，无版本时按声明 revision 或 1 写入
- [x] 4.2 `useDocument.create(name, system?)`：首次保存前提交 `systemTransaction`，同时写入系统快照、清单 v4 与 revision
- [x] 4.3 `HomeApp`：启动时注册内置系统的只读 v1；`systemVersion()` 对草稿先发布、对已发布先注册；提交需求与手动新建项目都固定
- [x] 4.4 测试 `storage/test/systems.test.ts`：重复注册不新增版本、固定后清单为 v4、已有版本时递增 revision

## 5. 生成与溯源（editor）

- [x] 5.1 新增 `AgentSystemInput { pkg, ref, bound }`；`agentSystem()` 与 `pinnedAgentSystem()` 统一构造
- [x] 5.2 `systemContext()` 按 `bound` 分支：已固定要求令牌引用与排版角色，未固定要求字面量并说明令牌仅供取值参考
- [x] 5.3 `DesignAgentPanel` 优先读取 `DocumentSession.system`，提示词与 `AgentTurn.system` 同源
- [x] 5.4 编辑器 composer 在文档已固定时显示只读「名称 · vN」，不再承担切换职责
- [x] 5.5 测试 `generation.test.ts`：已固定提示词含令牌规则、未固定提示词含「未固定设计系统」、`bound` 只在非草稿时为真

## 6. 作者面（SystemWorkbench）

- [x] 6.1 基础样式增加语义角色列表（添加候选来自 `CANONICAL_COLOR_ROLES`、颜色与 hex 编辑、移除）
- [x] 6.2 排版阶梯按角色编辑字号 / 行高 / 字重，`body` 不可删除，可添加推荐角色
- [x] 6.3 字体栈、四档圆角、动效时长可编辑；预览使用 `body` 字号与 `--ds-*` 变量
- [x] 6.4 头部增加「导入 DESIGN.md / 导出 DESIGN.md」；导入结果落到草稿并显示调整条数
- [x] 6.5 样式：`home.css` 增加语义角色行与排版阶梯行的紧凑网格

## 7. 校验与文档

- [x] 7.1 conformance 增加 Tailwind 调色板类（`bg-white`、`text-slate-500` 等）识别；对比度检查扩展到 `<role>Foreground` 与 `on<Role>` 约定对
- [x] 7.2 `docs/agent-protocol.md` 更新 §10：v2 令牌、别名、排版阶梯、动效、绑定与提示词分支
- [x] 7.3 `docs/architecture.md` 增加 v2 与「设计系统是文档属性」的边界说明
- [x] 7.4 `docs/verification.md` 记录本轮命令、结果与未覆盖项

## 8. 验证

- [x] 8.1 `pnpm typecheck` 通过
- [x] 8.2 `pnpm exec vitest run` 全量通过（546 → 新增后 560+，2 个真实 Agent 冒烟按环境跳过）
- [x] 8.3 `openspec validate align-design-system-with-design-md --strict` 通过
- [ ] 8.4 CDP + headless Chrome 真机复核：首页创建后菜单显示 vN、composer 只读、工作台语义角色 / 排版阶梯编辑生效、DESIGN.md 导入导出往返
- [x] 8.5 `pnpm build` 通过（含 wasm 与 web 构建）
