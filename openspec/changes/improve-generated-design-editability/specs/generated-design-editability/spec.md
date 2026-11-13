## ADDED Requirements

### Requirement: 默认生成可编辑布局和可复用结构

所有随仓库分发的生成规范 SHALL 要求按布局区域创建命名 Frame/Group，子层使用局部坐标（如父 `absolute left-[240px] top-[80px] w-[960px] h-[720px]`，子 `absolute left-[24px] top-[24px]`）。规范 MUST 优先复用已有组件，对同结构出现两次及以上的内容评估抽取；内容用参数、状态用变体。规范 MUST 禁止为压缩图层数跨图标合并路径、跨业务记录合并文字，图层预算为软约束。

#### Scenario: 生成含多条记录的工作台
- **WHEN** Agent 生成侧栏、顶部栏和重复实验记录
- **THEN** 规范要求各布局区命名分组、每条记录可独立选择，并评估记录行组件，不等待用户额外提出组件要求

### Requirement: CLI 管理组件目录版本

CLI SHALL 支持 `init --components` 和 `components init <dir>`，生成合法的 `components/main.components.tsx`，按需升级至 v3，保留 v4。已有组件目录 MUST 不被覆盖；失败 MUST 不留下半成品清单或组件文件。

#### Scenario: 给 v2 添加组件能力
- **WHEN** 对合法 v2 目录运行 components init
- **THEN** 文档升级至 v3，合法空 Components 目录可被校验、打包和重新打开

#### Scenario: 对 v4 重复初始化
- **WHEN** 对 v4 文档连续运行 components init
- **THEN** 保留 v4 与系统快照，第二次运行保持组件源字节不变

### Requirement: 可编辑性审计独立于格式校验

CLI SHALL 提供 `audit <dir|file.reaui> [--json] [--strict]`，检查布局平铺、缺失或通用命名、疑似重复复合结构、疑似跨区域合并路径和锚点转换失败。每条问题 MUST 带 code、severity、path、node、message、hint；启发式 MUST 标注不确定性。默认警告退出 0，strict 警告退出 1；格式非法退出 1。审计 MUST 不修改源，且不改变 validate/pack 默认语义。

#### Scenario: 平铺页面可通过格式校验但存在质量问题
- **WHEN** 合法画板直接包含大量无分组叶节点或重复记录结构
- **THEN** validate 仍按格式判断，audit 输出可定位警告，strict 使审计失败

#### Scenario: 已复用的组件实例
- **WHEN** 页面重复使用同一个 Instance
- **THEN** audit 不把展开后的组件子节点当作页面重复结构
