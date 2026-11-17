# ReaUI Designer：ChatGPT 公开上架准备

当前结果为 **0.3.1 提交草稿**，未上传、未提交审核、未发布。
保持原有 `reaui-designer` 身份及桌面本地 MCP，未创建重复私人插件。

## 已确认的发布信息

- 个人身份发布；源码署名保留 xtcel，平台验证姓名待确认。
- 面向平台所有可用国家和地区：`publication.countries: []`。
- 免费、不涉及购买或支付：`review.commerce: false`。
- 支持邮箱：xtcelzhangyong@gmail.com。
- 设计文件完全本地处理，不上传到 ReaUI 服务器。
- 支持邮件仅用于求助处理，不共享；问题关闭后 90 天内删除，可申请提前删除。
- 沿用原有 512 × 512 PNG 图标；未添加可选深色图标或品牌色。

## 构建提交副本

在仓库根目录运行：

```sh
python3 scripts/package-chatgpt-plugin.py
```

脚本复制 `integrations/codex/reaui-designer`，叠加本目录的
`submission.json`，在独立临时目录中打包并重新解压检查。
原插件清单仍保留 0.3.0；公开提交副本使用 0.3.1。输出在：

- `dist/chatgpt/reaui-designer-0.3.1-submission-draft.zip`
- `dist/chatgpt/readiness.json`

`packageChecks: passed` 仅表示脚本覆盖的包结构、字段长度、图标及用例字段检查通过。
它不代替官方 schema 校验、门户扫描、桌面安装、真实对话测试或审核。
补齐网址等材料后仍需逐项验证并更新状态，不能仅凭 ZIP 已生成就提交。

## 公开页面

四个页面已发布到公开仓库，提交为
[`14b4cb4`](https://github.com/xtcel/rea.ui/commit/14b4cb4f1931c70ba930888038a51cb214ef609d)。
已通过不带登录凭据的 HTTPS 请求逐页检查：均返回 200，正文含正确的插件名称、
联系信息与相应内容。相对链接在 GitHub 的公开 Markdown 页面中互相连接。
真实地址已写入 `submission.json` 的 `extensions.com.openai.interface`。

| 页面 | 字段 |
| --- | --- |
| [插件介绍](https://github.com/xtcel/rea.ui/blob/main/integrations/chatgpt/pages/index.md) | `websiteURL` |
| [支持](https://github.com/xtcel/rea.ui/blob/main/integrations/chatgpt/pages/support.md) | `supportURL` |
| [隐私政策](https://github.com/xtcel/rea.ui/blob/main/integrations/chatgpt/pages/privacy.md) | `privacyPolicyURL` |
| [使用条款](https://github.com/xtcel/rea.ui/blob/main/integrations/chatgpt/pages/terms.md) | `termsOfServiceURL` |

邮箱未代替 `supportURL`。公开访问检查记录为 `dist/chatgpt/public-url-evidence.json`。

## 审核用例与演示

`submission.json` 包含 5 个正例、3 个反例及 3 个用户示例提示词。
正例覆盖单页、移动端多页、增量修改、组件目录/审计和校验失败修复；
反例覆盖真实付费应用部署、Figma 双向同步、真实登录端到端测试。
正例说明包含可复现的本地准备步骤，无需私人附件。

**8 个 ChatGPT 对话审核用例均为 Not run。** 本地协议/CLI 验证不能替代主机中
模型实际选择工具和交付结果的审核。在干净的 ChatGPT 桌面安装中逐例执行，
记录 Passed / Failed / Blocked / Not run、实际工具参数及交付文件验证结果。
先解决失败，再录制演示。

2026-11-16 本地验证：现有 MCP 测试 3/3 通过；从提交 ZIP 解压启动真实 stdio
服务器，发现 12 个工具，全部包含三个布尔属性标注；23 次工具调用覆盖创建、
读写、组件初始化、审计、对比、打包、解包、预览、多页设计、无效页面拒绝打包、
修复及工作区外路径拒绝，全部符合预期。另通过包内 CLI 导出到独立用户项目目录，
最终 `.reaui` 校验 `ok: true`。运行记录位于 `dist/chatgpt/smoke-evidence.json`。

演示录制顺序（建议 2–3 分钟，以真实操作完成时间为准）：

1. 在 ChatGPT 桌面展示安装的 ReaUI Designer 0.3.1 和本地工具；确认 Node ≥22.18。
2. 使用第一个正例提示词，展示生成过程、`ok: true`、实际导出的文件路径。
3. 打开离线预览；在兼容 REA UI 编辑器中打开 `.reaui`，选中并移动独立图层。
4. 输入修改标题的请求，展示新文件和重新校验结果。
5. 使用一个反例，展示能力边界说明，确认没有伪造执行成功。
6. 回放录像，检查文字可读、结果完整且无账号、令牌或无关私人内容。

电脑控制和截图本身不等于视频录制。使用系统录屏或实际可用的录制工具；
脚本、预览图和本地 smoke 结果不能充当已录制演示。
将实录视频发布到审核者无需私人登录即可播放的位置，验证后填入
`review.demo_recording_url` 并重建 ZIP。目前尚未录制或托管演示。

## 提交资格与最后的门户操作

当前保留本地 stdio MCP，适用官方 **Desktop only** 路径。
[官方桌面插件提交要求](https://developers.openai.com/plugins/deploy/desktop-only)
明确要求本地 MCP 发布者为获批合作伙伴，并且提交组织已加入白名单。
用户已确认白名单状态尚未核实；在得到确认前不提交审核。

实际门户检查：Chrome 已登录 Xtcel 组织的 Default project；点击 Upload plugin 后，
门户提示 **Complete identity verification — You need a verified developer identity
before you can create or upload a plugin.** 已进入组织设置；Individual 和 Business
均显示 Start。个人发布者验证尚未完成，当前甚至无法创建或上传草稿。
已将页面交给发布者本人完成 Individual 验证；证件、人脸资料不写入本仓库或聊天。

1. 在组织设置查看提交组织 ID，联系 OpenAI 对接人核实本地 MCP 白名单。
   使用个人发布身份也需要在有提交权限的组织/项目下操作。
2. 完成个人身份验证，并核对最终公开开发者姓名。
3. 页面、实录、用例和 ZIP 完成后，进入
   [插件提交门户](https://platform.openai.com/plugins)。按照本地 MCP 官方流程选择
   **Create plugin → Skills only → Upload ZIP**；ZIP 继续包含 `mcp.json`。
   不要删除 MCP 来绕过资格要求，也不要将本地服务器当成已经部署的 HTTPS 服务。
4. 检查保存的确切版本、地区、免费声明、图标、8 个用例及实际扫描结果。
   完成所有必要扫描，并由发布者本人完成法律/政策声明。
5. 提交审核；批准后另行核对并发布，分别记录真实状态。

ZIP 不包含代替发布者作出的法律声明，也不包含审核账号凭据。

[官方提交说明](https://developers.openai.com/plugins/deploy/submission) ·
[官方插件要求](https://developers.openai.com/plugins/plugin-guidelines)
