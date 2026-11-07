> 实施说明：按 2026-11-06 二次确认（标尺默认关闭、两个独立开关、`#7c3aed`、菜单分层）、第三次确认（单击标尺即建线、沿法线拖出画布删除、右键标尺按方向删、`⌃R` + 选区区间高亮 + 角块右键清除全部）、第四轮的视觉细节（参考线绘制在标尺之上、命中带让出标尺条带、预览线与标尺重叠部分保持不透明）与第五轮的交互修正（移除跟随鼠标的标尺指示线、改为悬停标尺即预览、拖动时保留落点标记）修订了任务描述，使其与最终实现一致。**2026-11-07 第六轮修正**：用户确认从未要求「可拖动的标尺原点」，Sketch / Figma 也没有这种设计；已把原点拖动 / 锁定 / 重置整套移除，0 点固定为页面世界坐标 (0,0)，详见第 8 组。未勾选项为确实尚未完成的工作，不因自动检查通过而代签。

## 1. 文档元数据通道（document / storage）

- [x] 1.1 在 `packages/document/src/manifest.ts` 增加 `EDITOR_GUIDES_FILE = 'editor/guides.json'`，并从包入口导出
- [x] 1.2 放宽 `DocumentSession.withMetadata()` 的路径白名单至「精确常量 + `agent/*.json`」，错误信息改为通用「元数据超过大小限制」
- [x] 1.3 在 `packages/storage/src/reaui.ts` 的导出、导入允许列表、文本解码列表与「清单未引用页面」例外中加入该文件；导入时对超过 64KB / 非法 JSON / 顶层非对象容错丢弃并 warning
- [x] 1.4 测试：`packages/document/src/metadata.test.ts` 增补新路径、拒绝设计源路径、大小限制、撤销不回滚；新建 `packages/storage/test/guides-file.test.ts` 覆盖 `.reaui` 往返、损坏文件、旧容器兼容、导出确定性

## 2. 标尺刻度纯函数与组件（editor）

- [x] 2.1 新增 `packages/editor/src/session/ruler.ts`：`niceStep(zoom)`、`rulerTicks(offset, zoom, viewport)`、`worldToScreen(world, offset, zoom)`、`RULER_THICKNESS`，含负坐标与 10%–300% 边界；0 点固定为页面世界坐标 (0,0)，标签直接取世界坐标（第 8 组移除 `origin` 参数）
- [x] 2.2 测试 `ruler.test.ts`：100% / 50% / 10% / 300% 的步长与标签、平移后 0 点、负刻度、刻度数量上限与 `-0` 正规化；以及「任意平移 / 缩放下世界 0 恒读 0」回归
- [x] 2.3 新增 `components/CanvasRulers.tsx`：顶部 / 左侧 SVG 刻度条带 + 角块，随 `camera` / `size` 用 `useMemo` 重算刻度；`pointerdown` 使用自身 pointer capture，按 `classifyRulerDrag()` 分流为单击建线 / 向画布拖出建线（沿轴拖动无效）；角块仅提供右键菜单；`range` 非空时绘制选区色带
- [x] 2.4 标尺**不再**跟随鼠标显示位置指示（初版在容器上挂 passive `pointermove` 用 DOM ref 写指示位置的实现已移除）。改为两条提示：`CanvasRulers` 在条带的 `pointermove` / `pointerleave` 上通知 `Canvas` 计算 `guideHover` 悬停预览；拖拽参考线时通过 `activeGuide` 在条带内画 3px 落点标记
- [x] 2.5 在 `apps/web/src/theme.css` 增加标尺覆盖层、刻度文字、落点标记、角块（含 `pointer-events:auto` 以接管自身右键）与区间色带样式（20px、`--rea-chrome` / `--rea-border`、10px 等宽；第 8 组移除 `is-locked`）
- [x] 2.6 新增 `components/rulerGesture.ts` 纯函数：`classifyRulerDrag()`（<4px 为 `pending`、沿轴为 `ignored`、跨轴为 `guide`）、`clickGuideAxis()`、`isOutsideCanvas()`；测试 `rulerGesture.test.ts` 6 项，覆盖分流、沿轴拖动无效与四向出界判定，并守卫「沿法线出界才删」的不对称性（第 8 组移除 `shiftOrigin()`）
- [x] 2.7 悬停预览：`CanvasGuides` 增加 `preview` prop 与 `.rea-manual-guide.is-preview`（55%），复用 `.rea-guide-cap` 让压在标尺上的那段保持实色；`showGuides` 关闭时预览仍然渲染（`!visible && !preview` 才提前返回），`showRulers` 关闭或已有手势时预览让位；徽标统一由 `marker`（手势线或预览）驱动。`guidesOverlay.test.ts` 增补预览与落点标记的样式契约

