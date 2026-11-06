## Context

`packages/editor/src/components/Canvas.tsx` 是单文件画布主体：相机 `{x, y, zoom}` 存在组件内，`screenToWorld()` 以容器 `getBoundingClientRect()` 为基准；`.rea-canvas-content` 用 `transform: scale()` 渲染设计内容，`.rea-canvas-scene` 用 `translate + scale` 绘制选框、智能参考线等覆盖层，线宽与字号用 `1/zoom` 保持屏幕恒定。`guides` / `marks` 是 `useState`，仅在手势期间由 `SnapSession.snap()` 填充，`cancel()` 清空。

现有可复用机制：`DocumentSession.withMetadata()` 写文档元数据（不进撤销历史）、`StorageService` / `reaui.ts` 的 `.reaui` 导入导出白名单、`ui/Menu` 与 `ui/ContextMenu`（后者已支持 `checked`）、`home/data.ts` 的 `readStored` / `writeStored`（localStorage 前缀 `rea-home:`）、`Canvas.tsx` 的 pointer capture + `cancel()` 清理范式。

## Goals / Non-Goals

**Goals**

- Sketch 式标尺与手动参考线闭环，且不影响「TSX 是唯一设计真源」。
- 参考线随文档走；开关是全局偏好，三个入口状态一致。
- 所有几何读写沿用既有坐标契约与 Rust/WASM 吸附内核。

**Non-Goals**

见 `proposal.md`「非目标」。补充：不做标尺刻度单位设置、不做参考线与智能参考线合并成同一套数据结构。

## Decisions

### D1. 坐标基准与刻度算法

- 0 点固定为**页面世界坐标 (0,0)**，刻度单位设计 px；刻度位置 `screen = world * zoom + camera.x|y`（相对画布容器），与 `screenToWorld()` 严格互逆，负坐标照常显示。
- 纯函数放 `session/ruler.ts`：`niceStep(zoom)` 从 `1,2,5,10,20,50,100,200,500,1000,2000,5000` 中取满足 `step * zoom >= 8px` 的最小值作为次刻度步长，主刻度步长 `= step * 10` 并标注数字；`rulerTicks(camera, viewport, thickness)` 返回可见范围内的刻度数组。
- 覆盖 UI 缩放范围 10%–300%；刻度字号固定 10px 等宽，不随 `zoom` 变化；不使用 CSS `zoom`（见 `docs/architecture.md` D「缩放与 DPI」）。
- 顶部标尺对应水平参考线（y 值），左侧标尺对应垂直参考线（x 值）。

### D2. 标尺是固定屏幕覆盖层，不动相机

```
┌────┬──────────────────────────────────────────────┐
│ ▣  │  0    100    200    300   ← 顶部标尺 (20px)    │
├────┼──────────────────────────────────────────────┤
│ 0  │                                              │
│100 │   .rea-canvas-content / .rea-canvas-scene     │
│200 │   （相机坐标契约完全不变）                     │
└────┴──────────────────────────────────────────────┘
```

- 标尺与左上角 20×20 角块作为 `.rea-canvas-wrap` 内的绝对定位兄弟层（`z-index` 高于内容、低于对话框），**不**给 `.rea-canvas` 加 padding / gutter，避免改变 `worldPoint()` 的容器基准与所有既有命中计算。
- 代价：标尺会遮住画布最上 / 最左各 20px 区域。画布可无限平移、开关可随时关闭，且这比改动相机契约的风险低。
- 标尺本身用 `<svg>` 画刻度线 + 文本；刻度数组用 `useMemo([camera, size])`，指针位置指示通过 DOM ref 直接改 `style.left/top`，**不在每次 pointermove 触发画布重渲染**。
- 覆盖层默认 `pointer-events: none`，仅两条标尺条带自身与参考线命中带接收事件。

### D3. 参考线数据模型与持久化

