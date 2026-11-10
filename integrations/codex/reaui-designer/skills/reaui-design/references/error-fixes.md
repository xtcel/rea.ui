# 校验错误与修复

`reaui validate --json` 有两种形态：静态文档错误返回
`{ ok:false, errors:[{code,path,message,hint}] }`；完整报告（通过或设计系统一致性）
返回 `{ ok, document, pages, system, issues:[{code,severity,path,node?,message,hint}], warnings }`。
先看 `errors[0]`，没有 `errors` 时再看 `issues` 中第一条 `severity: "error"`。按
`code` 查表，只改 `path` 指向的文件与 `message`/`node` 指向的位置，然后立即重新校验。

## 错误码

| code | 含义 | 修复 |
|---|---|---|
| `PAGE_SUBSET` | 用了不允许的节点或模块 | 换成 `Page/Frame/Group/Rect/Ellipse/Text/Vector/Line/Polygon/Star` |
| `PAGE_STATIC_ONLY` | 出现非静态表达式 | 改成静态字面量；去掉函数、事件、变量、`map`、模板字符串 |
| `DESIGN_ID` | designId 非法或重复 | 小写连字符，页面内唯一 |
| `MANIFEST_INVALID` | 清单字段/版本/页面路径不合法 | 用 `reaui init` 重新生成清单，**不要手改** |
| `PAGE_MISSING` | 清单引用的页面缺失 | 补 `pages/<id>.page.tsx` 或修正清单 |
| `PAGE_ID_MISMATCH` | `Page.id` 与清单 id 不一致 | 改成一致 |
| `NODE_LOCKED` | 修改了锁定节点 | 先解锁父级再改 |
| `REAUI_INVALID` | ZIP 损坏或格式不支持 | 用 `reaui pack` 重新打包，不要手写 ZIP |
| `DOC_INVALID` | 文档级错误：顶层 Frame 缺 `absolute`/尺寸、输出路径不存在等 | 按 message 修复；I/O 类先创建目标目录 |
| `IO_NOT_FOUND` / `IO_NOT_DIR` | 目标文件/目录不存在或类型不对 | 检查路径、先创建目录 |
| `DS_SCHEMA` | 设计系统字段不合法 | 按 `protocol.md` §9 修 `design/system.json`，或重跑 `pin-system.mjs` |
| `DS_SCHEMA_UNSUPPORTED` | `schemaVersion` 过高 | 用当前支持的 `schemaVersion: 1` |
| `DS_HASH_MISMATCH` | 快照 hash 与内容不符 | 用 `pin-system.mjs` 重新计算并固定 |
| `DS_TOKEN_UNDECLARED` | 页面引用了系统未声明的令牌 | 改用系统里已有的 `var(--rea-ds-*)`，或升级系统包 |
| `DS_TOKEN_INVALID` | 令牌值/结构不合法 | 修系统包对应字段 |
| `DS_LITERAL_COLOR` | 固定系统后仍写死颜色（warning） | 优先替换为令牌；不强制时可在交付说明里注明 |
| `DS_OFF_SCALE` | 字号/间距不在系统刻度内（warning） | 尽量靠到刻度；警告不阻断 |
| `DS_CONTRAST` | 前景/背景对比度不足（warning） | 调整颜色令牌 |
| `DS_SYSTEM_MISMATCH` | `--system` 与文档固定系统不一致 | 用同一版本系统，或先重新固定 |
| `DS_REQUIRES_V4` | 页面用了令牌但清单不是 v4 | 用 `pin-system.mjs` 固定为 v4 |
| `DS_COMPONENT_MISSING` | 系统条目引用的组件不存在（warning） | 导入组件库或从条目移除 `component` |

## 症状 → 根因

### 1. 编辑器报「无法打开「x.reaui」：rea.json 清单格式不合法。」

两种常见原因：

**(a) 清单被手工改过。** 清单只允许 6 个字段且版本必须为 2/3/4。
不要逐字段修 JSON：`unpack`/`init` 重建文档，或从有效备份恢复。

**(b) 文档是 v4，编辑器版本旧。** v4（带 `design/system.json`）只在支持 v4 的
REA UI 构建中可打开；REA UI 0.1.0（2026-11-07 构建）只支持 v2/v3。
用 CLI 确认版本：

```bash
node "$SKILL_DIR/scripts/reaui.mjs" validate x.reaui --json   # document.version
```

