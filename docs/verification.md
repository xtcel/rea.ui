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

## WorkBuddy Agent 与 reaui CLI

对应 `add-workbuddy-design-agent`。验证环境：macOS、Node 22.22.2、pnpm 12.4.1、Vite 8.3.5。

### 自动化

- `pnpm exec vitest run packages/reaui-cli`：3 个文件、15 项通过（参数解析 4、文档命令 6、预览与画板 5）。
- `pnpm typecheck`：通过。
- `openspec validate add-workbuddy-design-agent --strict`：通过。

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
