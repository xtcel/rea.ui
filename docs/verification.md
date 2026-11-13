# 标尺与参考线验证记录（2026-11-06）

实施日期：2026-11-06。对应 OpenSpec `add-canvas-rulers-and-guides`。自动检查与文档任务 7.1 / 7.3 / 7.4 已完成；**7.2 浏览器人工验收保持未勾选**，见下文边界。

## 自动检查

| 检查 | 结果 |
|---|---|
| `pnpm typecheck` | 通过 |
| `pnpm test`（含 `build:wasm`） | 47 个测试文件：45 通过 / 2 跳过；375 项测试：373 通过 / 2 跳过 |
| `pnpm test:rust`（`cargo test --workspace`） | 15 项通过：geometry 7、local-agent 5、desktop 3 |
| `cargo fmt --all -- --check` | 通过 |
| `pnpm build` | WASM、TypeScript、Vite 生产构建通过 |
| `openspec validate add-canvas-rulers-and-guides --strict` | 通过 |
| `git diff --check` | 通过 |

构建产物：`index.js` 约 1.23MB（gzip 约 356kB）、CSS 约 96.8kB（gzip 约 18kB）、`rea_geometry.wasm` 84.58kB（gzip 32.81kB）。仍保留既有的单 chunk 大于 500kB 提示，本次未做体积优化。

`cargo fmt` 首次检查发现 `crates/geometry/src/lib.rs` 的 `mod pencil;` / `mod snapping;` 顺序与 rustfmt 不一致；该文件来自历史提交 `471a56b`，git 原本干净，并非本提案改动。按 rustfmt 顺序调整这两个声明（无行为影响）后复查通过。

本轮 shell 的默认 PATH 未包含 `~/.cargo/bin`，直接执行 `pnpm test` 会因 `spawnSync cargo ENOENT` 失败。使用 `PATH="$HOME/.cargo/bin:$PATH"` 重跑后脚本本身通过；此前用已编译 WASM 执行的 `pnpm exec vitest run` 得到当时相同的 344 项通过 / 2 项跳过结果，说明只是工具链环境问题，不是测试回归。上表数字为补入 `guideGesture.test.ts` / `guidesOverlay.test.ts` 及两项偏好写入测试后的最终全量结果。

## 新增覆盖

- `session/ruler.test.ts`：`worldToScreen()` 互逆、`niceStep()` 在 10%–300% 的步长、主刻度标签、平移后 0 点、负坐标与刻度数量上限（含 `-0` 正规化）。
- `session/guides.test.ts`：合法结构、非法 / 损坏 / 未知页面条目容错、确定性序列化、页面清理、200 条上限、`guideSnapRects()` 视口裁剪与零宽 / 零高候选。
- `session/viewPreferences.test.ts`：两个默认值、旧记录兼容、独立读取与写入、写入保留其它偏好键、`rea:preferences` 事件派发、非法字段回退、localStorage 缺失 / 损坏容错。`useViewPreferences()` hook 的 `storage` 监听因 node 测试环境无 DOM 渲染依赖，未做自动测试。
- `components/guidesMenu.test.ts` 与既有 `layerMenu.test.ts`：画布菜单两个独立勾选项、清除项禁用态、独立参考线菜单、元素菜单不含视图项、不传 view actions 时旧画布菜单不变。
- `components/guideGesture.test.ts`：捕获阶段绑定四种指针事件、事件字段转发、非激活态静默、`pointercancel` 的 pointerId 匹配、dispose 解绑且不吞掉画布事件。
- `components/guidesOverlay.test.ts`：覆盖层容器 `pointer-events:none`、标尺条带与命中带 `pointer-events:auto` / `touch-action:none`、标尺 > 智能参考线 > 手动参考线的层级顺序。
- `document/src/metadata.test.ts`：`editor/guides.json` 可写、拒绝设计源路径、大小限制、写入不进入撤销历史。
- `storage/test/guides-file.test.ts`：`.reaui` 往返与导出确定性、损坏 / 非对象 / 超大文件丢弃并告警、旧容器无告警。
- `geometry/src/geometry.test.ts`：参考线吸附命中、双缓冲下 `marks` 不受零尺寸候选影响、等距对象优先、1000 次会话内存稳定、旧两参数调用兼容。
- 既有智能参考线、间距标注、绘制 / 移动 / 缩放手势、属性面板与组件 / 矢量测试全部回归通过。

## 静态审查修复

自动化全绿后对覆盖层接线做了一轮静态审查，发现两个测试抓不到、但会让交互完全失效的问题，均已修复并补上守卫：

1. **拖拽事件收不到**：标尺 / 参考线覆盖层是 `.rea-canvas` 的兄弟节点，`setPointerCapture()` 把后续 `pointermove` / `pointerup` 定向到覆盖层元素，冒泡不经过 `.rea-canvas` 的 handler，`updateGuideDrag()` / `finishGuideDrag()` 不会执行。新增 `components/guideGesture.ts` 的 `bindGuideGesture(window, handlers)` 在捕获阶段统一接管四种事件；handler 放在 ref 中保持最新，画布内原有分支只作兜底，因状态已清空不会重复消费。
2. **命中带收不到指针**：`.rea-manual-guides` 是 `pointer-events:none`，8px 命中带继承后同样不可点击，参考线无法拖动或右键。为 `.rea-manual-guide-hit` 显式补 `pointer-events:auto` 与 `touch-action:none`。

另发现 Node 的 `EventTarget` 在 `addEventListener(type, fn, true)` / `removeEventListener(type, fn, true)` 组合下不会解绑（浏览器标准中布尔应与 `{capture:true}` 等价），因此模块统一使用 `{ capture: true }` options 对象，保证两种环境都能解绑。

## 浏览器人工验收（2026-11-06 补充）

首次实现后用户反馈「画布上不显示参考线、也没有添加参考线的功能」。真机复现定位到根因：`showGuides=false` 时从标尺拖出被静默拒绝（标尺和指针指示线仍在，参考线层不渲染、无任何提示），且除了标尺拖出没有任何添加入口。修复后重做验收。

环境：本机开发服务器 `http://127.0.0.1:5173`（用户已运行）、Chrome 156 headless、`Emulation.setDeviceMetricsOverride` 1440×900、通过 CDP `Input.dispatchMouseEvent` 派发真实指针事件。

| 场景 | 结果 |
|---|---|
| 默认状态（`showRulers=false`） | 无标尺；参考线层按 `showGuides` 默认值渲染 |
| 「视图」→ 显示标尺 | 顶部 / 左侧 20px 标尺出现 |
| 「视图」→ 添加垂直参考线 | 参考线数量 2 → 3 |
| 画布空白右键 → 添加水平参考线 | 菜单含 9 项（含两个添加项），数量 3 → 4，新线落在右键世界坐标（`top:785.987px`） |
| `showGuides=false` 下从标尺拖出 | 参考线层先不存在（计数 0）；拖出后自动变为可见（`showGuides` 写回 `true`）、draft 跟随指针、松手新增一条（4 → 5） |
| 拖动参考线 | `top` 379.891px → 499.657px（+120），坐标徽标显示 `y 460`，`.is-active` 命中 1 条 |
| 参考线上右键 | 独立「参考线菜单」：删除此参考线 / 显示参考线 / 清除当前页面参考线；删除后数量减 1 |
| 拖回标尺删除 | 徽标显示 `y -521 · 松开删除`，松手后该条被删除 |
| 刷新后恢复 | reload 并重新打开文档后参考线仍在（隐藏时计数为 0，开启后按原世界坐标恢复） |

**测试环境伪影**：headless Chrome 默认 800px 视口会进入 ≤900px 布局，`.rea-backdrop`（抽屉遮罩，z-index 35）盖住画布，导致第一次探针的 `pointerdown` 全部落到遮罩上。改用 1440×900 后行为正常；这是既有窄屏抽屉设计，不是本次缺陷，但也说明窄窗口下必须先关闭抽屉才能操作画布。

### 仍未覆盖

- 50% / 200% 缩放档位下刻度文字、参考线线宽与选框 / 命中位置的对齐（本次只测默认缩放）；
- 移动端（≤900px）抽屉与参考线共存时的操作路径；
- 跨标签页 `storage` 同步的真实双标签页验证；
- `.reaui` 导出再导入后的参考线恢复（仅单测覆盖）；
- 参考线吸附时的紫色手动线 / 粉色智能线 / 间距标注组合视觉。

## 边界与未完成项

自动检查之外，已用无头 Chrome 在桌面视口完成两次真机验收，覆盖标尺开关、四条添加入口、单击建线、拖动、右键删除、拖出画布删除、按方向清除、选中区间高亮与刷新恢复（原「原点拖动 / 锁定 / 重置」验收已随 2026-11-07 第六轮修正作废）。以下场景仍未覆盖，按 `tasks.md` 7.2 单独跟踪：

- 50% / 200% 缩放档位下刻度文字、参考线、选框与命中带的对齐；
- `Esc` / `pointercancel` / 窗口失焦取消拖拽的实机表现（仅单测覆盖状态机与事件绑定）；
- `.reaui` 导出再导入后的参考线恢复（仅 `guides-file.test.ts` 覆盖）；
- 跨标签页 `storage` 同步、移动端（≤900px）抽屉与参考线共存路径；
- 参考线参与吸附时的紫色手动线 / 粉色智能线 / 间距标注组合视觉。

文档同步完成：`docs/file-format.md`（新元数据文件与导入规则）、`docs/architecture.md`（覆盖层、手势分流与吸附候选）、`docs/verification.md`（本节）、`DESIGN.md`（`--rea-manual-guide` 与区间色带）、`README.md`（操作表）、`EditorApp.tsx` 的快捷键一览（已补 `⌃R`）。

## Sketch 交互对齐（2026-11-06 第二轮）

用户反馈「添加和删除的交互细节和 Sketch 差很多」。对照 Sketch 官方文档（The Canvas，2026-06 更新）后，确认差异不在渲染而在三个手势定义，并按下述口径重做：

