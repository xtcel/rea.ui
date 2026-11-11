> 本变更只调整设计系统页导入入口的到达方式：文件一律作为会话参考交给 Agent，库层解析器保持可用。未勾选项表示尚未验证，不因自动检查通过而代签。

## 1. 入口行为（@rea/editor）

- [x] 1.1 `DesignSystemPage.handleImport()` 把文件挂到 `attachments` 并预填 `importPrompt(file.name)`，不调用 `send()`，也不调用 `importDesignMarkdown()`
- [x] 1.2 `importPrompt` 精简为一句：优先沿用文件里的颜色、排版、圆角与组件规范
- [x] 1.3 预填后聚焦输入框并把光标放到末尾，用户可直接 Enter 或先修改
- [x] 1.4 输入框已有内容时不覆盖，只追加附件
- [x] 1.5 生成进行中选中文件时给出「正在生成，稍后再导入。」，不静默丢弃
- [x] 1.6 删除不再使用的 `importMarkdown()` 与 `importDesignMarkdown` / `upgradeTokens` 引用
- [x] 1.7 创建引导卡 hint 改为「作为参考资料，由 Agent 提取成令牌」

## 2. 回归

- [x] 2.1 `pnpm typecheck` 通过（`noUnusedLocals` 下无残留引用）
- [x] 2.2 `vitest run` 全量通过，`designMd.test.ts` 的往返与无 frontmatter 用例保持原样
- [x] 2.3 `pnpm build` 通过
- [x] 2.4 `node scripts/verify-design-system-import-entry.mjs` 真机复核 8 项通过：散文型 DESIGN.md 不报错、附件挂到输入框、指令预填且未产生轮次、点击发送后文件随指令一起提交、生成中再次选择文件给出提示

本次未新增 vitest 用例：改动位于组件内的事件处理，`packages/editor/test` 目前只有静态渲染与文档级测试，没有交互测试基础设施；行为由新增的 CDP 脚本覆盖，库层行为由既有 `designMd.test.ts` 守护。

## 3. 文档与规范

- [x] 3.1 `docs/home-ui.md` 更新导入入口语义
- [x] 3.2 `docs/architecture.md` 与 `docs/agent-protocol.md` 说明「UI 入口走会话、库函数保留解析」
- [x] 3.3 `docs/verification.md` 记录命令、结果与未覆盖项
- [x] 3.4 `openspec validate route-design-md-import-through-chat --strict` 通过
