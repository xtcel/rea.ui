## ADDED Requirements

### Requirement: 确定性派生导出
导出器 SHALL 从与编辑器相同的源语义和样式解释规则确定性生成普通 React 或 HTML/CSS/SVG。普通 React SHALL 不依赖编辑器运行时；导出 SHALL 是派生结果，修改导出文件不得自动成为新的设计源，也不承诺任意 React 反向恢复。

#### Scenario: 重复导出相同文档
- **WHEN** 相同源码、资源和工具链执行两次导出
- **THEN** 产生相同输出，不包含相机、选区、锁定或默认设计身份等编辑器控制信息

### Requirement: 布局、文本与组件映射
Frame SHALL 映射到语义合适的 HTML/CSS 布局、定位与 media queries；Group SHALL 不增加布局盒；Text/Span/Break SHALL 映射为文本元素/span/br 并保留可用语义；Image SHALL 包含 alt 与资源路径。Component/Instance SHALL 在 React 输出中成为组件/props，在 HTML 中展开；Token SHALL 输出为 CSS 变量及必要主题定义。

#### Scenario: 桌面手机组件页面导出
- **WHEN** 导出带响应式 Frame、Token 和多个实例的页面
- **THEN** React 保留组件/参数关系，HTML 展开等价内容，两者按同一断点与属性优先级呈现

### Requirement: 图形导出与显式降级
Vector/BooleanOp SHALL 输出标准 SVG path，布尔导出使用求值结果且不改变源输入；Mask/Appearance SHALL 在支持范围映射 SVG/CSS。能力缺口 SHALL 按受影响对象报告，系统 MUST NOT 静默栅格化可编辑文本或矢量；栅格化 SHALL 是显式选项并报告影响。

#### Scenario: 未支持效果导出
- **WHEN** 导出请求包含无法等价表示的效果且未选择栅格化
- **THEN** 返回对应对象的能力诊断，不无提示丢效果或把文字转换成图片

### Requirement: 分阶段导出验证
P0 SHALL 验证最小静态页面导出，P2 SHALL 验证组件与响应式 React/HTML，P3 SHALL 验证专业图形及合成。验收 SHALL 同时检查输出能独立运行、语义对应和视觉/几何，不只比较单张截图。

#### Scenario: 独立运行导出
- **WHEN** 在不加载编辑器运行时的普通 Web/React 环境打开导出产物
- **THEN** 该阶段承诺的布局、文本、组件与图形按固定资源正确呈现，能力缺口有明确报告
