## 1. 依赖与包结构
- [ ] 1.1 新增 `packages/tailwind`、`packages/storage`，配置 workspace 与 tsconfig 引用
- [ ] 1.2 添加依赖：`tailwindcss`（v4）、`fflate`；测试用 `fake-indexeddb`
- [ ] 1.3 确认 Tailwind v4 `compile()` 可以在浏览器和 vitest 中用 `?raw` 导入的主题样式表工作（技术验证）
- [ ] 1.4 根据技术验证结果确定 preflight 的取舍，并写入 `design.md`

## 2. `@rea/design`：原语与索引
- [ ] 2.1 重写原语：`Page / Frame / Group / Rect / Ellipse / Text / Image / Vector`，公共属性只保留 `designId / name / hidden / locked / className`
- [ ] 2.2 移除 `DesignDocument`、`viewports`、`data-shape` 和 `style` 相关类型
- [ ] 2.3 重写 `inspectPage`：嵌套规则、`designId` 格式与页面内唯一、hidden/locked 继承、顶层 Frame 必须绝对定位、`Image.src` 限制
- [ ] 2.4 单元测试：每条嵌套规则和身份规则各至少一个通过用例与一个失败用例

## 3. `@rea/tailwind`
- [ ] 3.1 class 词法解析：变体、`!`、负号、工具名、值、任意值与任意属性
- [ ] 3.2 属性组表：尺寸、位置、内边距、填充、文字颜色、字号、圆角、透明度；各组的 `read` / `write`
- [ ] 3.3 刻度优先写入：长度刻度判断、默认色板精确匹配、透明度写法、负值
- [ ] 3.4 增量修补：保留未识别 class 与变体 class、位置保持、幂等、清除
- [ ] 3.5 读取：非固定尺寸标记、冲突标记
- [ ] 3.6 候选过滤：`url(` 非 assets、`@import`、`expression(`、`javascript:`、跳出声明块字符；产出诊断
- [ ] 3.7 运行时编译器：候选收集、增量编译与缓存
- [ ] 3.8 测试：往返一致、幂等、修补保序、过滤用例

## 4. `@rea/document`：解析与事务
- [ ] 4.1 页面文件解析：静态子集、拒绝 `style` / 非字面量 className / 其他导入
- [ ] 4.2 清单解析与校验（`rea.json`）
- [ ] 4.3 `DocumentSession`：清单、页面映射、`rev`
- [ ] 4.4 操作 `set / text / insert / delete`（带 `pageId`），`set` 对 className 走 `@rea/tailwind` 修补
- [ ] 4.5 页面操作：新增、重命名、复制、删除（禁止最后一页）、排序
- [ ] 4.6 多文件原子事务：候选 → 重新解析所有被改动文件 → 提交
- [ ] 4.7 文件差异历史：撤销、重做、`coalesceKey` 合并（500ms）
- [ ] 4.8 测试：原子性（二个文件之一失败）、保留未涉及源码、锁定拒绝、撤销重做逐字节一致、合并

## 5. `@rea/renderer-dom`
- [ ] 5.1 按 className 渲染所有原语，`Ellipse` 默认 `rounded-full`
- [ ] 5.2 设计画布使用 Shadow DOM，注入编译出的 CSS
- [ ] 5.3 `Image` 使用资源的 blob URL
- [ ] 5.4 渲染时的预览覆盖改为合并 class 而不是覆盖 props
- [ ] 5.5 命中检测使用 `composedPath()`，保留 `data-design-id`

## 6. `@rea/storage`
- [ ] 6.1 IndexedDB 封装：`documents` / `assets` / `meta`，版本 1
- [ ] 6.2 文档增删改查、复制、最近打开
- [ ] 6.3 自动保存：防抖 500ms、单事务写入、状态上报、失败重试
- [ ] 6.4 `revision` 冲突检测
- [ ] 6.5 `.reaui` 导出（确定性）
- [ ] 6.6 `.reaui` 导入：路径安全、数量与大小与压缩比限制、清单与页面校验、同名处理
- [ ] 6.7 页面代码导出（含头部注释）
- [ ] 6.8 测试（`fake-indexeddb`）：多文档、原子写入、冲突、导出确定性、导出再导入一致、各类恶意 ZIP

## 7. 迁移与示例
- [ ] 7.1 v1 → v2 转换器：Page/viewport、style → className、形状原语、布局属性
- [ ] 7.2 启动流程：IndexedDB 为空 → 旧 localStorage 迁移 → 示例文档；记录 `migrated:v1`，不删除旧数据
- [ ] 7.3 导入旧 `.design.tsx` 的入口
- [ ] 7.4 内置示例文档（至少一个页面、两个画框、矩形/椭圆/文字）
- [ ] 7.5 测试：单视口、多视口（id 重新生成）、样式转换、损坏数据

## 8. 编辑器接入（最小改动，界面重做在 M2）
- [ ] 8.1 `useDocument` 改用 `DocumentSession` 与 `@rea/storage`
- [ ] 8.2 现有编辑器在新模型上能够：选择、移动、缩放、改属性、新增画框与图层、撤销重做
- [ ] 8.3 提供一个最小的文档列表对话框：新建、打开、导入、导出
- [ ] 8.4 现有测试按新结构重写，`pnpm build` 与 `pnpm test` 通过

## 9. 文档
- [ ] 9.1 更新 `README.md`、`docs/architecture.md`：层级、`.reaui` 格式、Tailwind 约定、迁移说明
- [ ] 9.2 新增 `docs/file-format.md`：`rea.json`、页面文件子集、`.reaui` 的完整规范
- [ ] 9.3 更新 `docs/verification.md`
