## ADDED Requirements

### Requirement: IndexedDB 多文档存储
系统 SHALL 把文档保存在浏览器 IndexedDB 中，支持同时保存多个文档。每个文档记录包含清单、所有文本文件、`revision` 和更新时间；二进制资源 MUST 存放在单独的存储中。系统 SHALL 支持新建、打开、重命名、复制和删除文档，并记住最近打开的文档。

#### Scenario: 保存多个文档
- **WHEN** 用户创建了两个文档
- **THEN** 刷新页面后文档列表中仍有两个文档，并按更新时间倒序排列

#### Scenario: 记住上次打开的文档
- **WHEN** 刷新页面
- **THEN** 系统重新打开上次打开的文档

#### Scenario: 删除文档同时删除其资源
- **WHEN** 删除一个含有图片资源的文档
- **THEN** 该文档的记录和所有资源都被删除，其他文档不受影响

### Requirement: 自动保存与失败处理
系统 SHALL 在事务提交后防抖 500ms 自动保存，并在一个 IndexedDB 事务中写入整条文档记录。保存状态 MUST 对界面可见（保存中、已保存、保存失败）。保存失败（如配额不足）时，系统 MUST 保留内存中的文档，提示用户导出 `.reaui`，并在下次变更后重试。

#### Scenario: 连续编辑只写一次
- **WHEN** 500ms 内连续提交 10 个事务
- **THEN** 只执行一次保存，保存的内容是最后一个事务之后的状态

#### Scenario: 保存失败
- **WHEN** IndexedDB 写入因配额不足失败
- **THEN** 保存状态显示为失败，并提示导出 `.reaui`
- **AND** 用户可以继续编辑

#### Scenario: 写入是原子的
- **WHEN** 保存过程中途被中断
- **THEN** 重新打开时得到的是上一次完整保存的状态，而不是部分写入的状态

### Requirement: 多窗口冲突检测
系统 SHALL 在保存前比较存储中的 `revision` 与会话持有的 `revision`。两者不一致时 MUST NOT 覆盖写入，并提示用户该文档已在另一个窗口被修改，由用户选择重新加载。

#### Scenario: 另一个窗口已修改
- **WHEN** 窗口 A 保存后，窗口 B 基于旧版本尝试保存
- **THEN** 窗口 B 的保存被拒绝并出现冲突提示
- **AND** 窗口 A 保存的内容不被覆盖

### Requirement: `.reaui` 单文件导出
系统 SHALL 把当前文档导出为单个 `.reaui` 文件。该文件是 ZIP 容器（MIME `application/vnd.reaui+zip`），内容与文档目录结构一致：根目录的 `rea.json`、`pages/*.page.tsx`、`assets/*`。导出 MUST 是确定性的：条目按路径排序，时间戳固定为 1980-01-01，压缩级别固定，同一文档内容得到字节一致的文件。导出文件名 SHALL 取自文档名称。

#### Scenario: 导出内容结构
- **WHEN** 导出含两个页面和一张图片的文档
- **THEN** ZIP 中有 `rea.json`、两个页面文件和 `assets/` 下的图片，没有其他条目

#### Scenario: 确定性
- **WHEN** 对同一内容的文档连续导出两次
- **THEN** 两个文件的字节完全一致

#### Scenario: 导出后再导入
- **WHEN** 导出文档并重新导入
- **THEN** 新文档的所有页面文件内容与原文档逐字节一致

### Requirement: `.reaui` 导入与校验
系统 SHALL 支持导入 `.reaui` 文件，并始终创建一个新文档（分配新的文档 `id`），不覆盖已有文档。导入 MUST 在写入任何数据之前完成全部校验，失败时不留下任何残留数据。校验包括：路径安全（拒绝绝对路径、`..`、反斜杠和以 `/` 结尾的条目）；条目数不超过 5000、解压后总大小不超过 256MB、单条目压缩比不超过 200；`rea.json` 合法；清单引用的文件都存在；每个页面文件通过静态 TSX 子集校验；`assets/` 之外、`pages/` 之外、`rea.json` 之外的条目被忽略并给出警告。

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

### Requirement: 页面与整个文档的代码导出
系统 SHALL 在菜单中提供「导出页面代码（.tsx）」，该操作导出当前页面文件的原文，并在页面文件头部以注释说明默认使用 Tailwind CSS v4 与默认主题。

#### Scenario: 导出当前页面代码
- **WHEN** 用户选择导出当前页面代码
- **THEN** 下载文件的内容是当前页面文件的当前源码

### Requirement: v1 数据迁移
系统 SHALL 在首次启动、IndexedDB 中没有任何文档、且存在旧 localStorage 键 `rea-ui:tsx-document:v1` 时，把旧文档迁移为 v2 文档；同样 SHALL 支持导入旧版 `.design.tsx` 文件并迁移。迁移 MUST 满足：每个 v1 `Page` 变为一个页面；`Page` 的每个 `viewport` 变为一个画框，水平排列、间距 64、起点 (0, 0)，第一个画框使用原根 Frame 的内容，其余画框复制该内容并重新生成全部 `designId`；`style` 对象转为 className，已知键转为对应的 Tailwind 类，未知键转为任意属性类（如 `[letter-spacing:0.02em]`）；`Frame data-shape="rectangle"` 转为 `Rect`，`Vector data-shape="ellipse"` 转为 `Ellipse`。迁移结果 MUST 通过新解析器校验。迁移完成后 MUST NOT 删除旧 localStorage 数据，只记录 `migrated:v1`。

#### Scenario: 单视口页面迁移
- **WHEN** 迁移含一个视口 960×640 的 v1 页面
- **THEN** 得到一个页面，其中有一个位于 (0, 0)、尺寸 960×640 的画框，原根 Frame 的内容在其中

#### Scenario: 多视口页面迁移
- **WHEN** 迁移一个含两个视口的 v1 页面
- **THEN** 得到一个页面，含两个水平排列且间距为 64 的画框
- **AND** 两个画框内所有节点的 `designId` 互不相同

#### Scenario: 样式转换
- **WHEN** v1 节点 `style` 为 `{ background: "#dce8ff", borderRadius: 16, letterSpacing: "0.02em" }`
- **THEN** className 含 `bg-[#dce8ff]`、`rounded-2xl`、`[letter-spacing:0.02em]`

#### Scenario: 迁移后保留旧数据
- **WHEN** 迁移完成
- **THEN** 旧 localStorage 键仍然存在，`migrated:v1` 已记录，再次启动不会重复迁移

#### Scenario: 旧数据损坏
- **WHEN** 旧 localStorage 内容无法解析
- **THEN** 跳过迁移，载入内置示例文档，并且不删除旧数据

### Requirement: 内置示例文档
系统 SHALL 在首次启动且没有任何可迁移的旧数据时，创建一个内置的 v2 示例文档，至少含一个页面、两个不同尺寸的画框，以及矩形、椭圆和文字图层，用于展示层级与 Tailwind 写法。

#### Scenario: 首次启动
- **WHEN** 首次启动且没有旧数据
- **THEN** 自动创建并打开示例文档
- **AND** 示例文档通过全部校验