新增文档元数据文件 `editor/guides.json`（常量 `EDITOR_GUIDES_FILE`）：

```json
{
  "version": 1,
  "pages": {
    "main": [
      { "id": "g_ab12", "axis": "x", "position": 120 },
      { "id": "g_cd34", "axis": "y", "position": 64 }
    ]
  }
}
```

- `axis: "x"` = 垂直参考线（由左侧标尺拖出，值为世界 x）；`axis: "y"` = 水平参考线（由顶部标尺拖出，值为世界 y）；`position` 为有限数字，写入时取整。
- 读写放 `session/guides.ts`：`parseGuides(text, pageIds)` / `serializeGuides(store)`；严格校验 version、page id、axis、有限 position、每页最多 200 条、总大小 ≤ 64KB；未知字段、未知页面、非法值一律丢弃而不是抛错。
- 写入走 `model.writeMetadata(EDITOR_GUIDES_FILE, text)` → `DocumentSession.withMetadata()`：**递增 rev、触发自动保存、但不进撤销历史**；页面删除后遗留的 key 在下一次写入时清理。
- 拖拽期间只改本地预览 state，**松手才写一次元数据**，避免 pointermove 期间反复触发保存。
- `withMetadata()` 的路径白名单从 `^agent/[a-z0-9-]+\.json$` 扩展为「精确常量 + `agent/*.json`」，只接受已知元数据文件，仍拒绝路径穿越与设计源文件路径。
- `reaui.ts`：导出时按路径排序加入该文件；导入时加入允许列表并解码，超过 64KB、非法 JSON 或结构不合法时**丢弃并给 warning，不阻断导入**（与 `agent/sessions.json` 一致）；旧文件缺该条目等价于空参考线。

### D4. 交互状态机（与图层手势隔离）

新增 `guideDrag = useRef<GuideGesture | null>`，独立于 `Canvas.tsx` 的 `gesture` 状态机：

| 状态 | 进入 | 结束 |
| --- | --- | --- |
| `creating` | 标尺条带 `pointerdown` + 移动 | 松手在画布内 → 创建；松手在来源标尺 → 取消 |
| `moving` | 参考线命中带 `pointerdown` | 松手在画布内 → 更新；松手在来源标尺 → 删除 |
| 取消 | `Esc` / `pointercancel` / `lostpointercapture` / `blur` | 恢复拖动前位置，或丢弃新线，不留历史 |

- 标尺与参考线的 `pointerdown` MUST `stopPropagation()`，避免触发 `.rea-canvas` 的图层选择 / 框选手势；用元素自身 `setPointerCapture()` 承接后续 move/up。
- 删除热区：垂直参考线的来源标尺是左侧条带，水平参考线是顶部条带；指针落在对应 20px 条带（含 8px 容差）时线变虚 / 显示「松开删除」标签。
- 坐标写入按设计 px 取整；按住 `Shift` 时按 8px 网格取整，与现有 `Shift` 网格吸附一致。
- 拖拽中在指针附近显示坐标徽标（`x 120` / `y 64`）；标签字号不随缩放变化。

### D5. 吸附接入：TS 侧双候选缓冲，Rust ABI 不变

- `SnapSession` 新增第三个可选参数 `guides: readonly Rect[] = []`：`others` 缓冲区写入「对象候选 + 参考线候选」用于 `snap_rects`；另分配 `othersMarks` 只写「对象候选」用于 `distribute_marks`。
- 参考线候选为零宽 / 零高矩形：垂直线 `{x: position, y: viewportTop, width: 0, height: viewportHeight}`，水平线 `{y: position, x: viewportLeft, width: viewportWidth, height: 0}`。Rust `Rect::edges()` 对 0 宽 / 高仍返回三条同值边，左 / 中 / 右（上 / 中 / 下）都能命中。
- 只把**屏幕可见**的参考线转成候选（视口 ± `6/zoom`），避免离屏参考线抢吸附；对象候选排在前，`snap_result` 用严格小于比较，距离相同时对象吸附优先。
- 双缓冲的必要性：`distribution()` 会把候选当作间距邻居，若参考线进入 `distribute_marks` 会产生大量虚假间距标注；同时保留原有 `dx/dy` 回退逻辑。
- 阈值继续用 `6 / camera.zoom`；按住 `⌘/Ctrl` 时走现有短路，参考线吸附一并暂停；标尺关闭时参考线不参与吸附。
- 不改 `crates/geometry`，不需要重新设计 ABI，只需在 `packages/geometry/src/geometry.test.ts` 增补「有 / 无参考线候选」对照用例。

