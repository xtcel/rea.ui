## Why

设计系统页的「导入 DESIGN.md / CSS」入口直接调用 `importDesignMarkdown()`，而它只接受以 `---` 开头的 frontmatter 契约。用户手上更常见的 DESIGN.md 是散文型风格规范（配色表、字号、CSS 片段、Agent Prompt Guide），选中后必然抛 `DS_MD_INVALID`「需要以 --- 开头的 frontmatter」。同一份文件如果从底部输入框的「＋」加入参考文件，却能正常由 Agent 提取——真正的通道藏在角落，导入入口反而成了报错入口。

这不是解析器缺陷：`design-md-bridge` 明确规定 frontmatter 是机器层、正文不参与解析，以保证往返稳定。问题在入口语义——它把「喂给 Agent 的素材」误当成「已经符合契约的包」。

## What Changes

- 「导入 DESIGN.md / CSS」入口选中的文件**不再在文件选择阶段解析，也不自动发送**：文件挂到输入框的参考附件，同时预填一条提取指令，由用户确认或修改后自己发送。散文型与契约型 DESIGN.md 走同一条路，不再有格式报错。
- 预填的指令要求优先沿用文件里的颜色、排版、圆角与组件规范；发送后仍由 `attachmentContext()` 把全文拼进提示词，按 `systemSchema` 产出整套系统。
- 输入框已有内容时不覆盖，只挂附件，避免导入打断正在写的需求。
- 入口 hint 从「既有规范直接变成可编辑的令牌」改为「作为参考资料，由 Agent 提取成令牌」，让预期与行为一致。
- 底部「附加参考文件」入口保持不变，仍是「只挂文件、自己写需求」的细粒度路径。
- `importDesignMarkdown()` / `exportDesignMarkdown()` 的库能力与往返测试保留，CLI 与测试继续使用；从 UI 撤出的是「静默解析」，不是解析能力。

## Capabilities

### New Capabilities

- `design-system-import-entry`：设计系统页导入入口的语义——选中即加入会话参考、由 Agent 提取，而不是在入口处做格式校验。

### Modified Capabilities

无。`design-md-bridge` 的导出、导入与往返要求不变；本变更只改 UI 入口如何抵达这些能力。

## Impact

`packages/editor/src/agent/DesignSystemPage.tsx`（`handleImport`、入口 hint、移除 `importMarkdown` 与未使用的 `importDesignMarkdown` / `upgradeTokens` 引用）、`docs/home-ui.md`、`docs/architecture.md`、`docs/verification.md`、`docs/agent-protocol.md`。库层与存储层无改动。

## 范围说明

不做：Agent 提取结果写回原文件；为 CSS / `tokens.json` 增加专用解析器；保留「选择阶段先探测 frontmatter、契约文件直接导入」的双分支（探测仍会让用户面对两种未知行为）；在会话里展示附件全文预览。`importDesignMarkdown()` 仍是库层 API，不因 UI 调整而删除。
