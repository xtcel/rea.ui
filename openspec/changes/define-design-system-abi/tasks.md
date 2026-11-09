> 本变更把设计系统从「提示词载荷」收敛为可版本化、可固定、可校验的契约。任务按依赖顺序排列：1 契约包 → 2 文档绑定 → 3 渲染导出 → 4 发布固定 → 5 生成溯源 → 6 CLI → 7 协议文档 → 8 验证。未勾选项表示尚未实现，不因自动检查通过而代签。
>
> 2026-11-09 实施进度：39 项全部完成。契约包、文档 v4 / 快照 / 事务、Token 引用渲染与预览、storage 版本库、CLI conformance、生成溯源与协议文档、编辑器内的发布 / 固定 / 升级界面、缩放复核均已完成并留证。

## 1. 契约包（@rea/design-system）

- [x] 1.1 新建 `packages/design-system`（`package.json`、`src/index.ts`），导出包类型、解析 / 序列化 / hash / 变量派生 / 校验函数；不依赖 React、DOM 与 `@rea/*` 其它包
- [x] 1.2 实现 `parseSystem()` / `serializeSystem()` / `systemHash()`：键排序且无空白的规范化、`schemaVersion` 门禁（>1 拒绝、<1 迁移）、未知顶层字段保留
- [x] 1.3 实现令牌模型 v1 校验与 `systemVariables()` / `cssVariables()`：颜色六位 hex、字号 / 行高 / 字重值域、`space.scale` 升序去重、`radius`、`shadow` 注入字符黑名单，以及 `--rea-ds-*` 派生名的冲突检测
- [x] 1.4 实现组件条目校验：`key` 规范与唯一、`tokens` 槽位白名单与点分令牌引用、`states` 必含 `default`、`variants` 唯一
- [x] 1.5 实现 `legacySystemToPackage()`：把 `localStorage` 旧形状迁移为 `revision: 1` 的包，只补必需字段（可选色与 shadow 不臆造）且不改原颜色；失败返回可读原因
- [x] 1.6 测试 `packages/design-system/test/system.test.ts`：往返字节稳定、固定样例 hash 快照、未知字段保留、未来版本拒绝、非法颜色、变量名冲突、阴影注入、组件 key / 引用非法、迁移成功与失败

## 2. 文档绑定与事务（document）

- [x] 2.1 `packages/document/src/manifest.ts` 增加 `SYSTEM_FILE = 'design/system.json'` 并从入口导出；`parseManifest()` 接受 `version: 2 | 3 | 4`，v4 仍校验原有字段
- [x] 2.2 `DocumentSession` 构造时解析系统快照，暴露只读 `session.system`；清单 v2 / v3 出现系统文件时报 `DS_REQUIRES_V4`，v4 无系统文件保持合法
- [x] 2.3 新增 `SourceOperation{ type: 'system'; source: string | null }`：写入或删除 `design/system.json`，固定时同事务把清单升到 v4；取消固定前检查页面与组件目录的 `var(--rea-ds-*)` 引用并拒绝
- [x] 2.4 测试 `packages/document/src/system.test.ts`：v4 解析、v3 + 系统文件拒绝、固定 / 撤销 / 取消固定保护、撤销后页面源码逐字节不变

## 3. 引用语法、渲染与导出

- [x] 3.1 `packages/tailwind` 候选过滤放行 `var(--rea-ds-*)`、`text-[length:var(--rea-ds-*)]`、`leading-[var(--rea-ds-*)]`、`font-[number:var(--rea-ds-*)]`；继续拒绝其它 `var()`、`calc()`、`env()`
- [x] 3.2 新增 `extractTokenRefs()`（放 `@rea/design-system` 或 `@rea/tailwind`，只保留一份）：从 className 提取变量名与节点 / 文件位置，供文档校验、属性面板与 conformance 共用
- [x] 3.3 `packages/renderer-dom/src/ShadowCanvas.tsx` 接收固定系统并输出 `:host { --rea-ds-*: … }` 样式；无系统时不输出任何变量；不修改 `:host` 原有字体与颜色基线
- [x] 3.4 `reaui preview` 与页面 HTML 导出在 `:root` 输出同一组变量，复用 `systemCssVariables()`，不另写映射
- [x] 3.5 测试：Tailwind 放行 / 拒绝用例（`tailwind.test.ts`）；`extractTokenRefs()` 的节点定位与变量派生（`system.test.ts`）；`:host` 变量由 8.3 的 CDP 脚本读 `getComputedStyle` 验证；`preview` 的 `:root` 变量与画布同源由 `packages/reaui-cli/test/system.test.ts` 断言（有系统时写入、无系统时省略）

## 4. 发布、固定与升级

- [x] 4.1 `packages/storage` 增加 `design-system-versions` 注册表、`publishSystem()`（校验 → hash → 相同内容拒绝 → revision 递增）与 `systemVersions()`
- [x] 4.2 实现 `pinSystem()` 与 `previewSystemUpdate()`：试提交暴露冲突、返回令牌与组件条目的增删改、冲突整体拒绝
- [x] 4.3 `SystemWorkbench` 增加「发布版本」与版本列表（revision / hash 前缀 / 日期 / 当前标记），区分「未发布 / 已发布 vN / 未启用」，沿用现有确认与错误提示样式
- [x] 4.4 编辑器新增「设计系统」对话框：固定到当前文档、升级预览（令牌与组件条目增删改 + 冲突拒绝）、切换回旧版本、取消固定，全部走 `model.transact` 单事务可撤销；首页与编辑器共用同一版本来源（`design-system-versions`），内置系统以只读 `revision: 1` 参与解析，修改后保存为独立副本，发布后改令牌因 hash 不匹配自动降级为草稿
- [x] 4.5 测试：发布、重复发布、revision 递增、升级预览不写文档、冲突拒绝、pin 后清单为 v4、内置系统只读。**已覆盖**：`packages/storage/test/systems.test.ts`（含 `systemTransaction` / `unpinTransaction` 与 `previewSystemUpdate().transaction`）、`packages/editor/src/agent/designSystem.test.ts`（内置 v1、草稿、hash 失效、持久化字段校验）；对话框交互由 8.3 的 CDP 脚本覆盖