## 3. 参考线数据模型与覆盖层（editor）

- [x] 3.1 新增 `packages/editor/src/session/guides.ts`：类型、`parseGuides(text, pageIds)`、`serializeGuides(store, pageIds)`、`withPageGuides()`、`guideSnapRects()`、`appendGuide()`，含页面清理与 200 条 / 64KB 上限
- [x] 3.2 测试 `guides.test.ts`：合法结构、旧 / 损坏 / 未知页面 / 非法坐标容错、上限、序列化确定性、视口裁剪与零尺寸吸附候选
- [x] 3.3 数据接线放在 `EditorApp.tsx`：`useMemo` 从 `model.current.files[EDITOR_GUIDES_FILE]` 读取，松手时经 `model.writeMetadata()` 一次写入，拖拽期间只更新本地预览（未另抽 `useManualGuides()` hook）
- [x] 3.4 新增 `components/CanvasGuides.tsx`：屏幕空间 1px 线 + 8px 命中带 + 坐标徽标；`--rea-manual-guide` 令牌写入 `theme.css` 与 `DESIGN.md`。视口裁剪按轴取宽度 / 高度，且**正在拖拽的那条永不卸载**（卸载会丢指针捕获、把手势一起取消）
- [ ] 3.5 组件级 `guidesInteraction.test.ts`（创建 / 拖动 / 拖出画布删除 / `Esc` 取消 / 视口外不渲染）**未补**：测试环境是 node 且项目无 DOM 渲染依赖。改由 `guideGesture.test.ts`（事件接线行为）、`guidesOverlay.test.ts`（CSS 命中契约）、`rulerGesture.test.ts` / `ruler.test.ts` / `guides.test.ts`（纯函数）覆盖，实机手势并入 7.2 人工验收；`Shift` 8px 网格已在 `snapGuidePosition()` 实现

## 4. 交互状态机接入 Canvas

- [x] 4.1 在 `Canvas.tsx` 增加 `guideDrag` ref 与 `creating` / `moving` 状态；新增 `components/guideGesture.ts`，因覆盖层是 `.rea-canvas` 兄弟节点、pointer capture 不冒泡经过画布 handler，改在 `window` 捕获阶段绑定 `pointermove` / `pointerup` / `pointercancel` / `lostpointercapture`，画布内分支仅作兜底
- [x] 4.2 实现「沿参考线法线方向拖出画布即删除」：`isOutsideCanvas()` 按 `getBoundingClientRect()` 判定，竖线只看左右、横线只看上下，且仅在松开时生效；删除态使用 `is-deleting` 半透明样式并显示提示文案。已废弃「拖回来源标尺」的写死 28px 边带与「标尺隐藏时退化为边缘 8px」逻辑
- [x] 4.3 接入 `Esc` / `pointercancel` / `lostpointercapture` / 窗口失焦的统一清理，保证不残留预览、不影响图层选区；`bindGuideGesture()` 在 dispose 时解绑全部监听。另修复 `.rea-manual-guide-hit` 继承 `pointer-events:none` 导致参考线无法命中的问题，并由 `guidesOverlay.test.ts` 守卫 CSS 契约
- [x] 4.4 新增 `Canvas` props：`showRulers`、`showGuides`、`guides`、`onGuidesChange`、`onGuideContextMenu`、`onRulerContextMenu`（第 8 组移除 `rulerOrigin` / `rulerLocked` / `onRulerOriginChange`）；单击建线由内部 `createGuideFromRuler()` 处理（复用 `appendGuide` 的取整与 200 条上限），`selectionBox` 同时作为标尺区间高亮的数据源
- [ ] 4.5 `editor.test.tsx` 的「标尺手势不触发框选 / 移动」「关闭标尺后行为与普通画布一致」集成用例**未补**（同上，node 无 DOM 手势环境），并入 7.2 人工验收

