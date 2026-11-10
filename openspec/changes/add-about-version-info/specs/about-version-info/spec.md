## ADDED Requirements

### Requirement: 构建期版本单一来源

关于页展示的编辑器版本与 reaui-cli 版本 SHALL 由构建时从根 `package.json` 与 `packages/reaui-cli/package.json` 读取并注入，界面 MUST NOT 硬编码版本号。`package.json` 缺少合法 `version` 时构建 MUST 失败。未经过该构建配置的环境 MUST 显示占位符，MUST NOT 报错或伪造版本号。

#### Scenario: 发版只改一处

- **WHEN** `packages/reaui-cli/package.json` 的 `version` 从 `0.1.3` 改为 `0.1.4` 并重新构建
- **THEN** 关于页显示 `v0.1.4`，无需改动界面代码

#### Scenario: 未注入构建常量

- **WHEN** 在未加载该 Vite 配置的 Vitest 环境导入版本常量
- **THEN** 常量为占位符 `—`，不抛出 `ReferenceError`

### Requirement: 关于页版本字段

关于页 SHALL 展示配套 reaui-cli 版本、当前文档的 `rea.json` 清单版本，以及当前文档固定的设计系统版本（名称、`revision`、`hash`）。设计系统未固定时 MUST 显示「未固定」；`design/system.json` 存在但校验失败时 MUST 显示「快照无效」，MUST NOT 与「未固定」混同。完整 hash MUST 可通过 `title` 查看，界面 MUST 只显示其前 12 位。

#### Scenario: 文档已固定设计系统

- **WHEN** 最近文档的清单为 v4 且 `design/system.json` 是 `revision: 3`、hash `9f2c…` 的合法包
- **THEN** 关于页显示「清单 v4」与「名称 · r3 · 9f2c… 前 12 位」，悬停可见完整 hash

#### Scenario: 文档未固定设计系统

- **WHEN** 最近文档没有 `design/system.json`
- **THEN** 关于页设计系统一栏显示「未固定」，清单版本仍按 `rea.json` 显示

#### Scenario: 快照被篡改

- **WHEN** `design/system.json` 的 hash 与包内容不一致
- **THEN** 关于页显示「快照无效」，不显示该包的 `revision` 与 `hash`

### Requirement: 只读获取文档版本

读取文档版本 SHALL 通过共享 IndexedDB 的 `getMeta('lastOpenedId')` 与 `getDocument()` 完成，MUST NOT 调用 `openDocument()`、MUST NOT 写入 `lastOpenedId`、MUST NOT 构造可编辑的 `DocumentSession`。`lastOpenedId` 缺失时 MUST 回退到第一篇文档；没有文档或读取失败时 MUST 省略清单版本并按「未固定」展示，MUST NOT 阻断设置页其它功能。每次进入关于页 SHALL 重新读取。

#### Scenario: 查看关于页不改变最近文档

- **WHEN** 在独立设置窗口查看关于页，而主窗口正在编辑另一篇文档
- **THEN** `lastOpenedId` 保持不变，关于页显示的仍是共享存储里最近打开文档的版本信息

#### Scenario: 空工作空间

- **WHEN** 本地没有任何文档
- **THEN** 关于页正常打开，文档格式只显示 `.reaui（ZIP）`，设计系统显示「未固定」，无错误提示

#### Scenario: 重新进入关于页

- **WHEN** 主窗口固定设计系统后，用户从「通用」切回「关于」
- **THEN** 关于页显示固定后的 v4 与设计系统 `revision`，而不是设置窗口打开时点的旧值
