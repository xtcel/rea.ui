## ADDED Requirements

### Requirement: 可编辑文本结构
独立段落 SHALL 用 Text，行内范围 SHALL 用有身份的 Span，显式换行 SHALL 用有身份的 Break 表达。SetText SHALL 仅适用于纯文本；富文本 SHALL 使用 SetTextRange 等范围操作并保留未涉及 Span。整段替换 SHALL 显式指定是否丢弃行内结构；绑定文字 SHALL 遵循实例参数路由。

#### Scenario: 修改富文本中的一个范围
- **WHEN** 用户替换两个 Span 中第一个的部分文字
- **THEN** 未触及文字、第二个 Span 的身份与样式保持

#### Scenario: 普通 SetText 覆盖富文本
- **WHEN** 对含行内结构的 Text 使用未说明结构处理的 SetText
- **THEN** 操作拒绝，不静默丢弃 Span 与 Break

### Requirement: 字符位置与字素边界
v1 文本位置 SHALL 使用 UTF-16 offset，编辑边界 SHALL 做 grapheme 校验，避免截断 emoji、代理对与组合字符。非法范围 SHALL 返回 INVALID_TEXT_RANGE；双向文本 SHALL 由适配器维护逻辑位置与视觉光标映射。

#### Scenario: 删除落在 emoji 中间
- **WHEN** 提交的 UTF-16 删除范围切断一个字素簇
- **THEN** 返回 INVALID_TEXT_RANGE，不产生损坏字符或局部删除

#### Scenario: 阿拉伯文视觉光标编辑
- **WHEN** 用户在混合中英阿拉伯文中定位视觉光标并输入
- **THEN** 适配器将光标映射到正确逻辑范围，源码保留正确逻辑文本顺序

### Requirement: IME 会话与一次提交
IME composition SHALL 只在会话缓冲中预览，compositionend SHALL 作为一个事务提交。组合期间同一 Text 源修订改变 SHALL 保留未提交输入并要求重应用或取消，不得覆盖 AI/外部新内容。

#### Scenario: 中文组合完成后撤销
- **WHEN** 用户通过多次 compositionupdate 完成一次中文输入，再执行 Undo
- **THEN** 组合过程只产生一个文档历史步骤，Undo 一次恢复输入前源码

#### Scenario: 组合期间 AI 修改同一文本
- **WHEN** IME 尚未结束而 AI 已提交同一 Text 的新修订
- **THEN** 组合输入保留为未提交缓冲，不能无提示覆盖新修订

### Requirement: 分阶段排版验收
P0/P1 SHALL 验证基础中文 IME、纯文本与实例参数编辑；P2 SHALL 验证基础富文本；P3 SHALL 以中英阿拉伯文、emoji、组合字符和多字体样本验证逻辑文本、选择范围与稳定交互。视觉及几何测量 SHALL 等待相关字体就绪。

#### Scenario: 多字体回归样本
- **WHEN** P3 在固定字体资源完成加载后运行混合文字用例
- **THEN** 文本内容、范围编辑、光标映射和换行结果按样本检查，不以单张截图替代文本语义验证
