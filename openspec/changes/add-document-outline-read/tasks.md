## 1. CLI：read 命令

- [x] 1.1 新增 `packages/reaui-cli/src/commands/read.ts`：`outlineOf()` 把 `InspectedPage` 转成画板 + 扁平节点列表，`runRead()` 负责装载、筛选、输出
- [x] 1.2 世界坐标 `boxOf()` 沿祖先链累加 `left`/`top`，整条链非 `absolute` 或存在相对尺寸时返回 `undefined` 并标 `flow: true`
- [x] 1.3 `args.ts` 把 `depth` 加入取值选项；`cli.ts` 注册 `read` 并补帮助与示例
- [x] 1.4 `packages/reaui-cli/test/read.test.ts`：层级与坐标累加、flex 节点不伪造坐标、`--depth` 裁剪、`--page` 过滤与缺失页报错

## 2. MCP：reaui_read

- [x] 2.1 `packages/reaui-mcp/src/tools.ts` 注册 `reaui_read`（`path` / `page?` / `depth?`），转发 `read --json` 并保留错误码
- [x] 2.2 `packages/reaui-mcp/test/read.test.ts`：一次端到端读取，校验画板、世界坐标与文案（预置文档，避免测试里反复跑创建流程）

## 3. 插件分发

- [x] 3.1 同步 `packages/{reaui-cli,reaui-mcp}/{bin,dist}` 到 `integrations/codex/reaui-designer/server/` 与 WorkBuddy 专家包 `server/`
- [x] 3.2 WorkBuddy 专家包新增根目录 `mcp.json`（stdio，`${PLUGIN_ROOT}/server/reaui-mcp/bin/reaui-mcp.mjs`，`cwd` 同样是插件根——宿主缺省即如此，写出来是为了可预测），`plugin.json` 升到 1.2.0
- [x] 3.3 专家包 `SKILL.md` 增加「读取现有文档」与「MCP（可选路径）」两节；`agents/reaui-designer.md` 的增量修改流程补 `read`

## 4. 文档

- [x] 4.1 Codex 插件 `references/cli.md` 增加 `read` 小节（输出形态、坐标语义、深度收窄、为什么不读预览）
- [x] 4.2 Codex 插件 `references/mcp.md` 工具表补齐 13 个（原先只列 8 个，缺 `get_system` / `set_system` / `init_components` / `read` / `create_design` 之外的三项与实际不符处一并修正）
- [x] 4.3 Codex `SKILL.md` §7 改掉「MCP 没有设计系统操作」的失效说明，§9 改稿流程补 `reaui read`
- [x] 4.4 `packages/reaui-cli/README{,.zh-CN}.md` 命令表补 `read`

## 5. 验证

- [x] 5.1 `pnpm typecheck` 通过
- [x] 5.2 `npx vitest run packages/reaui-cli/test/read.test.ts packages/reaui-mcp/test/read.test.ts` 通过
- [x] 5.3 `pnpm build:cli` / `pnpm build:mcp` 后，用 stdio 实测 `tools/list` 返回 13 个工具、`reaui_read` 能读出画板与坐标
- [x] 5.4 全量 `vitest run`：76 个文件 72 通过 / 2 跳过 / 2 失败；失败项是既有的 `systemMenu.test.ts`（颜色大小写）与 `systems.test.ts`（并发超时，单跑 52s 全过），本变更的测试在迭代中由并行超时降为 0（预置文档 + 单次调用）
- [x] 5.5 `openspec validate add-document-outline-read --strict` 通过
