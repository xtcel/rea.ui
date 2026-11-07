# WorkBuddy 集成

`reaui-designer/` 是 WorkBuddy 专家包源文件：Agent 型专家「小瑞」+ `reaui-design` 技能。它把自然语言需求变成可编辑的 `.reaui` 设计稿，并生成离线预览。

## 依赖

- 本机 ReaUI 仓库（默认 `~/workspace/rea.ui`）
- Node.js 22.18+
- 已完成 `pnpm install`

技能通过 `REAUI_ROOT` 定位 CLI：

```bash
export REAUI_ROOT=~/workspace/rea.ui
node "$REAUI_ROOT/packages/reaui-cli/bin/reaui.mjs" --version
```

## 安装 / 更新

```bash
PLUGINS="$HOME/.workbuddy/plugins/marketplaces/my-experts/plugins"
cp -R integrations/workbuddy/reaui-designer "$PLUGINS/"

EXPERT_TOOLS="/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/expert-manager/scripts"
python3 "$EXPERT_TOOLS/validate_expert.py" "$PLUGINS/reaui-designer"
python3 "$EXPERT_TOOLS/register_expert.py" "$PLUGINS/reaui-designer"
```

注册后如专家中心未立即出现，重启 WorkBuddy 或重新打开专家列表。

## 结构

```text
reaui-designer/
  .codebuddy-plugin/plugin.json   专家元数据（名称、分类、标签、推荐提示词）
  agents/reaui-designer.md        角色、SOP、边界、交付规范
  skills/reaui-design/
    SKILL.md                      工作流与命令
    references/                   协议速查、设计系统、布局骨架、错误修复
    templates/                    四个可校验的页面模板
    scripts/reaui.mjs             CLI 转发器（读取 REAUI_ROOT）
  avatars/expert.png              512×512 头像
```

## 维护约定

- 专家包只做薄封装：校验、打包、预览全部调用 `packages/reaui-cli`，不复制规则。
- 协议变更先改 `docs/agent-protocol.md`，再同步 `skills/reaui-design/references/protocol.md`。
- 模板改动必须能用 `reaui validate` 通过；四个模板都要回归。
- 不要在本目录写死绝对路径，统一走 `REAUI_ROOT`。
