# 生成设计的可编辑性

对应 OpenSpec `improve-generated-design-editability`。

生成入口现在默认按业务布局组织命名 Frame/Group，使用局部坐标，优先已有组件，对重复两次及以上的结构评估提取；内容用参数、状态用变体。80 图层为软预算，禁止为压缩图层数跨图标合并路径、跨记录合并 Text。内置 Agent、MCP、Codex 和 WorkBuddy 的技能及模板已同步。

## CLI

```bash
pnpm reaui init ./design --components
pnpm reaui components init ./existing-design
pnpm reaui validate ./design --json
pnpm reaui audit ./design --json
pnpm reaui audit ./design --strict --json
```

`--components` 创建合法空组件目录并使用 v3；给已有文档添加目录时保留 v4 及系统快照，已有组件文件不覆盖。候选整体校验后落盘，失败恢复原始文件。MCP 对应 `reaui_init({components:true})`、`reaui_init_components` 和 `reaui_audit`。

`audit` 与 `validate` 分开，不改写源，不改变打包门禁。建议包含 code、severity、path、node、message、hint。默认建议退出 0，strict 有建议退出 1；文档格式非法退出 1。

| code | 检查 |
|---|---|
| EDIT_NAME | 缺少业务名称，或名称是通用的 Frame/Text/图层等 |
| EDIT_FLAT_HIERARCHY | 同容器直接叶节点至少 12 个，且占直接可见子节点 80% 以上 |
| EDIT_REPEATED_STRUCTURE | 同级 Frame/Group 重复两次，结构指纹一致、含文字和至少两个直接子层 |
| EDIT_MERGED_VECTOR | 多轮廓间距显著大于各轮廓尺寸，疑似合并不同位置图标 |
| EDIT_PATH_UNEDITABLE | d 无法转换为合法结构化锚点 |

这些是启发式建议，有误报和漏报；需要人工判断。已有 Instance 的展开子层不参与重复检查；组件定义单独检查一次。零建议不证明视觉还原度或完整可编辑性，也不会发现所有跨记录文字合并。

## 路径编辑

首轮廓沿用 `path.anchors/closed`；后续轮廓使用 `path.contours`，每项同样含 anchors/closed。全路径锚点 id 唯一，总数最多 20000，每轮廓至少 2 个。SVG A/a 用共享归一化器转换为三次贝塞尔，默认误差界 0.01 SVG 用户单位；过大的细分或非有限输入明确失败。

进入锚点编辑后可从“轮廓”选择器切换，或点击其它轮廓；拖动、控制柄模式、插入、删除仅作用于所选轮廓。预览与提交重组完整路径，保留其他轮廓。镂空图标保持一个 Vector 和整体 `[fill-rule:evenodd]`，nonzero 保留轮廓方向；SVG 导入与导出同样保留填充规则。

转换时使用源属性，避免把组件预览中求值后的样式写回而丢失绑定。

## 示例与验证

- [可编辑工作台 .reaui](../examples/editable-workbench.reaui)，[源目录](../examples/editable-workbench/)，[离线 HTML](../examples/editable-workbench-preview.html)。1440×1024，v3，6 个主组件，20 个展开实例（含嵌套状态标签）。
- 目录与最终 `.reaui` 均 `validate` 通过，`audit --strict` 零建议；8 份插件页面模板及配套工作台组件目录校验通过。
- 全量 Vitest：591 项通过，2 项依赖外部条件的冒烟测试按配置跳过；TypeScript、WASM、Web/CLI/MCP 构建通过。Web 保留既有大 chunk 提示。
- 单元回归覆盖圆弧误差、旋转椭圆、相对命令、混合闭合轮廓、非法输入、锚点总数/身份、第二轮廓编辑、撤销/重做、ZIP 重开、SVG 孔洞导出和审计退出码。
- `node scripts/verify-design-editability.mjs` 使用隔离 Chrome 配置与本机服务实际验证：20 个组件实例、even-odd 镂空、轮廓选择、孔洞锚点拖动/插入、外轮廓不变、保存并重开。截图：[工作台](assets/design-editability/workbench.png)、[轮廓编辑](assets/design-editability/contours.png)。

## 分发与兼容

已重建仓库插件内的 CLI/MCP bundle；本次未发布 npm 或插件，也未修改安装缓存。要让外部 Agent 使用新规则，需要安装/重载更新后的插件；桌面编辑器需要重新构建才具备新增路径能力。版本号不能单独证明能力，CLI `help` 应包含 audit 和 components。

旧 d 和单轮廓 path 继续可读；新增 path.contours 需要本次更新后的编辑器，旧编辑器会拒绝该字段。审计不会自动重构外部 AquaRDM 原稿，本次未覆盖那份设计文件。验证为 Web/Chrome，未宣称完成原生 WKWebView 或所有缩放/设备的验收。
