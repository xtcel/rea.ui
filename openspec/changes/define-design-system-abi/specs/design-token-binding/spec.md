## ADDED Requirements

### Requirement: 文档固定与事务

文档 SHALL 通过 `design/system.json` 保存固定系统的完整快照，含 `id`、`revision`、`hash`、`tokens`、`components` 与 `guidelines`。快照 MUST 自包含：不依赖本机版本库即可解析、渲染与校验。固定、升级与取消固定 MUST 通过 `DocumentSession` 的单个事务提交（`SourceOperation{ type: 'system' }`），MUST 递增 revision 并进入撤销历史；写入系统文件时清单 MUST 升级为 v4。取消固定时若任一页面或组件目录仍包含 `var(--rea-ds-*)` 引用，MUST 拒绝并报告引用数量与位置，MUST NOT 自动改写源码。

#### Scenario: 固定升级清单

- **WHEN** 在 v3 文档上固定一个设计系统
- **THEN** 同一次提交写入 `design/system.json`、把 `rea.json` 升级为 v4，撤销一次同时回退两者

#### Scenario: 撤销固定

- **WHEN** 固定系统后按 `⌘/Ctrl+Z`
- **THEN** 系统文件消失、清单版本回到固定前，页面源码不变

#### Scenario: 取消固定被引用阻止

- **WHEN** 页面仍有 6 处 `var(--rea-ds-color-primary)` 时取消固定
- **THEN** 操作被拒绝并列出 3 个文件与 6 处位置，文档不变

#### Scenario: 快照自包含

- **WHEN** 把固定了系统的 `.reaui` 导入到没有该版本库的另一台机器
- **THEN** 画布按快照渲染，令牌引用全部解析，不提示缺少系统

### Requirement: 令牌引用语法

页面与组件目录的 `className` SHALL 允许引用固定系统的令牌，且 MUST 只接受 `var(--rea-ds-*)` 形式；变量名 MUST 已在快照中声明，否则校验 MUST 报 error `DS_TOKEN_UNDECLARED`。除 `--rea-ds-*` 外，`var()`、`calc()`、`env()` 与任意自定义属性 MUST 继续被拒绝。令牌引用 MUST 可用于颜色、间距、圆角、字体族 / 字号 / 行高 / 字重与阴影：

```tsx
<Rect
  designId="hero-card"
  className="absolute left-[64px] top-[64px] w-[400px] h-[240px] bg-[var(--rea-ds-color-surface)] text-[var(--rea-ds-color-text)] border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)] p-[var(--rea-ds-space-24)] shadow-[var(--rea-ds-shadow-card)]"
/>
<Text
  designId="hero-title"
  className="absolute left-[88px] top-[88px] w-[300px] text-[length:var(--rea-ds-typography-heading-size)] leading-[var(--rea-ds-typography-heading-line)] font-[number:var(--rea-ds-typography-heading-weight)] text-[var(--rea-ds-color-text)]"
>
  工作台
</Text>
```

位置与尺寸（`left` / `top` / `right` / `bottom` / `w-` / `h-`）MUST 继续使用设计 px 字面量或既有刻度，MUST NOT 使用间距令牌，避免布局随系统改版漂移。

#### Scenario: 合法引用通过

- **WHEN** `className` 使用上文示例中的 `var(--rea-ds-*)` 令牌
- **THEN** `validate` 通过，画布显示快照中的颜色、圆角与间距

#### Scenario: 未声明变量报错

- **WHEN** `className` 含 `bg-[var(--rea-ds-color-brand)]`，而快照未声明 `color.brand`
- **THEN** 校验报 `DS_TOKEN_UNDECLARED`，指出文件、节点与变量名

#### Scenario: 其它自定义属性仍被拒绝

- **WHEN** `className` 含 `bg-[var(--my-brand)]` 或 `w-[calc(100%-32px)]`
- **THEN** 校验失败并提示只允许 `--rea-ds-*` 令牌引用

#### Scenario: 布局不使用间距令牌