| 环节 | Sketch | 改前 | 改后 |
|---|---|---|---|
| 添加 | 在标尺上**单击**即建线 | 必须拖出 28px 才建线，原地松手视为取消 | 单击按标尺方向建线；拖出仍可精调；拖出再拖回才取消 |
| 删除单条 | 沿参考线法线拖出画布 | 写死「左边缘 28px 删竖线、上边缘 28px 删横线」 | 竖线左右、横线上下拖出画布即删 |
| 批量删除 | Control-点标尺按方向删 | 只有「清除当前页面参考线」 | 顶部 / 左侧标尺分别删垂直 / 水平，角块清除全部 |
| 标尺 0 点 | 固定 (0,0) | 固定 (0,0) | 固定 (0,0)，沿轴拖动无效；不提供锁定 / 重置入口（2026-11-07 第六轮修正撤销了原「可拖动原点」实现） |
| 快捷键 | `⌃R` | 无 | `⌃R` 开关标尺（不拦 `⌘R`） |
| 选区 | 标尺高亮图层区间 | 无 | 两条标尺绘制区间色带 |
| 可见性 | 参考线跟随标尺 | 两个独立开关（按你的要求） | 保留独立开关，作为有意偏离 |

实机验证（同上一节环境，1440×900，CDP 真实指针事件）：

| 场景 | 结果 |
|---|---|
| 角落右键「清除所有参考线」 | 菜单 3 项（清除 / 显示标尺⌃R / 显示参考线；原点锁定 / 重置两项已随第六轮修正移除），清空后计数 0 |
| 单击顶部标尺 | 新增 1 条垂直参考线，位置与点击处一致（`pos: 300`） |
| 单击左侧标尺 | 新增 1 条水平参考线（`pos: 300`） |
| 顶部标尺右键 →「删除所有垂直参考线」 | 只剩水平参考线，按方向删除生效 |
| 竖线拖出右边界 | 松手后删除 |
| 横线拖出上边界 | 松手后删除（修复下述裁剪 bug 后） |
| 沿顶部标尺拖动 100px | 当时实现会把刻度从 `0,200,400…` 变为 `200,400,600…`；**该行为已随第六轮修正撤销**，现在拖动不改变任何读数 |
| 锁定原点后重复拖动 | 当时实现刻度不变；锁定能力已随第六轮修正移除 |
| 选中画框 | 两条标尺各出现一条区间色带（`rea-range-x` / `rea-range-y`） |

### 本轮修复的缺陷：视口裁剪中断拖拽

`CanvasGuides` 原本会卸载屏幕坐标超出视口的参考线（`screen < -2 || screen > extent + 2`），而 `extent` 还取错了轴：竖线用高度、横线用宽度。结果把**水平参考线向上拖出画布**（正是 Sketch 的删除手势）时，线一越过视口上沿就被卸载，节点移除同时丢掉指针捕获，`lostpointercapture` 把整个手势取消——表现为「拖到顶就弹回原位、删不掉」。修复为：正在拖拽的参考线不参与裁剪，`extent` 按轴取宽度 / 高度。该缺陷无法被 node 环境的单元测试发现，只能靠真机手势复现，已在 `CanvasGuides.tsx` 注释中说明原因。

本轮新增测试 13 项：`components/rulerGesture.test.ts`（单击 / 沿轴 / 垂直分流、出界判定、法线方向不互删）6 项、`session/ruler.test.ts` 刻度标签 2 项、`components/guidesMenu.test.ts` 标尺菜单 5 项；其中原点位移与原点标签用例已随第六轮修正改写为「0 点固定 / 沿轴拖动无效」。全量 `pnpm test` 47 文件 / 373 项（371 通过、2 跳过），`pnpm typecheck` 通过，`openspec validate --strict` 通过。

## 视觉细节对齐（2026-11-06 第三轮）

用户指出两处与 Sketch 的视觉差异：参考线没有延伸到标尺上（层级被标尺盖住），以及拖拽预览线的透明度在标尺范围内也一起被降低了。两处都是覆盖层的层级 / 分段问题，落在同一个组件和同一段 CSS 里。

| 项 | 改前 | 改后 |
|---|---|---|
| 参考线层级 | `.rea-manual-guides` z-index 24 < `.rea-rulers` 26，线条被 20px 条带遮住 | z-index 27，线条压过刻度与刻度文字，直接对齐读数 |
| 命中带 | 从 y=0 / x=0 起，抬高后会拦截标尺手势 | 内缩一个 `RULER_THICKNESS`，标尺条带仍属于标尺 |
| 预览线 | 整条 55% 不透明度 | 画布部分 55%，与标尺重叠的部分由 `.rea-guide-cap` 以 100% 覆盖 |

`.rea-guide-cap` 的跨度按几何关系分两档：线条只有端头落在标尺里时（正常拖入画布）只画 20px 短段；整条线还在标尺条带内时（刚按下还没拖出去）扩展到整行 / 整列，避免出现「预览线在标尺上整条发灰」的观感。

实机验证（同一套 CDP 环境，1440×900）：

| 场景 | 结果 |
|---|---|
| 层级 | 计算样式 `manual-guides 27 > rulers 26 > guides 25` |
| 参考线跨度 | 线 `top:44, height:713`（= 画布全高，从标尺顶部起）；命中带 `top:64, height:693`（正好让出 20px 标尺） |
| 垂直参考线跨标尺 | 放大截图确认线条从窗口顶部一路压过顶部标尺的刻度进入画布 |
| 水平参考线跨标尺 | 放大截图确认线条压过左侧标尺的刻度文字 |
| 预览线在标尺内 | 指针仍在标尺条带时，cap `width:800`（整行）且 `opacity:1`，与 55% 的线叠加后整段实色 |
| 预览线在画布内 | cap 收缩为 `width:20` 的左端短段，画布部分保持 55% |
| 标尺手势未被拦截 | 在已有参考线的同一 x 处单击顶部标尺仍新增参考线（计数 3 → 4）；当时横向拖动会移动原点，该行为已随第六轮修正撤销 |
| 参考线拖动未回归 | 命中带拖动正常（`top 234 → 254`，落点吸附到邻近参考线） |

`guidesOverlay.test.ts` 的层级断言随之反转（手动参考线 > 标尺 > 智能参考线），并新增一条 cap 契约（`background` 为 `--rea-manual-guide`、`pointer-events:none`、不得含 `opacity`）；全量 47 文件 / 374 项（372 通过、2 跳过）。

## 交互修正：悬停预览取代指针指示线（2026-11-06 第四轮）

上一轮把「预览线」当成了拖拽草稿，方向错了。按用户提供的 Sketch 截图重新确认：预览是**指针停在标尺上时**出现的「点击会落下哪条线」，与按下无关；而画布内移动时那条跟随鼠标的标尺短线是多余实现。

| 项 | 改前 | 改后 |
|---|---|---|
| 指针在画布内移动 | 标尺上有一条跟随鼠标的 1px accent 短线 | 标尺保持干净，不做任何指示 |
| 指针进入标尺条带 | 只有那条短线 | 按标尺方向显示贯穿画布的预览线 + 坐标徽标，移开即消失 |
| 预览线透明度 | — | 画布段 55%、与标尺重叠段 100%（复用 `.rea-guide-cap`） |
| 拖动参考线 | 同一条跟随鼠标的短线 | 条带内在该参考线位置画 3px 落点标记，松手消失 |
| `showGuides=false` | 无预览概念 | 预览照常显示，既有参考线保持隐藏 |

实机验证（同一套 CDP 环境，1440×900）：

| 场景 | 结果 |
|---|---|
| 指针在画布内移动 | 无 preview、无 badge、无 indicator |
| 指针进入顶部标尺 | preview `1×856`（贯穿画布），opacity `0.55`，cap `1×20` 覆盖标尺带，徽标 `x 739` |
| 指针进入左侧标尺 | preview `800×1`，cap `20×1`，徽标 `y -16` |
| 指针移回画布 | preview / cap / badge 全部消失 |
| 悬停后单击标尺 | 参考线计数 0 → 1，预览仍在（指针未离开条带） |
| 拖动已有参考线 | preview 让位，indicator `3×19` 出现在标尺带内并按落点移动，徽标显示 `x 978` |
| 松手 | indicator 消失，斜线不再有残留 |
| `showGuides=false` + 画布内移动 | 既有参考线 0 条渲染、无 preview |
| `showGuides=false` + 悬停标尺 | preview 出现、徽标 `x 898` |
| `showRulers=false` | 标尺不渲染，悬停原条带位置也不产生 preview |
| 关闭再开启标尺（指针已移开） | 重新开启后没有残留的幽灵预览（`Canvas` 在 `showRulers` 变 false 时清空 `guideHover`） |

`guidesOverlay.test.ts` 增补一条契约：`.rea-manual-guide.is-preview` 为 55%、`.rea-ruler-indicator` 用 `--rea-manual-guide` 且不含 `opacity`（表示它只在拖动时存在，不再是常驻指示）。全量 47 文件 / 375 项（373 通过、2 跳过）。

---

# M3 编辑核心验证记录

实施日期：2026-11-03。对应 OpenSpec `add-editing-core`。实现任务 1–7 已完成，8.1 完整人工验收保持未勾选。

## 自动检查

- 当前工作区 `pnpm test`：22 个测试文件、240 项测试通过，无跳过；包含本次属性面板改动。
- `pnpm test:rust`：6 项 Rust 测试通过；`cargo fmt --all -- --check` 通过。
- `pnpm build`：WASM、TypeScript 和 Vite 生产构建通过。JS 约 1.01MB，gzip 约 288KB；保留既有的大 chunk 提示。
- `openspec validate add-editing-core --strict`、`git diff --check` 通过。
- Impeccable 检测没有阻断项；诊断为设计系统颜色/字号建议。新增参考线与距离颜色已在 DESIGN.md 记录；已有面板和色盘建议保留其原有语义。

新增覆盖：选择范围、锁定/隐藏命中、Shift 切换、框选边界、层级导航；手势启动阈值、八方向缩放、等比/中心与最小尺寸、多选成员缩放、旋转与旋转父级坐标；move/wrap/unwrap/duplicate 的原子性、坐标保持、连续性约束、锁定拒绝、嵌套 id 与别名/文本保护、旋转容器解包；剪贴板重新生成 id、跨页居中、安全校验；文字尺寸模式与未修改文本不入历史；预览 Map、Alt 副本原位渲染、文字草稿与源节点隐藏；IME 组合期间的 Enter/Esc 与延迟失焦提交。

