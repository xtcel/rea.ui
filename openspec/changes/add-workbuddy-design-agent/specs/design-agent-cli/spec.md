## ADDED Requirements

### Requirement: 文档初始化
`reaui init` SHALL 在目标目录创建最小合法文档，包含 `rea.json` 与至少一个页面文件，且页面 id 符合 `^[a-z][a-z0-9-]{0,63}$`。目标目录已有 `rea.json` 时 MUST 拒绝覆盖并返回非零退出码。

#### Scenario: 创建新文档
- **WHEN** 执行 `reaui init ./demo --name 我的应用 --page main --page-name 首页`
- **THEN** 生成 `rea.json` 与 `pages/main.page.tsx`，`reaui validate ./demo` 通过

#### Scenario: 重复初始化
- **WHEN** 目标目录已存在 `rea.json`
- **THEN** 命令输出 `DOC_EXISTS` 错误，保留原文件不变

### Requirement: 设计源全量校验
`reaui validate` SHALL 接受文档目录或 `.reaui` 文件，并使用 `DocumentSession` 校验清单、全部页面、组件目录与实例引用。失败时 MUST 输出结构化错误，包含 `code`、`path`、`message` 与可执行的 `hint`。

#### Scenario: 非法 Tailwind 与结构
- **WHEN** 页面出现 `<div>`、事件属性或顶层 Frame 缺少 `absolute` 与尺寸类
- **THEN** 返回 `PAGE_PARSE` 或 `PAGE_STRUCTURE` 错误，退出码为 1，且不产出打包文件

#### Scenario: JSON 输出供 Agent 修复
- **WHEN** 执行 `reaui validate ./demo --json`
- **THEN** 标准输出为单个 JSON 对象，`ok` 为布尔值，`errors` 数组按文件路径排序

### Requirement: 确定性打包
`reaui pack` SHALL 调用现有 `exportReaui()` 生成 `application/vnd.reaui+zip` 容器，条目按路径排序、时间戳固定为 1980-01-01、压缩级别为 6。打包前 MUST 完成一次全量校验；校验失败不得写出目标文件。

#### Scenario: 相同内容相同字节
- **WHEN** 对同一目录连续打包两次
- **THEN** 两个 `.reaui` 文件字节完全一致

#### Scenario: 校验失败阻断打包
- **WHEN** 文档存在解析错误
- **THEN** 不创建或覆盖目标 `.reaui`，返回校验错误

### Requirement: 安全解包
`reaui unpack` MUST 先使用 `readReaui()`（与 `decodeReaui()` 共用 ZIP 目录、路径、CRC、压缩比与页面解析校验）完成校验，通过后才写出文件。`readReaui()` 保留原文档 id 与名称。输出目录 MUST 拒绝绝对路径、`..`、反斜杠与控制字符。

#### Scenario: 拒绝路径穿越
- **WHEN** ZIP 内含 `../evil.tsx` 或绝对路径条目
- **THEN** 解包失败并报告 `ZIP_PATH_UNSAFE`，不写出任何文件

#### Scenario: 正常往返
- **WHEN** 对 `demo.reaui` 执行 `reaui unpack --out ./restored`
- **THEN** 目录内容与打包前一致，`reaui validate ./restored` 通过

### Requirement: 设计源差异
`reaui diff` SHALL 比较两个文档目录或 `.reaui`，报告新增、删除与修改的文件及行数变化，用于多轮修改时检查是否越界。

#### Scenario: 局部修改
- **WHEN** 只改动 `pages/main.page.tsx` 的一个文本节点
- **THEN** 输出仅列出该文件，并给出新增与删除行数
