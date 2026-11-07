## ADDED Requirements

### Requirement: 离线自包含预览
`reaui preview` SHALL 把文档渲染为单个 HTML 文件，内联 Tailwind 编译结果与全部样式。产物 MUST NOT 依赖网络、CDN、外部脚本或本地开发服务器。

#### Scenario: 断网打开
- **WHEN** 在无网络环境打开生成的 `preview.html`
- **THEN** 页面完整显示所有画板与文字，控制台没有外部请求失败

### Requirement: 画板范围与页面导航
预览 SHALL 按页面顶层 `Frame` 的固定 `left`、`top`、`width`、`height` 计算画板包围盒，并为每个画板提供页面名称。无法解析固定尺寸时 MUST 回退为 `1440×1024` 并在页面中标注。

#### Scenario: 桌面与移动画板
- **WHEN** 页面同时包含 `w-[1440px] h-[1024px]` 与 `w-[390px] h-[844px]` 两个顶层 Frame
- **THEN** 两个画板按各自尺寸并排显示，标签使用 `Page` 的 `name`

#### Scenario: 非固定尺寸回退
- **WHEN** 顶层 Frame 使用 `w-full` 等非固定宽度
- **THEN** 预览使用 `1440×1024` 容器，并显示「尺寸已回退」提示

### Requirement: 渲染失败隔离
单页渲染失败 MUST NOT 中断整个预览。失败页面 SHALL 显示错误摘要，其余页面继续渲染。

#### Scenario: 单页含不支持节点
- **WHEN** 某页包含当前预览不支持的实例或资源引用
- **THEN** 该页显示错误说明，其他页面正常输出

### Requirement: 与编辑器一致的静态语义
预览 MUST 复用 `PageRenderer` 的节点语义，包括隐藏节点不渲染、`Ellipse` 默认 `rounded-full`、`Text` 使用段落元素、矢量按 `viewBox` 缩放，并使用 `bg-[#ffffff]`、`text-[#30343b]` 等原始 Tailwind 类。

#### Scenario: 隐藏与椭圆
- **WHEN** 页面含 `hidden` 节点与未写圆角的 `Ellipse`
- **THEN** 隐藏节点不出现，椭圆显示为圆形