WASM 使用确定性随机生成的 500 组批量矩形，与独立 TS 参考实现逐项比较 dx/dy、参考线和最终间距标注；连续 1000 个吸附会话后线性内存大小不增长。错误输入会释放缓冲区，重复释放安全。

## 浏览器验收进度

使用独立的「M3 Editing Core 验收」与剪贴板测试文档，1280×720，在实际开发服务器及 React StrictMode 中验证：

1. 创建画框和内部矩形；双击进入容器、Shift 多选、相交框选，多选整体选框与成员细边框显示。
2. 多选移动、整体缩放；编组后子坐标相对化且位置不变，Undo/Redo 与取消编组恢复结构；单选旋转写入任意角度类。
3. ⌘D 创建独立 id 副本并选中；复制/粘贴、跨页面和跨文档粘贴正常，跨页内容以视口中心定位。
4. 画布拖出画框成为游离图层，拖回画框恢复父级；图层面板拖放也保持设计空间位置，旋转后的节点仍保持姿态。
5. T 创建文字后立即编辑，中文字符串和多行内容提交；Enter 编辑已有文字、Esc 放弃修改；空的新建草稿不创建节点。
6. 左右手柄切换为自动高度，角手柄切换固定尺寸，属性面板模式与 class 同步；源文字编辑时隐藏，覆盖层沿用计算文字样式。
7. 在剪贴板同时提供 HTML 和纯文本，编辑器只插入纯文字且没有子标签；含 style 的设计片段被拒绝，节点数不变。
8. 旋转父画框 30° 后，文字覆盖层也旋转 30°；子节点拖动正确换算到父坐标，撤销逐字恢复；重新进入文字编辑不改内容后提交，撤销按钮保持禁用。
9. 修复文字覆盖层混用 font 简写与长属性的 React 警告后，在新标签页复核文字编辑，控制台 error/warn 为空。

截图：[M3 编辑核心](assets/editing-core-preview.jpg)。系统中文输入法的真实候选词确认/取消过程未实测；上述中文输入是直接输入文本，不代替该验收。Shift/Alt/⌘ 在进行中的手势切换、指针取消/窗口失焦、参考线与距离提示的全部视觉组合也尚未逐项完成人工检查，因此 8.1 保持未完成；相应几何及 IME 状态规则已有自动测试覆盖。

---

# 验证记录

## M2 编辑器外壳

实施与验收：2026-11-03。对应 OpenSpec `redesign-editor-shell`。本节只记录 M2；M3/M4 的并行改动不属于 M2 独立复核范围。

### 自动检查与范围

最终 M2 检查使用隔离快照 `/tmp/rea-m2-validation.oMgS8B`：以 `490bd0c` 为基底并加入最终 M2 编辑器改动，避免共享工作区中并行提案的中间状态干扰结果。

| 检查 | M2 结果 |
|---|---|
| TypeScript + Vite 生产构建 | 通过；使用已编译的 WASM |
| Vitest | 13 个文件、113 项测试通过 |
| Rust 几何测试 | 较早的 M2 检查点 4 项通过 |
| `openspec validate redesign-editor-shell --strict` | 通过 |
| `git diff --check` | 通过 |
| Impeccable 检测 | 改动界面返回空诊断 |
| 独立界面复核 | 首轮发现 2 项 P2；修复后定向复核判定 `ship`，仅覆盖这 2 项修复 |

两项修复分别为：继承隐藏/锁定的子图层禁用无效开关并给出父级提示；文档重命名后，撤销/重做页面事务保持新文档名。两项均有回归测试。该定向 `ship` 不代表对并行 M3/M4 的整体验收。

2026-11-03 文档收尾时，共享工作区另一个集成检查点的 `pnpm build`、`pnpm test`（18 文件、222 项）及 `pnpm test:rust`（6 项）全部通过。此结果包含当时的并行改动，后续写入继续进行，因此不是当前工作树不变的保证，也不替代上述 M2 快照证据。

M2 快照仍有 Vite 单包体积警告：JS 938.20kB，gzip 264.25kB；上述共享检查点为 JS 984.50kB，gzip 278.13kB，CSS 36.80kB。本阶段没有进行加载体积优化。

### 浏览器证据

在实际开发服务器上检查了以下 M2 行为；最终截图来自隔离快照的 `http://localhost:5175`，不是生成图。

- 1440×900：44px 单顶栏、页面/图层左栏、设计/检查右栏与多个画框同时显示；没有画布/源码切换、底部状态栏或实现版本标识。
- 选择与图层树同步，选中时展开祖先；检查片段来自当前源码，复制可用。修改宽度为 317 后片段同步，撤销恢复；拖动和缩放各提交一个可撤销事务，并写入 `className`。
- 页面切换恢复会话内相机；100% 操作及切回页面恢复已检查。右栏从 280px 调到 290px，刷新后仍为 290px。
- 打开文档列表、导入及文档删除确认的取消路径；页面双击重命名与删除确认的取消路径。页面排序、历史和片段截断等逻辑另由自动测试覆盖；未声称逐项完成所有浏览器场景。
- 390×844：图层与属性抽屉互斥，遮罩可关闭，主要工具与抽屉入口可见，`clientWidth = scrollWidth = 390`。
- 导入含 `hidden`、`fixed inset-0` 的隔离用例后，顶栏仍为白色且高 44px；页面背景为 `#f5f5f5`，文档文字为 16px，未污染外壳样式。

前述交互检查发生在最终两项修复前后不同检查点；最终两项修复由回归测试与定向独立复核确认，未重跑所有浏览器路径。最终桌面截图见 [编辑器预览](assets/editor-preview.jpg)，另保留 `.impeccable/review/desktop.jpg` 与 `mobile.jpg`；截图日期为 2026-11-03，使用独立的「M2 编辑器验证」文档。桌面显示选中矩形的检查代码，移动端显示页面概要。

### M1 历史记录说明

下文保留 M1 当时的检查结果、覆盖范围和阶段边界；其中「后续」的表述代表 M1 时点。原截图路径 `assets/editor-preview.jpg` 现已更新为上面的 M2 截图，不能用于还原 M1 外观。

## M1 文档模型验证记录（历史）

实施：2026-11-02 至 2026-11-03。对应 OpenSpec `restructure-document-model`。

### 自动检查

| 检查 | 结果 |
|---|---|
| `pnpm test` | 9 个文件、103 项测试全部通过；无跳过 |
| `pnpm build` | Rust/WASM、TypeScript 和 Vite 生产构建通过 |
| `pnpm test:rust` | 4 项 Rust 几何测试通过 |
| `openspec validate restructure-document-model --strict` | 通过 |
| `git diff --check` | 通过 |
| Impeccable 检测 | 所有改动界面文件返回空诊断；界面复核 ship |

Vite 仍提示单个 JS bundle 大于 500kB（约 923kB，gzip 约 260kB），其中包含 Babel 静态解析器和 Tailwind 运行时编译器。本阶段完成正确性与功能接入，未进行大文档性能和首次加载体积优化。

### 测试覆盖

- 原语：八种原语、各容器和叶节点的嵌套规则、游离图层、空页面、非法/缺失/重复 designId、hidden/locked 继承、资源路径安全。
- 解析：静态 TSX、导入别名、AST 范围、清单、拒绝 style/事件/spread/动态 className/函数调用/非字符串子表达式/其他模块语句。
- 事务：跨两个文件的失败回滚、仅改动目标源码、文件差异历史、字符串精确保留、插入/删除/文本、空节点填充、锁定拒绝及解锁、页面增删改名复制排序、最后一页保护、撤销重做字节一致、500ms 历史合并和分支。
- Tailwind：词法、变体与重要标记、任意属性、刻度及任意值往返、负值、色板、非固定/冲突状态、修补保序/幂等/清除、安全过滤、真实 v4 主题/preflight 和增量编译。Vitest 显式启用 Tailwind CSS 转换，未使用空样式桩。
- 存储：独立 fake-indexeddb 工厂中的多文档 CRUD、资源复制/删除、最近打开、并发 revision 冲突、删除后的旧版本保存拒绝、资源写入异常时整个事务回滚。
- 自动保存：500ms 防抖、十次变更只写最终版本、失败保留内存并重试、冲突状态、写入期间继续编辑的串行保存。
- ZIP：确定性排序导出、页面原文和资源往返、新 id/同名后缀、安全路径、条目数/压缩比/膨胀大小预检、CRC 和重复路径、未知文件警告、非法页面及缺失文件拒绝且无残留。
- 迁移：单/多视口、水平间距和 id 重建、样式/形状转换、根样式/锁定标志、特殊字符串、损坏/动态旧数据、启动示例和迁移标记、旧数据保留。
- 渲染与编辑器：八种原语、class 预览保留变体、Image blob URL、hidden/locked、真实文件事务到渲染与 ZIP 的集成、最小导入页面中的新增图层。
- 原有相机和真实编译 WASM 的集成测试继续通过。

### 浏览器验收

在 Codex 内置浏览器、实际开发服务器和 React StrictMode 中验证：

1. 启动读取并迁移原有 v1 文档；旧内容显示，旧 localStorage 保留。
2. 新建独立验证文档，在同一页面新建画框、拖动绘制矩形。图层树与属性同步显示。
3. 点击 Shadow DOM 内部对象命中正确；拖动移动、八方向手柄缩放和宽度输入实际写入 Tailwind 类。
4. Undo 恢复缩放前尺寸，Redo 重做；页面代码显示当前提交结果。
5. 从文档列表导入 `.reaui`，同页两个不同尺寸画框和矩形/椭圆/文字正常显示。
6. 窄屏修改宽度为 317、填充为 `#123456`，刷新后仍恢复相同页面源码；实际 DOM 背景为 `rgb(18,52,86)`。
7. 自动保存后刷新，恢复最近打开文档，撤销栈按设计清空。
8. 顶栏导出实际下载 `.reaui`；下载内容的确定性和重新导入由自动测试覆盖。
9. 文档对话框在 StrictMode 中持续打开，关闭后焦点回到「文档」入口；实际切换文档之前等待保存。
10. 1440×900 三栏完整显示；390×844 顶栏控件可见，图层/属性抽屉互斥，`clientWidth = scrollWidth = 390`。保存状态文字对比度 5.03:1。
11. 浏览器控制台无 error/warn。界面静态检查无诊断，独立界面复核通过；已有设计系统保持一致。

