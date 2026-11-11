## MODIFIED Requirements

### Requirement: 设计系统库与详情编辑
设计系统详情页 MUST 支持通过左侧 AI 对话创建或调整设计系统，并在右侧详情面板查看与编辑令牌、组件、指南及原始设计系统文件：
- 当设计系统处于新建空白状态（`blank === true`）时，生成提示词 MUST NOT 注入默认初始化令牌（`defaultTokens`），且 MUST NOT 要求模型优先保留当前系统令牌；
- AI 对话框 MUST 展示用户本轮附带的参考文件与项目资源（支持展开查看内容），并在 AI 回复中展示生成的 `DESIGN.md` 资源卡片（支持在对话内展开预览生成文档、复制内容及跳转到右侧源文件小节）；
- 右侧详情面板与左侧目录 MUST 提供「源文件」小节，支持随时查看、复制与导出原始 `DESIGN.md` 文档及 `design/system.json`，即使当前草稿仍存在待修正的校验警告。

#### Scenario: 新建空白设计系统附带参考 design.md 生成时不注入默认蓝紫令牌
- **WHEN** 用户新建一个空白设计系统（`blank === true`）并上传参考 `design.md` 发起生成
- **THEN** 发送给模型的系统提示词中声明当前设计系统为空白，不包含 `#356AF0` 等默认令牌数值

#### Scenario: 对话框展示参考资源与生成的 DESIGN.md 文档卡片
- **WHEN** 用户附带 `design.md` 发送生成请求且 AI 返回结果
- **THEN** 用户消息气泡显示可展开预览的 `design.md` 资源卡片，AI 回复气泡显示说明文本、变更项以及可展开查看原始 `DESIGN.md` 内容的资源卡片

#### Scenario: 详情页查看与导出原始 DESIGN.md 文件
- **WHEN** 用户在设计系统详情页切换到「源文件」小节或点击「导出 DESIGN.md」
- **THEN** 页面展示完整的 `DESIGN.md` 原始 Markdown 文本（以及可切换的 `design/system.json`），并允许复制或下载文件