## 5. 吸附接入（geometry / editor）

- [x] 5.1 在 `packages/geometry/src/index.ts` 的 `SnapSession` 增加第三参数 `guides`，分配独立的对象候选缓冲区供 `distribute_marks` 使用，`snap_rects` 使用合并缓冲区；保持旧调用兼容，不改 Rust ABI
- [x] 5.2 测试 `geometry.test.ts`：参考线命中的偏移与 guides 输出、双缓冲下 `marks` 不变、等距对象优先、1000 次手势内存稳定、无参考线参数时行为不变
- [x] 5.3 在 `Canvas.tsx` 的 `new SnapSession(...)` 处，把当前页面可见参考线转换成零宽 / 零高矩形注入；`⌘/Ctrl` 短路与 `showGuides=false` 时不注入（按二次确认，吸附开关跟随「显示参考线」而非「显示标尺」）
- [x] 5.4 `session/guides.test.ts` 增补 `guideSnapRects()` 纯函数用例（可见性裁剪、坐标换算与零尺寸矩形）

## 6. 两个独立偏好与菜单分层（home / ui / editor）

- [x] 6.1 `home/data.ts` 的 `Preferences` 增加可选 `showRulers`（默认 `false`）与 `showGuides`（默认 `true`），`isPreferences()` 兼容旧记录
- [x] 6.2 新增 `session/viewPreferences.ts`：`useViewPreferences()` 暴露两个开关与独立 setter，导出 `setViewPreferences()`；`rea:preferences` 自定义事件（同页）+ `storage` 事件（跨标签页）同步
- [x] 6.3 测试 `viewPreferences.test.ts`：两个默认值、旧记录兼容、独立读取与写入、写入保留其它偏好键、非法字段回退、localStorage 缺失 / 损坏容错、事件派发。hook 的 `storage` 监听因无 DOM 渲染环境未做自动测试，并入 7.2 人工验收
- [x] 6.4 首页设置页「创作偏好」增加两行独立开关与说明文案（数据始终保留）
- [x] 6.5 `ui/index.tsx` 的 `MenuItem` 增加可选 `checked`，`MenuPopup` 渲染 `role="menuitemcheckbox"` / `aria-checked` / 勾选图标；顶栏新增**独立的「视图」`Menu` 按钮**（两个勾选项、显示标尺带 `⌃R` 提示、清除参考线），不并入主菜单（第 8 组移除原点锁定 / 重置）
- [x] 6.6 菜单四层分流：`CanvasMenuRequest` 增加 `guideId?` 与 `rulerZone?`；`layerMenu.ts` 增加 `canvasMenu()` 的两个勾选项、`guideMenu()`、以及新的 `rulerMenu(zone, actions)`（顶部删垂直、左侧删水平、角块清除全部 + 两个显示开关）；`EditorApp.tsx` 按 `rulerZone` / `guideId` / `hits` 分流，`ContextMenu` 使用各自的 label（画布操作 / 参考线操作 / 标尺操作 / 元素操作）
- [x] 6.7 `layerMenu.test.ts` 同级新增 `guidesMenu.test.ts`：旧画布菜单兼容、两个独立勾选项、清除项禁用态、独立参考线菜单、元素菜单不含视图项
- [ ] 6.8 `editor.test.tsx` 的三入口状态一致 / 两开关独立 / 清除仅影响当前页面 / `showGuides=false` 不吸附的集成用例**未补**：当前由单元与纯函数测试覆盖各分支，实机组合并入 7.2 人工验收
- [x] 6.9 补齐「添加参考线」入口：`appendGuide()`（取整 + 200 条上限）；`canvasMenu()` / `guideEntries()` 增加「添加垂直 / 水平参考线」；顶栏「视图」菜单同样提供（视口中心），画布右键使用落点世界坐标；单击标尺为第四条入口；`showGuides=false` 时任何添加（含单击标尺）都先自动开启显示（`onRevealGuides`）
- [x] 6.10 测试：`guides.test.ts` 增补 `appendGuide()` 的取整、不可变、上限与非有限坐标；`guidesMenu.test.ts` 增补两个添加项的文案、顺序、回调参数，以及未提供 `addGuide` 时不出现
- [x] 6.11 `guidesMenu.test.ts` 增补 `rulerMenu()` 5 项：顶部只删垂直（断言 `clearGuides('x')`）、左侧只删水平、角块清除全部（`clearGuides()`）、空方向 / 空页面禁用并带 hint、三区都提供两个开关且不含原点锁定 / 重置（`⌃R` 提示）