确认后二选一：让用户升级/重编译桌面端，或交付 v2 版本（重新 `init` + 页面，不带
`design/system.json`）。**不要**为了让它打开而手改 version。

### 2. 设计稿被生成到插件目录、用户项目里找不到

MCP 工作区是插件安装目录（宿主约束）。用 CLI 导出到项目：

```bash
reaui() { node "$SKILL_DIR/scripts/reaui.mjs" "$@"; }
reaui validate <pluginRoot>/designs/<doc> --json
reaui pack <pluginRoot>/designs/<doc> --out <project>/designs/<slug>.reaui --force
```

之后按用户意愿清理插件目录里的草稿。详见 `mcp.md` §2。

### 3. stderr 出现 `WebSocket server error: listen EPERM 0.0.0.0:24678`

沙箱环境里 Vite 的端口探测被拒绝，**命令仍然成功**。以退出码和 `--json`
输出为准，不要重试或改写命令。

### 4. 用了 HTML 标签

```tsx
// 错误
<div className="p-4"><span>标题</span></div>

// 正确
<Frame designId="card" className="absolute left-0 top-0 w-[320px] h-[180px] p-4">
  <Text designId="card-title" className="absolute left-0 top-0 w-[200px] h-[24px] text-[16px]">标题</Text>
</Frame>
```

`div` → `Frame`；纯色块 → `Rect`；文字 → `Text`；圆 → `Ellipse`；图标 → `Vector`。

### 5. 用了事件或函数

```tsx
// 错误
<Text designId="btn" onClick={() => save()}>保存</Text>

// 正确：设计稿不承载交互，按钮用 Rect + Text 叠出来
<Rect designId="btn-bg" className="absolute left-0 top-0 w-[88px] h-[32px] bg-[#356af0] rounded-[6px]" />
<Text designId="btn-label" className="absolute left-0 top-0 w-[88px] h-[32px] text-[14px] text-[#ffffff]">保存</Text>
```

### 6. 用了变量或 map

```tsx
// 错误
{items.map(item => <Text key={item.id}>{item.name}</Text>)}

// 正确：展开为静态节点
<Text designId="row-1" className="absolute left-[24px] top-[80px] w-[200px] h-[22px] text-[14px]">张三</Text>
<Text designId="row-2" className="absolute left-[24px] top-[132px] w-[200px] h-[22px] text-[14px]">李四</Text>
```

### 7. 顶层 Frame 缺尺寸

```tsx
// 错误
<Frame designId="page" className="w-full h-full">

// 正确
<Frame designId="page" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-[#f6f7f9]">
```

顶层 Frame 必须含 `absolute` 与显式宽高；`left-0 top-0` 推荐但非强制
（缺 `absolute`/尺寸会报 `DOC_INVALID`）。

### 8. designId 重复或格式错误

同一页面内每个 `designId` 唯一，匹配 `^[a-z][a-z0-9-]{1,63}$`。
列表项用 `row-1`、`row-2`，卡片用 `card-1`、`card-2`，不要复用 `card`。

### 9. 用了 style（或百分比约定）

`style` 会被校验拒绝（`DOC_INVALID`）；百分比/`vw`/`vh`/`calc()` 属于协议禁止的
写法，校验器不一定会报错，但不要使用。

```tsx
// 错误
<Rect designId="box" style={{ width: '50%', background: '#eee' }} />

// 正确
<Rect designId="box" className="absolute left-0 top-0 w-[480px] h-[120px] bg-[#eeeeee]" />
```

### 10. 用了 Image

core profile 不支持图片资源。用 `Rect` 占位 + `Vector` 图标表达图片区域，
并在交付说明中标注「图片位待替换」。full profile 的 `Image` 只能引用
`assets/…` 且必须同时打包资源。

## 修复纪律

1. 一次只处理 `issues` 里第一条 error，改完立即重新校验。
2. 不因为一个错误重写整页，也不靠删除内容让校验通过。
3. 连续 3 轮仍失败：停止，向用户报告 `code`/`path`/`message`/`hint`。
4. 不要把未通过校验的文档打包或交付。
5. 不要手改 `rea.json`、手改 `version`、手工拼 ZIP——这三件事是上一次
   「清单格式不合法」类问题的源头。
6. 退出码：`0` 通过；`1` 校验/文档/I/O 失败；`2` 命令行用法错误。