当前 [编辑器预览](assets/editor-preview.jpg) 已在 M2 更新，不再代表 M1 外观。M1 验证使用新建的独立验证文档，未修改原有用户文档的设计内容。

### 本阶段边界

Image 与资源格式/渲染已实现，图片添加 UI 留待后续。旋转/倾斜类可渲染，尚未验收这些变换下的精确移动/缩放；M2 界面重做、M3 编辑核心、M4 属性面板仍是独立变更。撤销栈不持久化，云端和协作未实现。

## M4 属性面板验证（2026-11-03）

### 自动检查

- `pnpm typecheck`：通过。
- `pnpm test`：22 个测试文件、240 项通过，包含 M2 / M3 回归。
- `pnpm test:rust`：6 项通过。
- `pnpm build`：WASM、类型检查及 Vite 生产构建通过。
- 属性组测试逐组覆盖往返、幂等、清除、保序、变体保留与冲突；另测 `text-*` 歧义、字号保留行高、圆角展开、描边互转、阴影安全解析、字体和宽高模式。
- 输入与字段测试覆盖递归下降表达式（恶意输入、非有限值、除零和深度限制）、步进倍率、最近颜色去重、Mixed 与冲突、批量事务、500ms 合并、复合描边与阴影的各自步进、未改动 Mixed 字体的空草稿、一步撤销和分区规则。
- 自动布局测试覆盖子节点源码排序、注释保留、流式 / 自由定位转换、实测位置保持、旋转的局部布局偏移以及对齐不累积亚像素误差。

### 浏览器检查

使用独立本地端口的验收文档，保留原有用户文档；Codex 内置浏览器检查 1280×720，Edge 实际视口检查 1440×900 与 390×844。

1. 矩形、文字、顶层 Frame、空页面及多选的分区、适用字段与禁用状态正常；单选、Shift 多选和源码检查同步。
2. W 输入 `100+20` 后提交为 120；`1/0` 和 Esc 还原；多选 W=120/128 时 ArrowUp 分别变为 121/129。
3. X 标签拖动 30px，数值从 64 到 94；一次撤销回到 64。复合描边初值 2/4，步进后为 3/5、拖动 +30 后为 32/34，分别一次撤销恢复 2/4。
4. `f00` 写入 `bg-[#FF0000]`；色板、色阶、最近颜色和吸管可用性正常显示。1440px 和 390px 的弹层均在视口内；透明度输入固定 64px，完整显示 100。
5. 居中描边 3px 写入 `outline-[3px]` 与 `outline-offset-[-1.5px]`；投影和内阴影同时存在于单个 `shadow-[…]`。
6. 字体 Noto Sans SC 写入下划线编码；字号从 30 改为 24 保留原 36px 行高。Inter / serif 的多选字体显示空草稿和 Mixed 占位，不输入直接失焦不写历史；一次撤销移除的是此前 serif 编辑。
7. 开启 Frame 自动布局后子节点转流式；关闭前后的抽样节点屏幕位置差小于 0.004px。固定坐标对齐不受 DOM 量化影响。
8. Alt+A 能对齐，输入框内不触发。三个节点水平分布后抽样间隙均约 84.383px；顶对齐不改变宽高。
9. 手机宽度下属性抽屉与颜色弹层可滚动且不越界；桌面多选、单选及窄屏截图见 `.impeccable/review/property-*`，仓库预览见 [属性面板预览](assets/property-panel-preview.jpg)。

### 默认 Tailwind v4 导出对照

`inspector/export.test.tsx` 生成独立抽样工程和 `.reaui` 夹具到忽略目录 `test-results/property-export/`。静态工程使用 `@tailwindcss/node` 处理 `@import "tailwindcss"`，并用 `PageRenderer` 适配导出的设计原语；另一渲染区域使用编辑器 `ShadowCanvas` 的运行时编译。浏览器读取两个区域的 width、height、backgroundColor、三个角的圆角、outlineWidth、outlineOffset、boxShadow、rotate，计算结果逐项一致。抽样包含 317px 任意尺寸、40% 色板填充、3px 居中描边、双阴影和 3° 旋转。

独立界面复核提出的三个问题（Mixed 复合数值、Mixed 字体失焦、透明度输入裁切）已修正并由复核逐项判为 resolved，修正项范围内结论为 ship。静态检测无主诊断；色板/文档颜色、已有界面颜色及少量紧凑尺寸有设计系统 advisory，未借本次扩展重写既有系统。

吸管的系统拾色过程、Pointer Lock 在不同操作系统的无边界行为以及读屏器实机交互没有跨平台人工验收。M3 中系统中文输入法等未验收项仍按该提案单独跟踪。

## 外部 Agent 与 reaui CLI

对应 `packages/reaui-cli` 与离线预览（2026-11-07 首次验证）。验证环境：macOS、Node 22.22.2、pnpm 12.4.1、Vite 8.3.5。

### 自动化

- `pnpm exec vitest run packages/reaui-cli`：3 个文件、15 项通过（参数解析 4、文档命令 6、预览与画板 5）。
- `pnpm typecheck`：通过。

### 端到端

以 `/tmp/reaui-demo` 为工作目录执行真实命令：

1. `reaui init` 生成 `rea.json` 与 `pages/main.page.tsx`；`reaui validate` 通过（v2，1 页）。
2. `reaui pack` 生成 0.7KB `.reaui`；连续两次打包 `cmp` 字节一致。
3. `reaui unpack` 还原目录，`rea.json` 的 `id` 与源文档一致；`reaui diff` 报告无差异。
4. 写入含 `div` 与 `onClick` 的页面后，`reaui validate --json` 返回 `ok:false`、`code:PAGE_SUBSET`、`path:pages/main.page.tsx`，退出码 1；`reaui pack` 被阻断。
5. 重复 `reaui init` 返回 `DOC_EXISTS`，原文件不变。

### 预览

- `reaui preview` 对模板文档输出 7.8KB 单文件 HTML，含 `board-canvas`、`data-design-id` 与内联 Tailwind CSS，无 `<script>`、`<link>`、`@import`。
- 无头 Chrome（`--headless=new --no-sandbox`，1600×1200）截图确认：文档标题、页面元信息、1440×1024 画板、标题文字均正常；仪表盘模板的四张指标卡、柱状图、活动列表无重叠或裁切。

### 模板

`dashboard / list / form / mobile` 四个页面模板分别替换进真实文档后均通过 `reaui validate`，覆盖 `.tsx` 模板 4 份。

### 专家包

`validate_expert.py` 通过；`register_expert.py` 已注册到 `my-experts`，`marketplace.json` 含 `reaui-designer`。头像为 512×512 PNG（7.5KB）。

### 未覆盖

- ReaUI 桌面版双击 `.reaui` 的真实导入未做人工验收（已由 `DocumentSession` 与 `decodeReaui` 同一校验链覆盖）。
- 组件实例（`Instance` / `Slot`）的预览展开未做视觉抽样；本期协议要求 Agent 不使用组件。
- 图片资源、外部字体、PNG 截图、MCP 画布联动不在本期范围。
- Windows / Linux 路径与编码未验证。

## 标尺 y 轴读数竖排（2026-11-07）

左侧标尺仅 20px 宽，横排的多位读数（如 `-10000`）会被条带裁切。改为绕刻度点逆时针旋转 90°、以刻度为中心竖向排列（自下而上阅读），顶部标尺仍保持横排；`text-anchor="middle"` + `dy="0.35em"` 让字形落在条带 x≈4–12 区间，与 x≥12 的刻度线不重叠。

CDP + headless Chrome（1440×900，`#demo` 且开启标尺）实测：左侧 9 个读数全部带 `translate(8 …) rotate(-90)`，包围盒约 `11×24px`（`-200`）落在条带内；顶部 8 个读数仍为 `<text x=… y="10">`；控制台无异常。4 倍放大截图确认 `-200`、`0`、`200` 完整可读、无折行与截断。`CanvasRulers.test.tsx` 锁定「仅 y 轴旋转、每个读数以自身刻度定位」；`ruler.test.ts`、`guidesOverlay.test.ts` 与全量 52 文件 / 426 项通过，`pnpm typecheck`、`pnpm build`、`openspec validate add-canvas-rulers-and-guides --strict` 均通过。

## 固定标尺 0 点、移除原点拖动（2026-11-07 第六轮）

用户反馈顶部标尺「页面 0 对应的位置显示 -9000」。排查结论：刻度计算本身没错，是**标尺原点被沿轴拖动**了——`shiftOrigin()` 按 `dx / zoom` 平移 0 点，10% 缩放下横向拖 900px 即偏移 9000 设计 px（CDP 复现：横向拖 300px 使读数从 `0,200,400…` 变成 `-600,-400,-200,0…`）。用户确认「可拖动的标尺原点」从未提出过需求，Sketch / Figma 也没有这种设计；该能力是调研 Sketch 文档时自行扩展的，因此整套撤销而不是修数值。

改动：`rulerTicks()` 去掉 `origin` 参数、标签直接取世界坐标；`classifyRulerDrag()` 沿轴结果改为 `ignored`（无操作）、删除 `shiftOrigin()`；`CanvasRulers` / `Canvas` / `EditorApp` 移除 `origin` / `locked` / `rulerOrigin` / `rulerLocked` 及角块双击重置与锁定图标；`rulerMenu()` 与顶栏「视图」菜单删除「锁定 / 重置标尺原点」；`theme.css` 删除 `.rea-ruler-corner.is-locked`。规格与文档同步（见 `tasks.md` 第 8 组）。