### D6. 视觉与主题

- 新增 `--rea-manual-guide: #7c3aed`（紫），与智能参考线 `#c52b76`、间距标注 `#b43b12` 明确区分；拖拽 / 悬停态用 `--rea-accent` 的徽标与高亮，符合「蓝色表达操作状态」。
- 参考线为屏幕空间 1px 实线，贯穿整个画布视口；命中带 8px 透明；`z-index` 设在智能参考线（`.rea-guides` z-index 25）之下、内容之上。拖拽进入删除热区时改为虚线并降低不透明度。
- 标尺底色 `--rea-chrome`、1px `--rea-border` 分隔线、刻度文字 10px 等宽 `--rea-muted`；角块不接收事件。
- 新增 UI 使用构建期 Tailwind（例：坐标徽标 `className="pointer-events-none absolute rounded bg-[var(--rea-surface)] px-1 font-mono text-[10px] text-[var(--rea-muted)]"`，菜单勾 `className="size-3 text-[var(--rea-accent)]"`），外壳样式集中在 `theme.css`。
- 尊重 `prefers-reduced-motion`；参考线与标尺为 `aria-hidden="true"` 装饰层，可操作入口提供无障碍名称与 `aria-checked`。

### D7. 两个独立偏好与三个入口

- `Preferences` 增加两个可选布尔：**`showRulers` 默认 `false`**（用户确认标尺默认关闭）、**`showGuides` 默认 `true`**（文档里已有参考线时默认可见，避免「打开标尺却看不见拖出的线」）。`isPreferences()` 对缺字段的旧记录宽容；仍存 `rea-home:preferences`，复用 `readStored` / `writeStored`。
- `session/viewPreferences.ts` 提供 `useViewPreferences()`：一次性返回 `{ showRulers, showGuides, setShowRulers, setShowGuides }`；写入后派发 `rea:preferences` 自定义事件（同一页面内 HomeApp ↔ EditorApp 同步）并监听 `storage` 事件（多标签页同步）。
- **两个开关职责严格分离**：
  - `showRulers` 只管标尺条带、角块、指针位置指示，以及「从标尺拖出创建」入口；
  - `showGuides` 只管参考线渲染、命中带、右键操作与吸附候选；
  - 两者都不改动 `editor/guides.json` 里的数据，切换只是显示 / 交互层状态。
- **标尺隐藏时的删除闭环**：`showRulers=false` 且 `showGuides=true` 时参考线仍显示、可拖动改位置；删除不依赖可见标尺——拖到画布对应边缘 8px 内同样进入删除热区（显示「松开删除」），或走参考线右键菜单。这样两个开关真正独立，不会出现「关了标尺就删不掉线」。
- 三个入口读写同一对偏好：① 首页「设置 → 创作偏好」新增两行 `.home-setting-row` + `.rea-toggle` 复选框；② 顶栏**独立的「视图」`Menu` 按钮**（不是主菜单里的分组），含两个勾选项与「清除当前页面参考线」；③ 画布右键菜单同样提供两个勾选项与清除项。为此给 `ui/Menu` 的 `MenuItem` 增补可选 `checked` 并渲染 `role="menuitemcheckbox"` + `aria-checked`。
- `showGuides=false` 时参考线隐藏、不可拖拽、不进入吸附候选；`showRulers=false` 时仅隐藏标尺，参考线行为不受影响。