- **WHEN** 节点使用 `left-[var(--rea-ds-space-24)]`
- **THEN** 校验失败并提示位置与尺寸必须使用 px 字面量

### Requirement: 渲染与导出注入

渲染器 SHALL 在 Shadow DOM 的 `:host` 上为固定快照的每个令牌生成 CSS 自定义属性，令牌引用 MUST 在画布中解析为实际值；未固定系统时 MUST 不生成任何 `--rea-ds-*`。`reaui preview` 与页面 HTML 导出 MUST 在输出根作用域（`:root`）写入同一组变量，且 MUST 与画布调用同一个派生函数，MUST NOT 各自维护映射表。编辑器外壳样式 MUST NOT 使用 `--rea-ds-*`；文档令牌 MUST NOT 覆盖 `--rea-*` 外壳令牌。

#### Scenario: 画布解析

- **WHEN** 页面使用 `bg-[var(--rea-ds-color-primary)]` 且快照 `color.primary` 为 `#356AF0`
- **THEN** 画布中该节点计算背景为 `rgb(53, 106, 240)`

#### Scenario: 预览与画布一致

- **WHEN** 对同一文档运行 `reaui preview` 并打开编辑器画布
- **THEN** 两边的令牌取值与引用结果一致，预览 HTML 的 `:root` 含全部令牌变量

#### Scenario: 无系统不注入

- **WHEN** 文档没有 `design/system.json`
- **THEN** 画布与预览都不输出 `--rea-ds-*`，页面中的令牌引用按未声明报错

#### Scenario: 外壳不受影响

- **WHEN** 用户把系统 `color.primary` 改为红色
- **THEN** 编辑器工具栏、面板与选中态颜色保持 `--rea-*` 取值不变

### Requirement: 换肤不触碰页面源码

重新固定或升级到令牌值不同的版本时，系统 MUST 只替换 `design/system.json`，MUST NOT 修改任何 `pages/*.page.tsx` 或 `components/*.tsx`；所有令牌引用 MUST 立即呈现新值，`.reaui` 中页面文件 MUST 保持逐字节不变。

#### Scenario: 升级只改快照

- **WHEN** 把 `color.primary` 从 `#356AF0` 升级为 `#0F8A5F`
- **THEN** 页面文件逐字节不变，画布中所有主色引用变为新色

#### Scenario: 字面量不跟随

- **WHEN** 某节点写死 `bg-[#356AF0]` 后执行同一次升级
- **THEN** 该节点颜色不变，conformance 报告继续把它列为字面量

### Requirement: 属性面板与既有文档

属性面板 SHALL 在用户选择的颜色、圆角或间距与某个令牌取值相等时写入令牌引用，而不是字面量；用户显式输入非令牌值时 MUST 允许写入字面量，MUST NOT 强制归一。既有字面量 MUST NOT 被自动改写；conformance 报告 MUST 逐条列出字面量位置并给出「最接近的令牌」建议，普通保存 MUST NOT 因字面量而失败。字号、行高、字重在本期 MAY 继续写入 px / 数值字面量。

#### Scenario: 选择主色写入引用

- **WHEN** 用户在属性面板把填充设为主色 `#356AF0`，且快照 `color.primary` 等于该值
- **THEN** `className` 写入 `bg-[var(--rea-ds-color-primary)]`，不写入 hex

#### Scenario: 手输 hex 仍可保存

- **WHEN** 用户手动输入 `#FF00AA`
- **THEN** 保存成功，报告中新增一条 `DS_LITERAL_COLOR` warning 与最近令牌建议

#### Scenario: 旧文档不被改写

- **WHEN** 固定系统后打开一个全部使用字面量的旧页面并保存
- **THEN** 页面源码不发生任何令牌替换，只有报告新增 warning

#### Scenario: 报告给出建议

- **WHEN** 页面使用 `#356AF1`，与 `color.primary` 的 `#356AF0` 相差 1
- **THEN** 报告建议 `color.primary` 并标注色差，但不自动改写