CDP 真机复核（1440×900，`#demo`，`camera.x=48px`）：初始顶部 `0,200,…,1400`、0 标签在 `x=50`；**沿顶部标尺横向拖 310px 后读数与 0 标签位置完全不变**；向画布拖出建线（2→3 条）与单击建线（3→4 条）仍生效且不影响刻度；角块右键菜单仅 3 项（清除所有参考线 / 显示标尺 ⌃R / 显示参考线），无原点项，角块 class 不含 `is-locked`；控制台无异常。`ruler.test.ts`（任意平移 / 缩放下世界 0 恒读 0）、`rulerGesture.test.ts`（长距离沿轴拖动 `ignored`）、`guidesMenu.test.ts`、`CanvasRulers.test.tsx` 均补了回归断言。全量 52 文件 / 427 项（2 跳过）通过，`pnpm typecheck`、`pnpm build`、`openspec validate add-canvas-rulers-and-guides --strict`、`git diff --check` 全部通过。

## 深色模式画布跟随主题（2026-11-07）

用户反馈「深色模式下的编辑器画布还是浅色的」。根因：`Canvas.tsx` 的 `ready()` 会把文档页面背景（`[data-page-origin]` 的计算背景，如示例文档的 `bg-[#e2e5eb]`）采样后以内联 `backgroundColor` 铺满 `.rea-canvas`，内联样式无条件压过深色主题的 `--rea-canvas:#0d0f11`，于是深色模式下整块画布仍是浅色。

修复保持「`Page.className` 只作用于画布背景」的文档模型不变：采样值改写入 CSS 变量 `--rea-page-bg`，由 `theme.css` 决定生效范围——浅色模式 `background:var(--rea-page-bg, var(--rea-canvas))` 铺文档页面背景，`[data-theme="dark"]` 恒用 `--rea-canvas`（纯 CSS 级联，跟随 `data-theme` 属性即时翻转，无 React 状态延迟）。属性面板「页面背景」编辑在浅色模式行为不变。

CDP + headless Chrome（1440×900，`--no-sandbox`，`Emulation.setEmulatedMedia` 强制 `prefers-color-scheme`，`#demo` 加随机 query 强制重载）实测 6 项断言全过：浅色画布 `rgb(226,229,235)` = 采样值；`rea:theme` 事件热切换与 `localStorage` 冷启动深色两种路径下画布均为 `rgb(13,15,17)`，`data-theme` 正确翻转；深色截图确认工具栏 / 左右面板 / 画布全深色，白色画框内容正常。脚本沉淀在 `scripts/verify-canvas-dark-theme.mjs`。`pnpm typecheck`、全量 vitest（52 文件 / 427 项，2 跳过）、`pnpm build`、`git diff --check` 全部通过。

## 图层拖动闪回原位修复（2026-11-07）

用户反馈「添加图片到画布后拖动，图片会跳回一开始放置的位置显示」。CDP 复现确认：这不是图片特有，矩形同样复现；根因在预览渲染管线——拖动/缩放/旋转时 `Canvas` 每帧把新的几何补丁写成新的 Tailwind 任意值类（如 `left-[703px]`），`ShadowCanvas` 的 Tailwind 编译是异步的，新类先上 DOM、CSS 晚一到数帧才就绪；这个间隙里绝对定位图层完全没有 `left/top`，浏览器按静态位置渲染，于是图层闪到页面原点（`#demo` 下屏幕 x≈408），随后又跳回拖动位置，肉眼即「跳动」。逐帧采样：101 帧中 20 帧 `computed left(0px) ≠ 类声明(703px)`，8 帧停留在原点。

修复（`packages/renderer-dom/src/render.tsx` + 新增 `packages/tailwind/src/preview.ts`）：`PageRenderer` 在渲染预览补丁时，把补丁触及的几何组（`left/top/right/bottom/width/height`、`rotate`，以及手势会写的 `position-type/whitespace/overflow` 关键字组）从补丁后的类名里读回并镜像成内联 `style`，与类补丁同帧生效——内联样式即时生效，类补丁在样式表就绪后与内联值完全一致（两者同源，均读自补丁后的类名）；未识别的值一律跳过而不猜测，避免内联错误覆盖正确的类样式。拖动结束提交后内联样式随之移除，图层不留任何 `style` 属性。旋转镜像用 Tailwind v4 的独立 `rotate` 属性，与类样式不叠加（实测帧帧相等）。

CDP 回归脚本 `scripts/verify-canvas-drag.mjs`（粘贴插入真实图片图层 → 拖动 240px / SE 手柄缩放 / NW 手柄旋转，逐帧采样）8 项断言全过：拖动 99 帧无一次后退、终点与落点一致（976=736+240）、拖动中内联镜像生效（`left: 670px; top: 430px;`）、提交后无内联残留、缩放期间 top 边恒定且宽度单调增长、旋转期间 `computed rotate` 与类声明帧帧相等（无双重旋转）。拖动中截图确认蓝色图片单份跟随选框，原点处无残影。`pnpm typecheck`、全量 vitest（55 文件 / 434 项，2 跳过）、`pnpm build` 全部通过；新增 `packages/tailwind/test/preview.test.ts`（4 项）与 `render.test.tsx` 内联镜像断言。

## 设计系统 ABI：契约包、文档快照与 conformance（2026-11-09）

本轮实现 `define-design-system-abi` 的契约层，不做编辑器内的发布 / 固定界面。验证范围是「格式、事务、渲染输入、CLI 报告」四段，不含浏览器真机手势。

**已完成并自动验证**

- `@rea/design-system`：同步 SHA-256（标准向量 `abc` / 空串）、键排序无空白序列化、未知顶层字段往返、`schemaVersion` 门禁、颜色 / 字号 / 行高 / 字重 / 间距刻度 / 圆角 / 阴影注入校验、`--rea-ds-*` 派生与同名冲突、组件 key 与令牌引用、旧 localStorage 迁移（不臆造可选色与 shadow）、`conformance()` 的 error / warning 分级与对比度计算。18 项测试。
- `@rea/document`：清单接受 v2 / v3 / v4；v3 携带 `design/system.json` 拒绝；v4 无系统合法；固定 / 撤销 / 取消固定事务；仍被引用时拒绝取消固定；超过 256KB 或 hash 不匹配拒绝。10 项测试。
- `@rea/storage`：`.reaui` 往返包含快照且字节稳定；损坏 / 改 hash / 超限快照丢弃并 warning；v3 + 快照拒绝（5 项）。版本库发布 / 重复发布拒绝 / revision 递增 / 快照不可变 / 固定可撤销 / 升级预览不写文档 / 删除仍被引用的令牌整体拒绝（7 项）。
- `@rea/tailwind`：只放行 `var(--rea-ds-*)`，继续拒绝其它 `var()`、`calc()`、`env()` 与带 fallback 的令牌（新增 4 类候选断言）。
- `reaui validate`：`--system` / `--strict` / `issues[]` / 退出码；未声明令牌、字面量 warning、strict 提升、版本不匹配、v2 引用令牌、无系统旧文档六种路径（7 项）；`pack` 在 warning 时要求 `--force`。
- 生成：提示词改为包快照并附三条令牌规则；`AgentTurn.system` 记录发布版本或草稿，非法字段丢弃但保留 turn（新增 4 条断言）。

**命令结果**：`pnpm test` 485 通过 / 2 跳过（60 文件），`pnpm typecheck`、`pnpm build`、`pnpm test:rust` 通过，`openspec validate define-design-system-abi --strict` 通过。

**未覆盖 / 待补**

- 未做 CDP 真机复核：`:host` 变量在 WebKit `transform` 缩放下的解析、50% / 200% 下的引用对齐、`reaui preview` 与画布同值仍未截图验证（任务 8.3）。
- 编辑器内的发布 / 固定 / 升级入口未实现（任务 4.3、4.4），当前只能通过 CLI 与文档层完成同等校验；内置三套系统仍是代码常量。
- ShadowCanvas 为 DOM 组件，测试环境为 node，`:host` 输出未做组件级断言（任务 3.5 部分完成）。

## 设计系统 ABI：发布、固定与升级界面（2026-11-09 第二轮）

在上一轮契约层之上补齐界面与绑定链路：工作台发布不可变版本，编辑器把版本固定到当前文档，升级走同一事务模型。

**新增能力**

- 工作台：`发布版本` 写入版本库；`版本` 页签列出 `vN / hash 前缀 / 日期 / 当前`。内置系统只读，发布时先分叉副本，避免把代码常量写进版本库。
- 编辑器「设计系统」对话框（主菜单进入）：显示当前固定的 `名称 · vN · hash`，列出所有已发布版本；固定 / 升级 / 切换旧版本前先给变更预览（令牌与组件条目的增删改 + 冲突列表），取消固定是一次可撤销事务。
- 记录新增可选 `revision` / `hash`；只有 hash 与当前令牌一致时才认 revision，发布后改令牌自动降级为草稿。内置系统以只读 `revision: 1` 参与解析，首页与编辑器同源。
- 生成提示词随之区分：已发布系统下发 `vN`，草稿下发「草稿版本」。

**命令结果**

- `pnpm test`：521 通过 / 2 跳过（65 文件；工作区同时包含 `add-svg-vector-import-and-image-export` 的测试）。本变更新增 `packages/editor/src/agent/designSystem.test.ts`（4 项）、`packages/storage/test/systems.test.ts` 的事务用例（2 项）与 `packages/reaui-cli/test/system.test.ts` 的 preview `:root` 断言（2 项）。
- `pnpm typecheck`、`pnpm build` 通过；`openspec validate define-design-system-abi --strict` 通过。
- `node scripts/verify-design-system-pin.mjs`（CDP + headless Chrome，1440×900，浅色）：**24 项全部通过**。覆盖内置系统复制并发布 v1、版本列表「当前」标记、文档初始无变量、主菜单入口、未固定列表、固定前 30 条令牌变更、固定后 `:host` 颜色与圆角、外壳 `--rea-*` 不受影响、刷新后快照仍在、菜单显示 `v1`、改主色发布 v2、升级预览仅 1 条变更、升级后画布取到 `#e0447c`、取消固定后变量消失且刷新仍为空。

**未覆盖 / 待补**

- ShadowCanvas 的 `:host` 输出仍无组件级断言（node 测试环境），本轮通过 CDP 读取 `getComputedStyle` 间接验证。
- 取消固定时「仍有引用则拒绝」只在单元测试覆盖，界面未做对应提示截图。