### D8. 菜单分层（画布 / 元素 / 参考线 / 视图）

用户确认「画布需要独立菜单，与当前图层和元素菜单不一样」，因此右键按命中目标分流，互不混排：

| 右键目标 | 菜单 | 内容 |
| --- | --- | --- |
| 画布空白处 | **画布菜单**（`canvasMenu()` 扩展） | 粘贴到此处、全选、适应全部、100%，加分隔线后接「显示标尺」「显示参考线」「清除当前页面参考线」 |
| 图层 / 元素 | **元素菜单**（现有 `layerMenu()`） | 保持原样，**不加入**任何标尺 / 参考线项 |
| 参考线命中带 | **参考线菜单**（新增 `guideMenu()`） | 「删除此参考线」「显示参考线」（checked）、「清除当前页面参考线」 |
| 顶栏 | **独立「视图」菜单**（新增 `Menu` 按钮） | 两个勾选项 + 清除当前页面参考线 |

- `CanvasMenuRequest` 增加 `guideId?: string`：`Canvas.tsx` 在参考线覆盖层拦截 `contextmenu` 时带上该 id，`EditorApp.tsx` 据此选择不同的 `ContextMenu` 条目与 `label`（画布菜单 / 元素菜单 / 参考线菜单）。
- 清除 / 删除立即写元数据，不进撤销历史；给出短提示「已清除 N 条参考线」。

### D9. 不触碰设计真源

参考线、标尺可见性、相机、选区都属于会话 / 元数据，不写入页面 TSX；`.reaui` 中的 `editor/guides.json` 与 `rea.json` 都不新增字段，代码导出结果逐字节不变。

## Risks / Trade-offs

- **覆盖层遮挡 20px 画布**：选择 overlay 而非 gutter，是为不改相机坐标契约；若验收不可接受，后续可改为「容器缩小 + 相机偏移」方案并补全套命中回归测试。
- **零尺寸候选污染间距标注**：用 D5 双缓冲隔离，需补 TS 参考实现对照测试。
- **元数据路径白名单放宽**：只接受精确常量与既有 `agent/*.json` 命名，不放开任意目录；导入时对大小 / 结构做容错丢弃。
- **指针事件与图层手势打架**：独立 `guideDrag` + `stopPropagation` + 统一清理入口；`Esc` 处理需与 `Canvas.tsx` capture 阶段的快捷键判断协调（`guideDrag` 优先）。
- **高频移动导致重渲染**：刻度 `useMemo`、指示器 DOM ref、预览局部 state、松手才写盘。
- **两个开关的组合行为容易混淆**：用 D7 的职责表与 D8 的菜单分层固定语义，并在设置页文案中写明「只影响显示与交互，数据始终保留」；`showGuides` 默认 true，避免「打开标尺却看不见拖出的线」。
- **参考线不进撤销历史**：符合 `withMetadata` 与 Sketch 习惯，但用户按 `⌘Z` 不会撤销删线；在设置项说明中写清楚。
- **新增顶栏「视图」按钮占用 44px 宽度**：窄屏（<650px）隐藏按钮文字但保留入口，视图项仍可从画布右键菜单访问。

## Open Questions

（2026-11-06 二次确认后，以下事项已定：标尺默认关闭、两个独立开关、不新增快捷键、色值 `#7c3aed`、删除热区为「来源标尺 + 8px 容差」、菜单分层。）

- 剩余待观察项：`showGuides` 默认 `true` 是实施取值（用户只指定了「标尺默认关闭」）；若希望两个开关都默认关闭，改动量仅为一处默认值。
- 参考线色值 `#7c3aed` 在浅色画布上的对比度，开发时在 `theme.css` 里做一次人工校验后定稿。
