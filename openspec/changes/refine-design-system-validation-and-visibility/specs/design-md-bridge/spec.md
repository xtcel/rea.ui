## MODIFIED Requirements

### Requirement: 从 `DesignSystem` 导出 `DESIGN.md`
`@rea-ui/design-system` MUST 提供 `renderDesignMarkdown(input)` 与 `exportDesignMarkdown(system)`，输出固定章节顺序的 UTF-8 Markdown：
1. `# <Name> — Design System` + 概述段 + `>rea-design-system: {"id":"...","version":N}` 元数据注释
2. `## 1. Visual Theme & Atmosphere`（来自 `guidelines` 首段或 `description`）
3. `## 2. Color Palette & Roles`（Markdown 表格：`Role | Token | Value | Usage`，覆盖核心角色与所有已定义可选/自定义颜色键）
4. `## 3. Typography Rules`（字体族列表 + 字阶表格：`Role | Size | Line Height | Weight | Letter Spacing`）
5. `## 4. Layout, Spacing & Elevation`（间距基准与刻度、圆角表、阴影表、边框与动效表）
6. `## 5. Component Specifications`（每个 `SystemComponentSpec` 一个 `### 5.x <Name>` 小节，含变体、状态、尺寸、令牌引用与用法说明）
7. `## 6. Do's & Don'ts`（来自 `guidelines` 的规则列表）

其中 `renderDesignMarkdown(input)` MUST 支持对尚未发布或仍含校验警告的草稿直接渲染 `DESIGN.md` 文本，不因校验未通过而抛出异常。

#### Scenario: 草稿状态直接渲染 DESIGN.md
- **WHEN** 调用 `renderDesignMarkdown(draft)` 渲染一份尚未发布或缺少部分可选角色的设计系统草稿
- **THEN** 返回包含完整 6 个标准章节的 `DESIGN.md` 文本且不抛出异常