## 设计系统 ABI：缩放与 preview 同值复核（2026-11-09 第三轮）

补齐任务 8.5：把演示页换成引用 `var(--rea-ds-*)` 的样例，在三档缩放下比对几何与计算值，再用真实 CLI 复核同一份文件。

**修复的真实缺陷**

- `systemVariables()` 原先把所有令牌值序列化为无单位字符串，长度类令牌因此输出 `--rea-ds-radius-md:8` / `--rea-ds-space-24:24` / `--rea-ds-typography-heading-size:30`。CSS 判定这些值非法，`border-radius` / `padding` / `font-size` 全部回退为 `0` / 默认值——颜色（hex）、行高（1–3 的无单位倍数）、字重恰好合法，所以只有部分令牌「看起来生效」，单元测试只断言变量名也没能拦住。
- 现按 CSS 语义输出：字号 / 间距 / 圆角补 `px`，行高 1–3 保持无单位倍数、8–96 输出 `px`，字重保持整数。哈希基于 tokens 原始数值，不受序列化格式影响；唯一受影响的其它消费方是 `systemChanges` 的变更摘要文字（同样变得可读）。

**命令结果**

- `pnpm test`：521 通过 / 2 跳过（65 文件）；`pnpm typecheck`、`pnpm build` 通过；`openspec validate define-design-system-abi --strict` 通过。
- `node scripts/verify-design-system-zoom.mjs`（CDP + headless Chrome，1440×900，浅色）：**26 项全部通过**。发布并固定 v1 → 替换演示页为令牌样例后：100% / 50% / 200% 三档下令牌色块与字面量对照块的缩放比一致（1.0000 / 0.5000 / 2.0000，误差 <1%）、与缩放标签一致（<2%）、块间距成比例（16 / 8 / 32px）、计算值始终未缩放（圆角 8px、内边距 24px、主色 `rgb(53,106,240)`）、标题 30px / 38.1px / 500；同一份文件 `reaui validate` 通过并报告 `source: pinned` 的 v1 快照，`reaui preview` 的 `:root` 与画布同值（`--rea-ds-radius-md:8px`、`--rea-ds-space-24:24px`、`--rea-ds-typography-heading-size:30px`），且自行编译出 `background-color: var(--rea-ds-color-primary)`。

**未覆盖 / 待补**

- 只在 Chromium 复核，未做 WebKit / Firefox 真机；缩放用 `⌘` + 滚轮模拟，触控板捏合手势未单独验证。
- 阴影令牌（`--rea-ds-shadow-*`）未进本次样例；圆角、间距、字号与颜色已覆盖。

## SVG 矢量导入与图片导出（2026-11-09）

导入不再把 SVG 当图片资源：解析成 `Group + Rect / Ellipse / Vector` 的可编辑图层。导出新增 PNG / JPG / SVG，范围沿用「选中优先，否则当前页所有画框」。

**新增能力**

- 解析（`packages/design/src/svg.ts`，纯文本、无 DOM）：自写 XML tokenizer；`transform` 叠乘并烘焙进坐标；路径归一化为绝对 `M/L/C/Z`（`H/V`→`L`、`S/T` 反射、`Q`→`C`、`A`→每段 ≤90° 的三次贝塞尔）。单轮廓转结构化 `path` 供钢笔编辑，多轮廓保留归一化 `d`，与 `expandPath()` 既有口径一致。
- 落源（`packages/editor/src/session/svgImport.ts`）：按 `viewBox` 等比缩放，颜色写成 `fill-[#…]` / `stroke-[#…]` / `[stroke-width:Npx]`、圆角 `rounded-[Npx]`；整次导入是一个事务。
- 未支持特性计数汇报（沿路径排版的文字、内嵌位图、引用、蒙版、裁切、滤镜、图案；渐变按首个色标近似）。
- 位图导出：克隆真实渲染 + 内联 `getComputedStyle()`，`<foreignObject>` 交由 `<img>` → `<canvas>` → `toBlob()`；跳过 `inset*` 系列，SVG 外壳用 `data:` URL 避免 canvas 污染。
- 矢量导出：按 `data-design-kind` 重建 `<rect>` / `<ellipse>` / `<path>` / `<text>` / `<image>`，容器 `<g>`、`overflow:hidden` → `<clipPath>`，文字按 Range 行盒拆行。
- 多文件用 `zipArchive()` 打包，只弹一次保存框。

**命令结果**

- `pnpm typecheck`、`pnpm build` 通过；`openspec validate add-svg-vector-import-and-image-export --strict` 通过。
- `npx vitest run`：521 通过 / 2 跳过（63 文件），新增 `packages/design/src/svg.test.ts`（14 项）、`packages/editor/src/session/svgImport.test.ts`（5 项）、`packages/editor/src/export/vector.test.ts`（5 项）、`packages/editor/src/export/targets.test.ts`（4 项）。
- `node scripts/verify-svg-import-export.mjs`（CDP + headless Chrome，1440×900，浅色）：**11 项全部通过**。覆盖粘贴 SVG 后成为 `Rect / Ellipse / Vector` 编组且不新增 svg 资源、填充与圆角（`rgb(53, 106, 240)` / `8px`）、路径 `d` 与描边宽度、插入尺寸 `48px`、导出 SVG 为真矢量（无 `foreignObject`、尺寸 48×48）、导出 2x PNG（96×96）、JPG 选中后倍率仍可用、导出 JPG 合法。
- 整页 SVG 导出人工复核：内置示例首页 1440×960 重建出 47 个 `<text>`、25 个 `<rect>` 与全部图标路径，渲染结果与画布肉眼一致。

**未覆盖 / 待补**

- SVG 导出的文字基线在跨字体环境可能有 1px 级偏差（用 canvas 字体度量推算），多行自动换行依赖 Range 行盒，复杂富文本未覆盖。
- 投影、滤镜、渐变背景不进入 SVG 导出（位图导出不受影响），未做「哪些装饰被省略」的界面提示。
- 多轮廓镂空图形只能整体编辑，不能逐轮廓改节点；未覆盖 `<text>` / `<image>` / `<use>` / 蒙版 / 裁切的导入。
- 桌面版（Tauri）的保存对话框路径只有浏览器下载路径被 CDP 覆盖，系统保存面板未做真机验证。

### 补充：SVG 文字导入（2026-11-10）

用户以设备二维码标签（`<text text-anchor="middle" dominant-baseline="middle" font-size="56" …>出料泵</text>`）实测后反馈文字丢失，随后把 `<text>` 从「未导入」升级为正式能力。

- `<text>` 解析为 `SvgTextShape`（字号 / 字重 / 字体族 / `text-anchor` / `dominant-baseline` 按 SVG 规则继承，transform 烘焙锚点与字号）；落源成 `Text` 图层，canvas 度量宽度与上下伸、`leading-[1]` 固定行高换算基线锚点。
- `npx vitest run`：528 通过 / 2 跳过（`svg.test.ts` 18 项、`svgImport.test.ts` 7 项含新增文字用例）；`pnpm typecheck`、`pnpm build`、`openspec validate add-svg-vector-import-and-image-export --strict` 通过。
- `node scripts/verify-svg-import-export.mjs` 增至 **15 项全部通过**：粘贴带文字的 SVG 后编组含 2 个 `Text` 图层（「出料泵」「位号：P-0602」），计算样式 56px / 700 / `rgb(46, 159, 117)` / 行高 56px，文字视觉中心落在 viewBox (250, 75) ±0.1，类名无 `w-[…]`（保持自动宽度）；既有图标导入与 PNG / JPG / SVG 导出断言不受影响。
- 真实文件复核：`设备二维码_出料泵_P-0602.svg` 整份导入后 500×680 编组，两处文字与二维码图形渲染与源文件一致（截图人工比对）。
- 已知近似：文字宽度与基线用 canvas `fontBoundingBox` 度量，跨字体环境可能有 1px 级偏差；直接文本与 tspan 混排时不保留交错顺序（字符不丢）；旋转 / 镜像文字与 `textPath` 不导入并如实提示。

## 关于页版本信息（2026-11-10）

关于页从「一行硬编码 `v0.1.0`」改为可核对的版本清单。编辑器版本与配套 reaui-cli 版本由 `apps/web/vite.config.ts` 在构建时从两个 `package.json` 注入；清单版本与设计系统版本只读取自共享 IndexedDB 里最近打开的文档。变更见 `openspec/changes/add-about-version-info/`。

**命令结果**

- `pnpm typecheck`、`pnpm build` 通过；`openspec validate add-about-version-info --strict` 通过；`git diff --check` 通过。
- `npx vitest run`：535 通过 / 2 跳过（64 个测试文件通过、2 个跳过）。新增 `packages/editor/src/settings/about.test.ts`（7 项）：v4 + 固定系统、未固定、损坏 / 篡改快照、清单损坏、空库、优先最近文档且不改写 meta、无 meta 回退、未注入构建常量时显示占位符。
- 构建产物复核：`apps/web/dist/assets/index-*.js` 中「reaui-cli」行的 `dd` 已内联为 `["v","0.1.3"]`，产物中无未替换的 `__REAUI_*` 常量。
- `node scripts/verify-about-version-info.mjs`（CDP + headless Chrome，1000×720，静态托管 `apps/web/dist`）：**11 项全部通过**。覆盖空工作空间冷启动（`v0.1.0` / `v0.1.3` / `.reaui（ZIP）` /「未固定」、无错误横幅）、写入 v4 文档后重进关于页显示「清单 v4」、`lastOpenedId` 未被改写、损坏快照显示「快照无效」且清单版本仍可见。

**未覆盖 / 待补**

- `packages/reaui-cli/src/cli.ts` 的 `VERSION` 常量与 `packages/reaui-cli/package.json` 仍是两份手写来源，发版流程未做一致性校验；若只改其一，`reaui --version` 会与关于页的「配套版本」不一致。
- 独立设置窗口读到的是已落盘文档（`AutoSaver` 有延迟），未做实时跨窗口订阅；已在每次进入关于页时重新读取。
- 按本次确认的范围，不探测用户本机安装的 `reaui` CLI 版本，也不显示文档名。