## 5. 生成与溯源（editor）

- [x] 5.1 `packages/editor/src/agent/sessions.ts` 增加可选 `AgentTurn.system = { id, revision: number | null, hash, draft }`；非法值丢弃字段、保留 turn，旧数据保持 `undefined`
- [x] 5.2 `generation.ts` 的 `uiPrompt()` / `workspacePrompt()` / `apiWorkspacePrompt()` 改用包快照的稳定 JSON，加入三条令牌规则，移除 `resolvedSystem()` 的隐含默认值注入
- [x] 5.3 `DesignRequest` 与 `DesignAgentPanel` 传递已发布（或草稿）版本信息，并在 turn 中写入 `system`
- [x] 5.4 测试 `generation.test.ts` / `sessions.test.ts`：提示词含令牌与组件 JSON、无未声明默认值、turn 记录正确、旧会话兼容

## 6. CLI conformance（reaui-cli）

- [x] 6.1 `args.ts` 增加 `--system`（取值）与 `--strict`（布尔），未知组合仍报用法错误
- [x] 6.2 实现 `conformance()`：error / warning 分级、10 个错误码、字面量颜色、非刻度间距 / 圆角 / 字号、对比度计算与最接近令牌建议
- [x] 6.3 `validate` 始终检查固定快照；`--system` 时比对 `id / hash`；JSON 输出扩展为 `{ ok, document, pages, system, issues[], warnings[] }`，退出码 0 / 1 / 2
- [x] 6.4 `pack` 在存在 warning 时要求 `--force`，系统文件非法时直接失败；`preview` 复用固定快照
- [x] 6.5 测试 `packages/reaui-cli/test/`：未声明令牌退出 1、字面量退出 0、`--strict` 退出 1、`--system` 不匹配、v2 文档通过、`pack` 的 `--force` 行为

## 7. 协议与文档

- [x] 7.1 `docs/agent-protocol.md` 新增设计系统包与令牌命名空间章节，声明 `core` / `full` profile，修正 `Image`、组件高级字段与原语清单与实现不一致的表述
- [x] 7.2 `docs/file-format.md` 增加 `design/system.json`、清单 v4、导入导出与容错规则
- [x] 7.3 `docs/architecture.md` 与 `docs/local-agent.md` 记录快照、事务、溯源与 conformance 的边界
- [x] 7.4 `README.md` / `README.zh-CN.md` 更新设计系统能力与路线图（移除已完成的「设计系统转换器」表述，或改为指向本变更）
- [x] 7.5 `DESIGN.md` 明确 `--rea-*`（外壳）与 `--rea-ds-*`（文档）互不覆盖

## 8. 验证

- [x] 8.1 运行 `pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm test:rust`（不改 Rust，仅回归），修复全部失败。**结果**：485 通过 / 2 跳过（60 文件），typecheck、build、cargo 均通过
- [x] 8.2 运行 `openspec validate define-design-system-abi --strict` 并保证通过
- [x] 8.3 CDP + headless Chrome 真机复核：`scripts/verify-design-system-pin.mjs` 24 项全部通过——内置系统复制并发布 v1（记录落到 `revision` / `hash`）、版本列表标出当前、演示文档初始不注入变量、主菜单入口、未固定列表、固定前的变更预览（30 条令牌）、固定后 `:host` 变量（颜色与圆角）、外壳令牌不受影响、刷新后快照仍在且菜单显示 `v1`、改色发布 v2 后升级预览只有 1 条变更、升级后画布取到新值、取消固定后变量消失且刷新仍为空
- [x] 8.5 缩放手势复核：50% / 200% 缩放下令牌引用与像素值不发生错位。**结果**：`scripts/verify-design-system-zoom.mjs` 26 项全部通过——发布并固定 v1 后把演示页换成引用 `var(--rea-ds-*)` 的样例，100% / 50% / 200% 三档下令牌色块与字面量对照块的缩放比一致（1.0000 / 0.5000 / 2.0000，误差 <1%）、与缩放标签一致（<2%）、块间距按比例（16 / 8 / 32px）、计算值始终未缩放（圆角 8px、内边距 24px、主色 `rgb(53,106,240)`），标题 30px / 38.1px / 500；同一文档 `reaui validate` 通过且读到 `source: pinned` 的 v1 快照，`reaui preview` 的 `:root` 与画布同值并自行编译出 `background-color: var(--rea-ds-color-primary)`。**同时修掉一个真实缺陷**：长度类令牌原先序列化为无单位数字（`--rea-ds-radius-md:8`），CSS 判定非法导致圆角/间距/字号全部回退为 `0`/默认值；现按 CSS 语义输出 `8px` / `24px` / `30px`，行高 1–3 保持无单位倍数、8–96 输出 px
- [x] 8.4 在 `docs/verification.md` 记录本轮结论、未覆盖项（如 WebKit 真机、超大文档性能）与复测命令
