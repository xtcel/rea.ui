## MODIFIED Requirements

### Requirement: `.reaui` 单文件导出

系统 SHALL 把当前文档导出为单个 `.reaui` 文件。该文件是 ZIP 容器（MIME `application/vnd.reaui+zip`），内容与文档目录结构一致：根目录的 `rea.json`、`pages/*.page.tsx`、`assets/*`、固定组件目录文件（存在时）、`agent/sessions.json`（存在时）以及 `editor/guides.json`（存在时）。导出 MUST 是确定性的：条目按路径排序，时间戳固定为 1980-01-01，压缩级别固定，同一文档内容得到字节一致的文件。导出文件名 SHALL 取自文档名称。参考线文件 MUST 作为文档元数据导出，MUST NOT 改变页面文件或清单的内容。

#### Scenario: 导出内容结构

- **WHEN** 导出含两个页面和一张图片的文档
- **THEN** ZIP 中有 `rea.json`、两个页面文件和 `assets/` 下的图片，没有其他条目

#### Scenario: 确定性

- **WHEN** 对同一内容的文档连续导出两次
- **THEN** 两个文件的字节完全一致

#### Scenario: 导出后再导入

- **WHEN** 导出文档并重新导入
- **THEN** 新文档的所有页面文件内容与原文档逐字节一致

#### Scenario: 导出参考线

- **WHEN** 页面 A 有 x=120、y=64 两条参考线时导出
- **THEN** ZIP 中包含 `editor/guides.json`，内容与当前文档的参考线一致，且 `rea.json` 与页面文件字节不变

#### Scenario: 无参考线时不产生空文件

- **WHEN** 文档从未创建过参考线时导出
- **THEN** ZIP 中不含 `editor/guides.json`，文件字节与变更前一致

### Requirement: `.reaui` 导入与校验

系统 SHALL 支持导入 `.reaui` 文件，并始终创建一个新文档（分配新的文档 `id`），不覆盖已有文档。导入 MUST 在写入任何数据之前完成全部校验，失败时不留下任何残留数据。校验包括：路径安全（拒绝绝对路径、`..`、反斜杠和以 `/` 结尾的条目）；条目数不超过 5000、解压后总大小不超过 256MB、单条目压缩比不超过 200；`rea.json` 合法；清单引用的文件都存在；每个页面文件通过静态 TSX 子集校验；`assets/` 之外、`pages/` 之外、`rea.json` 之外、固定组件目录、`agent/sessions.json`、`editor/guides.json` 之外的条目被忽略并给出警告。

`editor/guides.json` SHALL 被作为文档元数据解码并保留；文件超过 64KB、不是合法 JSON 或结构不合法时 MUST 被丢弃并给出警告，MUST NOT 阻断导入。旧版 `.reaui` 缺少该文件时 MUST 等价于「该文档没有参考线」。

#### Scenario: 导入成功

- **WHEN** 导入一个合法的 `.reaui`
- **THEN** 文档列表中出现一个新文档，已有文档不变

#### Scenario: 路径穿越被拒绝

- **WHEN** ZIP 中含有路径为 `../evil.tsx` 的条目
- **THEN** 导入整体失败，不写入任何数据

#### Scenario: 压缩炸弹被拒绝

- **WHEN** ZIP 中某个条目的压缩比超过 200，或解压后总大小超过 256MB
- **THEN** 导入整体失败，且不会把超限内容完整解压到内存

#### Scenario: 页面文件不合法

- **WHEN** 某个页面文件含有 `style` 属性
- **THEN** 导入失败，错误信息包含该页面的文件路径

#### Scenario: 同名文档

- **WHEN** 导入的文档名称与已有文档相同
- **THEN** 两个文档都保留，新文档名称追加「(2)」

#### Scenario: 参考线随文档导入

- **WHEN** 导入含合法 `editor/guides.json` 的文档
- **THEN** 新文档保留各页面的参考线，且导入不产生「未知条目」警告

#### Scenario: 参考线文件损坏

- **WHEN** `editor/guides.json` 是非法 JSON 或超过 64KB
- **THEN** 文档仍成功导入、参考线为空，warnings 中说明已忽略参考线文件

#### Scenario: 旧版容器兼容

- **WHEN** 导入不含 `editor/guides.json` 的旧 `.reaui`
- **THEN** 导入成功且没有任何参考线，不产生警告

## ADDED Requirements

### Requirement: 文档元数据路径白名单

`DocumentSession.withMetadata()` SHALL 只接受明确登记的文档元数据路径：既有 `agent/sessions.json`、新的 `editor/guides.json`，以及符合 `agent/[a-z0-9-]+.json` 命名的既有元数据文件；其他路径（尤其是 `rea.json`、`pages/*`、`components/*`）MUST 被拒绝。通过白名单写入的元数据 SHALL 参与自动保存与 `.reaui` 导出，但 MUST NOT 进入撤销 / 重做历史，也 MUST NOT 影响页面 TSX 的静态解析结果。

#### Scenario: 允许新路径

- **WHEN** 以 `editor/guides.json` 调用 `withMetadata()`
- **THEN** 文件内容写入文档、revision 递增，且 `undo()` 不会回滚该文件

#### Scenario: 拒绝设计源路径

- **WHEN** 以 `pages/main.page.tsx` 或 `editor/../rea.json` 调用 `withMetadata()`
- **THEN** 抛出「不支持的元数据路径」错误，文档内容不变

#### Scenario: 大小限制

- **WHEN** 写入超过约定上限的参考线内容
- **THEN** 写入被拒绝并给出明确提示，已有元数据保持原样