## 设计系统 v2 与 DESIGN.md 通道（2026-11-10）

把设计系统从「生成提示词里的 10 个字段」扩展为可表达语义层与排版阶梯的契约，并把「选择」提前到创建文档的那一刻。变更见 `openspec/changes/align-design-system-with-design-md/`。

**命令结果**

- `pnpm typecheck`、`pnpm build`（wasm + web）通过；`openspec validate align-design-system-with-design-md --strict` 通过。
- `pnpm exec vitest run`：548 通过 / 2 跳过（65 个测试文件通过、2 个真实 Agent 冒烟按环境跳过）。
- `packages/design-system/test/system.test.ts` 25 项：type ramp 变量与兼容别名、颜色别名解析与环、动效值域、v1 包可读、扁平旧记录保持 v1 哈希。
- `packages/design-system/test/designMd.test.ts` 4 项：导出→导入 hash 相同、二次导出字节一致、八个正文小节、真实 `DESIGN.md` 导入（三位 hex、`tight/control/popup/dialog` 映射、缺少 `primary` 补默认值并 warning）、无 frontmatter 报错。
- `packages/storage/test/systems.test.ts` 新增 2 项：`ensureSystemVersion` 幂等注册并可直接固定（清单 v4）；已有版本时按下一 revision 注册。
- `packages/editor/src/agent/designSystem.test.ts` 新增 1 项：`bound` 只在系统非草稿且被文档固定时为真。
- `packages/editor/src/agent/generation.test.ts`：已固定提示词含「只能引用 var(--rea-ds-*)」，未固定提示词含「未固定设计系统」并要求字面量。

**实现要点**

- 创建文档先注册 / 发布系统再固定：`HomeApp.systemVersion()` → `ensureSystemVersion()` / `publishSystem()` → `model.create(name, version)` → `systemTransaction`，首次保存即为清单 v4。
- `DesignAgentPanel` 优先读 `DocumentSession.system`；`AgentTurn.system` 与提示词使用同一份包。
- 编辑器内文档已固定时，composer 的系统下拉变为只读「名称 · vN」，切换走「设计系统」对话框的固定 / 升级事务。
- DESIGN.md 以 frontmatter 为机器层、正文仅供人读；导入的自有命名按数值映射并报告 warning。

**未覆盖 / 待补**

- 未运行 CDP + headless Chrome 真机复核：首页创建后菜单版本、composer 只读态、语义角色 / 排版阶梯编辑、DESIGN.md 导入导出往返的界面表现仍待 8.4 补测。
- v2 包的编辑约束依赖工作台表单；直接手改 `localStorage['rea-home:systems']` 写入非法令牌会在下次读取时被 `isSystems()` 丢弃（保存路径已加校验）。
- DESIGN.md 正文不参与导入；手写文件的指南若只写在正文，导入后 `guidelines` 为空。
- 动效只表达 duration / easing，不包含 keyframes 与 spring 参数。

## 设计系统导入入口改为预填会话输入（2026-11-11）

「导入 DESIGN.md / CSS」入口不再在文件选择阶段调用 `importDesignMarkdown()`，也不再自动发送：选中的文件挂到输入框的参考附件，同时预填一条提取指令，由用户确认或修改后自己发送。起因是散文型 DESIGN.md（如 Monday.com 风格规范）在入口处必然抛 `DS_MD_INVALID`，而同一文件从输入框「＋」加入却能正常工作。变更见 `openspec/changes/route-design-md-import-through-chat/`。

**命令结果**

- `pnpm typecheck`、`pnpm build`（wasm + web）通过；`openspec validate route-design-md-import-through-chat --strict` 通过。
- `pnpm test`：65 个测试文件通过、2 个真实 Agent 冒烟按环境跳过；548 项通过、2 项跳过。`designMd.test.ts` 的往返与「无 frontmatter 报错」用例保持原样。
- `node scripts/verify-design-system-import-entry.mjs`（需先 `pnpm dev`，默认 `http://127.0.0.1:5173`）：8 项全部通过。

**CDP 复核覆盖**

- 首页 → 设计系统 → 打开系统后，创建引导卡仍显示「导入 DESIGN.md / CSS」，文件输入存在。
- 以 `DataTransfer` 构造一份无 frontmatter 的 Monday.com 风格 DESIGN.md 并触发入口：附件胶囊出现文件名，输入框预填「按附件 … 提取设计系统：优先沿用文件里的颜色、排版、圆角与组件规范。」，对话区没有新增轮次，`.sys-banner` 为空。
- 截图确认预填文案两行完整可见、光标在末尾：`/tmp/rea-ds-import-prefill.png`。
- 点击发送后才产生一轮，日志同时包含文件名与指令：`/tmp/rea-ds-import-entry.png`。
- 生成进行中再次选择文件：出现「正在生成，稍后再导入。」，文件不被静默丢弃。

**实现要点**

- `handleImport()` 把文件追加到 `attachments`，输入框为空时 `setPrompt(importPrompt(file.name))`，随后聚焦并把光标放到末尾；发送仍走原有 `send(prompt)`。
- 输入框已有文字时不覆盖，只追加附件。
- 删除 `importMarkdown()` 与 `importDesignMarkdown` / `upgradeTokens` 的 UI 引用；库函数、CLI 能力与往返测试保留。
- 引导卡 hint 改为「作为参考资料，由 Agent 提取成令牌」。

**未覆盖 / 待补**

- 契约型 DESIGN.md 经 Agent 提取后不再保证 hash 与字节往返，模型可能改写数值；需要严格往返时使用 CLI 或库函数。
- 未验证真实 Agent 生成完成的整套系统质量：复核只到「预填、确认发送、请求携带附件」；本次运行时该轮返回「已有生成任务正在运行，请等待完成或先取消。」，与本改动无关。
- 不支持的文件类型与超过 100KB 的文本由 `attachmentContext()` 在发送时拒绝，入口不再提前校验，错误以失败轮次呈现，未单独截图。

## 设计系统生成失败修复：严格 schema 与失败原因透传（2026-11-11）

设计系统页发送请求后固定报「Codex 生成失败。请检查登录、模型与网络后重试。」，并附 `codex_models_manager::manager: failed to refresh available models: request timed out`。排查确认是两个叠加缺陷：`systemSchema` 违反严格结构化输出规则（`summary` 未列入 `required`，`tokens.color` / `typography.roles` 是开放映射），请求在生成前被 400 拒绝；本地 Agent 只用 stderr 组织错误，而真实原因写在 stdout 的 `turn.failed` 事件里。变更见 `openspec/changes/fix-design-system-generation-errors/`。

**命令结果**

- `cargo test -p rea-local-agent`：14 项通过（新增失败事件提取、噪音过滤、假 Codex 的 `noisy` 路径）。
- `pnpm typecheck` 通过；`pnpm test`：65 个文件通过 / 2 跳过，551 项通过 / 2 跳过；`pnpm build` 通过。
- `openspec validate fix-design-system-generation-errors --strict` 通过；`git diff --check` 干净。

**真机复核**

- 在独立端口 `5273` 启动开发服务（`crates/local-agent` 会由 Vite 插件重新 `cargo run`，避免复用 5173 上的旧桥接）。
- 失败路径：向 `/__rea/agent` 提交一个 `required` 不覆盖全部属性的 schema，任务返回 `Codex 生成失败：生成格式约束与当前模型不兼容，请更新后重试。` 加模型原句 `Invalid schema for response_format 'codex_output_schema': ... Missing 'a'.`，错误里不含 `codex_models_manager`。
- 成功路径：设计系统页输入「把主色改成 #7C3AED，其它令牌与组件保持不变。」，一轮真实 Codex 生成完成（`执行过程 · 3 项`），改动清单为 `primary #356AF0 → #7C3AED`、圆角档位、组件规范，右侧主色字段与配色预览同步更新；无错误条、无失败标签。截图 `/tmp/rea-ds-generation.png`。

**实现要点**

- `systemSchema`：`summary` 进入 `required`，`radius.xl` 必填，`tokens.color` 改为 `[{ role, value }]`，`typography.roles` 改为 `[{ role, size, lineHeight, weight }]`，所有对象 `additionalProperties: false`。
- `parseGeneratedSystem()` 用 `foldRoleArrays()` 还原角色数组；对象形态原样通过，API 提供商与旧调用不受影响。
- Rust 侧新增 `failure_reason()` / `readable_failure()` / `failure_hint()` / `stderr_is_noise()`；进程退出后先 `join` stdout、stderr 读线程再判定结果，避免最后一行 `turn.failed` 晚于错误组装。

**未覆盖 / 待补**

- 未在桌面版（Tauri）复跑：桌面端复用同一 `crates/local-agent`，但需重新编译产物后才生效。
- 未覆盖非 schema 类真实失败（登录过期、限流）的真机表现，映射规则由单测守护。

## 设计系统原样采用 AI 结果，在 UI 提示待修项（2026-11-11）

schema 修好之后，用户再次生成时收到「生成的设计系统格式不完整，请重试。」。第一版实现把这句话换成「点名 + 自动重试一次 + 别名补位」，用户否决了这个方向：自动修补会让中间修改完全黑盒，用户既看不到模型返回了什么，也不知道自己该改哪一处。最终口径是**原样采用 + UI 警告 + 发布前闸门**。变更见 `openspec/changes/report-design-system-format-issues/`。

**复现与定位**

- 用 CDP 记录真实请求，把设计系统页的 prompt 与 `systemSchema` 导出后直接调用 `/__rea/agent`，连续两轮（按附件提取、局部改主色）返回的都是合规结果，解析通过——说明失败取决于模型某次的返回内容，而不是固定路径。
- 解析入口 `packages/editor/src/agent/designSystem.ts` 的复合布尔判断是唯一来源：任一字段不合规都只抛同一句话，`validateTokens()` 已经产出的 `SystemIssue`（含 `path`）被丢弃。

**实现要点**