## 7. 验证与文档

- [x] 7.1 运行 `pnpm test`、`pnpm test:rust`、`pnpm typecheck`、`pnpm build` 并修复回归；确认既有智能参考线、间距标注、绘制 / 移动 / 缩放手势无退化。结果见 `docs/verification.md`
- [ ] 7.2 浏览器人工验收**部分完成**：2026-11-06 用无头 Chrome（1440×900，CDP 真实指针事件）四轮验证了标尺开关、四条添加入口、**单击标尺建线**、拖动改位置、**竖线拖出右边界 / 横线拖出上边界删除**、参考线右键菜单删除、**顶部标尺右键按方向删除**、**角块右键清除全部**、**选区区间色带**（原点拖动 / 锁定相关验收已随第 8 组作废）、**参考线压过标尺且命中带让出标尺条带**、**悬停标尺即预览且移开消失**、**画布内移动标尺不再有指示线**、**拖动时落点标记出现 / 松手消失**、**关闭显示参考线时预览仍在**、刷新恢复，记录见 `docs/verification.md`。**仍缺**：50% / 200% 缩放下的刻度与命中对齐、`Esc` / `pointercancel` / 失焦实机、`.reaui` 往返恢复、跨标签页同步、移动端（≤900px）抽屉与参考线共存、吸附视觉提示组合
- [x] 7.3 更新 `docs/file-format.md`、`docs/architecture.md`、`docs/verification.md`、`DESIGN.md`、`README.md`
- [x] 7.4 新增 `⌃R` 开关标尺（只拦截 `Ctrl+R`，`⌘R` 留给浏览器），并同步 `EditorApp.tsx` 的快捷键一览对话框；`⌃R` 同时出现在顶栏「视图」菜单与标尺右键菜单的快捷键提示中

## 8. 固定标尺 0 点（2026-11-07 第六轮修正）

用户指出「可拖动的标尺原点」从未提出过需求，Sketch / Figma 也无此设计；该能力是调研 Sketch 文档时自行扩展的，且沿轴拖动会按 `dx / zoom` 悄悄平移读数（10% 缩放下拖 900px 会让页面 0 点读成 `-9000`）。本轮整套撤销。

- [x] 8.1 `ruler.ts` 的 `rulerTicks()` 移除 `origin` 参数，标签直接取世界坐标；顶部 / 左侧标尺 0 点恒为页面世界坐标 (0,0)
- [x] 8.2 `rulerGesture.ts` 移除 `shiftOrigin()`，`classifyRulerDrag()` 的沿轴结果由 `origin` 改为 `ignored`（无操作）
- [x] 8.3 `CanvasRulers.tsx` / `Canvas.tsx` / `EditorApp.tsx` 移除 `origin` / `locked` / `onOriginChange` / `rulerOrigin` / `rulerLocked` / `onRulerOriginChange`，删除角块双击重置与锁定图标；沿轴拖动不再触发任何状态更新
- [x] 8.4 `layerMenu.ts` 的 `rulerMenu()` 与顶栏「视图」菜单删除「锁定标尺原点」「重置标尺原点」；`theme.css` 删除 `.rea-ruler-corner.is-locked`
- [x] 8.5 测试同步：`ruler.test.ts`（世界 0 恒读 0）、`rulerGesture.test.ts`（沿轴拖动 `ignored`）、`guidesMenu.test.ts`（菜单不含原点项）、`CanvasRulers.test.tsx`（0 点固定、无锁定样式）
- [x] 8.6 同步 `specs/canvas-rulers/spec.md`、`specs/manual-guides/spec.md`、`proposal.md`、`DESIGN.md`、`README.md`、`docs/architecture.md`、`docs/verification.md`，并补 CDP 真机复核：横向拖动后刻度不变、页面 0 点仍读 0