- `parseGeneratedSystem()` 返回 `{ system, warnings }`：只做形状转换（角色数组折回记录、缺失的令牌分组开成空容器），其余原样写入；不补默认值、不做别名映射、不排序刻度、不重试。
- 警告分三层，都由同一份 `SystemIssue` 驱动：轮次内「已按 AI 返回写入，以下内容需要你修正」清单、页面顶部「AI 返回的内容有 N 处需要修正」计数条（按消息去重，避免同一句话因多个路径重复）、左侧目录按 `SystemIssue.path` 标出的受影响小节。
- 草稿允许不完整：`isSystems()` 退到记录外壳校验，刷新后仍能加载；闸门只有两处——「发布版本」与「用于 UI 生成」在 `validateTokens()` 报错时 `disabled`，并在调用入口提前 `setError` 兜底。
- 预览不越界：`specimenSize()`（10–32）与 `sampleSize()`（8–96）只限制绘制尺寸，输入框、字段与存储值仍是模型返回的原值。

**验证**

- `packages/editor/src/agent/designSystem.test.ts`：11 项通过，覆盖原样保留缺字段 / 非法取值、组件为空不套默认、对象形态兼容、跨 `tokenContainers` 的结构。
- `packages/editor/src/agent/generation.test.ts`：6 项通过，`isSystems([invalid])` 为 `true`，非法令牌由 `validateTokens()` 拦截，`parseGeneratedSystem(...).warnings.length > 0`。
- `pnpm typecheck` 通过；`pnpm test`：65 个文件通过 / 2 跳过，554 项通过 / 2 跳过；`pnpm build` 通过。
- `openspec validate report-design-system-format-issues --strict` 通过；`git diff --check` 干净。

**真机复核（CDP + headless Chrome，脚本 `/tmp/rea-verify-warnings.mjs`）**

- 真机生成逼不出稳定的非法取值（模型会自行规范化，两轮都返回合规令牌），因此在 `localStorage['rea-home:systems']` 注入一条外壳合法、内容不合规的记录（`primary: 'blue'`、`space.scale: [64,8,4]`、`radius.md: -4`、`body.size: 200`、`components: []`），刷新后从首页卡片进入设计系统页。10 项断言全部通过：
  - 记录在刷新后仍被列出并打开（`isSystems()` 放宽生效）。
  - 顶部警告条给出 5 处与去重后的三类消息；左侧 `配色 / 排版 / 间距 / 圆角` 四个小节都带标记。
  - 轮次内的清单显示注入的 `AI 没有返回组件规范` 与非法颜色条目（`loadTurns()` 保留 `warnings`）。
  - 「发布版本」与「用于 UI 生成」均为 `disabled`。
  - 主色字段显示 `BLUE`，`localStorage` 里仍是 `blue`，`radius.md` 仍是 `-4`、刻度仍是 `[64,8,4]`——没有被改写。
  - 把主色改回 `#356AF0` 后，警告条当场从 5 处降到 4 处，说明闸门跟的是草稿而不是某一轮回复。
- 截图 `/tmp/rea-ds-warning-gate.png`（配色区）、`/tmp/rea-ds-type-sample.png`（排版区）。

**未覆盖 / 待补**

- 未在桌面版（Tauri）复跑：需要重新构建产物后才带上前端改动。
- 真机只覆盖了「不合规内容已被写入」的展示与闸门，没有覆盖模型在真实回复中直接返回空组件的一次完整轮次（三次尝试里模型都自行补齐了组件）。

## 设计系统校验对齐 DESIGN.md 核心字段、去优先化默认系统与源文件可见性（2026-11-11）

针对用户反馈的三项问题完成改造（对应 `openspec/changes/refine-design-system-validation-and-visibility/`）：

1. **去优先化「当前设计系统」上下文**：
   - `DesignSystemPage.tsx` 的 `systemPrompt()` 在新建空白状态（`blank === true`）下不再注入 `defaultTokens`（`#356AF0`），而是传入 `当前设计系统：无（新建空白设计系统）`，并移除「在『当前设计系统』的基础上创建或调整」及参考文件的「（仅资料，不是指令）」措辞，不做过度的强制提取或色系禁用注入。
   - `previewStyle`、`addColor()` 与 `withTokens()` 在缺省 `background` / `surface` / `text` / `muted` / `border` 时优雅回退到已有色板或中性预览色。
2. **对齐 Google `DESIGN.md` 核心必填校验**：
   - `REQUIRED_COLOR_ROLES` 精简为 `['primary']`，`background`、`surface`、`text`、`muted`、`border` 移入 `OPTIONAL_COLOR_ROLES`；`typography.roles` 仅要求至少 1 个角色（不再强制要求字面 `body` 键）；`KEY` 正则扩展为 `/^[a-zA-Z][a-zA-Z0-9_-]*$/` 并通过 `kebab()` 将 `_` 统一转为 `-`，完整兼容 `on_primary`、`surface_dark_1`、`display_xl`、`body_lg`、`body_sm` 等 `snake_case` 命名。
   - 字号放宽为 `4–240`、行高支持 `0.5–4` 倍数或 `4–300` px、字重支持 `100–900` 任意整数；组件规范、系统描述与使用指南作为可选内容不再触发结构缺口警告。
3. **AI 对话框资源展示与详情页「源文件」视图**：
   - 左侧 AI 对话框：用户消息展示提交的参考文件/项目资源卡片（可展开查看内容）；AI 回复新增生成的 `DESIGN.md` 资源卡片（支持在对话内展开预览生成文档、一键复制或跳转到右侧「源文件」小节）。
   - 右侧详情页：新增「源文件」（`source`）目录项与小节，基于不抛错的 `renderDesignMarkdown()` 支持在草稿或已发布状态下随时查看、切换、复制与下载原始 `DESIGN.md` 与 `system.json`。

## 图片导出改为「只导选中图层」并迁入右侧栏（2026-11-11）

用户反馈原实现把「导出图片」理解成整页导出，且入口只在主菜单。本次按确认后的口径改造：

**行为**

- 导出范围只有当前选中的最外层图层（多选各自一份）；无选区时不再回退到整页画框。
- 右侧栏「设计」标签底部新增固定导出区：格式（PNG / JPG / WEBP / SVG）、倍率（1x / 2x / 3x，SVG 时禁用）、文件名后缀、`导出选中的…`。导出区固定在属性面板下方，不随属性滚动；无选区时不渲染。
- 主菜单「导出图片…」保留，无选区时置灰；对话框与右栏共用同一导出函数。
- WEBP 走浏览器原生 `canvas.toBlob('image/webp')`，保留透明背景；编码器不支持时抛错而不是把 PNG 内容写成 `.webp`。后缀由 `applySuffix()` 清掉路径分隔符后拼在图层名与扩展名之间。

**命令结果**

- `pnpm typecheck`、`pnpm build`、`openspec validate add-svg-vector-import-and-image-export --strict`、`git diff --check` 通过。
- `npx vitest run packages/editor/src/export/targets.test.ts packages/editor/src/inspector/ExportPanel.test.tsx`：7 项通过（只导选中、无选区报错、隐藏图层、同名、后缀、文件名清洗、导出区文案）。
- 全量 `npx vitest run`：560 通过 / 1 失败 / 2 跳过。失败项为工作区既有的设计系统改动（`packages/editor/src/agent/designSystem.test.ts` 期望 5 个颜色、实际 19 个），与本次导出改动无关。
- `node /tmp/rea-verify-export-panel.mjs`（CDP + headless Chrome，1440×900，浅色）：**20 项全部通过**。覆盖无选区时右栏无导出区且菜单置灰、选中 48×48 图标后导出区出现在属性面板之后并贴住右栏底部、默认 PNG / 1x / 空后缀、格式为 PNG / JPG / WEBP / SVG、1x PNG 实际 48×48（不是整页）且文件名带 `@2x`、WEBP 为合法 RIFF/WEBP、SVG 时倍率禁用而后缀保留、菜单对话框仍提供四种格式、隐藏选中图层后导出区消失且菜单再次置灰。
- 截图 `/tmp/rea-export-panel-view.png`（浅色，右栏底部导出区）。

**未覆盖 / 待补**

- 未在桌面版（Tauri）复跑系统保存面板；浏览器下载路径已覆盖。
- 未做右栏宽度的极限压缩测试（280px 默认宽度下三控件完整显示）；更窄的右栏需要拖宽验证。
# 项目独立设计系统：make-design-systems-project-owned

OpenSpec：`openspec/changes/make-design-systems-project-owned/`，按四阶段完成文档/AI 校验、项目采用与库迁移、项目内编辑、工具与协议对齐。

- `pnpm exec vitest run`：575 通过、2 个真实模型冒烟测试按配置跳过（71 文件）。新增覆盖同一未发布系统连续创建、首次保存失败不落残缺文档、来源与项目隔离、撤销、令牌冲突、系统库幂等迁移、系统会话文件往返、候选快照保护、v4 组件共存、CLI/MCP 实际调用。
- `pnpm typecheck`、`pnpm build`（WASM/Web）、`pnpm build:cli`、`pnpm build:mcp`、`openspec validate make-design-systems-project-owned --strict` 和 `git diff --check` 通过。Web 构建仍报告既有主包体积提示。
- `pnpm test:rust`：26 项通过。初次沙箱运行的两个本地 HTTP 测试因禁止监听端口失败；允许本机测试监听后全量通过，无 Rust 代码变更。
- `node scripts/verify-project-design-systems.mjs`：隔离 Chrome 临时用户目录、1440×900 与 390×844，46 个检查通过。实际点击库创建/项目创建、项目编辑、撤销重做、另存到库、AI 系统编辑（仅模型边界模拟）、实际 `.reaui` 下载、刷新和会话恢复。确认导出包含精确快照与会话，未影响另一项目及来源库。截图 `/tmp/rea-project-system-{desktop,mobile,ai}.png` 已目视检查；发现并修复了窄屏保存按钮被隐藏的问题。
- 同步仓库内 Codex 集成的 CLI/MCP 预构建包，通过真实 stdio MCP 客户端验证 10 个工具及 CLI 初始化/读取系统；未修改已安装的外部插件或发布 npm 包。
- 机械设计检测未发现新增样式令牌问题；保留既有 system.css 字号/圆角建议。已有单元测试用任意用户字体 Inter，不属于编辑器字体，已做仅该测试文件的窄范围豁免；未刷新 DESIGN.md sidecar。
