# macOS 桌面版

REA UI 使用 Tauri 2 提供 macOS 12+、Apple Silicon（arm64）桌面应用。原生入口位于 `src-tauri/`，前端复用 `apps/web/` 和现有编辑器包，几何计算继续使用 Rust 编译的 WASM。

## 开发与打包

在已安装 Xcode 命令行工具的 Apple Silicon Mac 上，准备 Node.js 22.18+、pnpm 12.4.1 与 Rust 稳定工具链（1.90+）：

```bash
rustup target add wasm32-unknown-unknown aarch64-apple-darwin
pnpm install
pnpm desktop:dev
```

`desktop:dev` 自动运行 `pnpm dev`，先编译 WASM，再启动 Vite 和原生窗口。生产构建自动运行 `pnpm build`，完成 WASM、TypeScript 检查和 Web 构建后封装应用。

```bash
pnpm desktop:build:mac  # 指定 aarch64-apple-darwin，输出 app、dmg
pnpm desktop:build      # 使用当前主机架构；macOS 配置同样输出 app、dmg
```

本次已成功生成：

| 产物 | 路径 |
|---|---|
| 应用 | `target/aarch64-apple-darwin/release/bundle/macos/REA UI.app` |
| 安装镜像 | `target/aarch64-apple-darwin/release/bundle/dmg/REA UI_0.1.0_aarch64.dmg` |

可从 Finder 打开 `.app`；DMG 内提供应用安装入口。当前产物用于本机测试，仅有链接器临时签名，尚未进行 Developer ID 签名或 Apple 公证。

## 打开和编辑应用设计稿

[ReaUI_App.reaui](../ReaUI_App.reaui) 是当前首页和编辑器界面的可编辑复刻，包含两个 1440 × 960 画框、249 个图层。文字、矩形、椭圆、容器和矢量图标均为编辑器原生图层；画稿中的按钮和输入框用于界面参考，不执行应用交互。

![可编辑应用界面预览](assets/reaui-app-preview.jpg)

1. 首次启动桌面版后，在首页项目中打开 `ReaUI_App`。内置示例在同一份应用数据中只导入一次，保留已有项目。
2. 左栏切换「首页 · 工作空间」与「编辑器 · 画布与属性」，按 `Shift+1` 适应全部画框。
3. 从画布或图层栏选择对象，在右栏「设计」中修改位置、尺寸、文字和外观；「检查」可查看、复制当前 TSX。
4. 通过编辑器顶栏主菜单「导出为 .reaui」保存完整文档，或「导出当前页面代码 (.tsx)」保存页面源码。

浏览器版不会自动安装该示例。手动导入时，先从首页打开或新建项目进入编辑器，再打开主菜单「导入 .reaui…」，在文件选择器中选择仓库根目录的 `ReaUI_App.reaui`。删除内置示例后也可用此方法重新导入。当前未注册 macOS 文件关联，双击 `.reaui` 不会自动交给应用打开。

可读源码位于 `examples/ReaUI_App/`，包含 `rea.json` 与 `pages/*.page.tsx`。修改生成脚本 `scripts/build-app-design.mjs` 后运行：

```bash
pnpm design:app
```

此命令会重建根目录 `.reaui` 和示例源码；已导入的本地文档需要手动重新导入更新。

## 保存与数据位置

编辑内容自动保存到应用 WebView 的 IndexedDB，与浏览器中的文档库相互独立。跨桌面版与浏览器版传递文档时，使用 `.reaui` 导出、导入。

桌面版导出 `.reaui` 或 `.tsx` 时打开系统保存对话框，仅向用户选择的路径写入文件；取消对话框不会写入。导入复用编辑器的文件选择器，也支持旧 `.design.tsx` 文档迁移。

编辑器关闭窗口前会等待自动保存完成；保存失败时保留窗口并提示导出备份。该保护针对窗口关闭请求，尚未验证覆盖 `⌘Q` 退出应用。

## 验证与视觉延续

已通过生产构建、TypeScript 检查、244 项 TypeScript 测试和 6 项 Rust 几何测试。实际启动原生应用、打开内置设计稿、系统对话框导出 ZIP、浏览器导入及 `.reaui` 导出再导入均已验证；DMG 校验通过。

桌面版和设计稿沿用既有白灰表面、蓝色状态、系统字体及轮廓图标。对照现有 `DESIGN.md`、主题与实现后，本次保留 `DESIGN.md` 和 `.impeccable/design.json`，不新增全局视觉令牌。最终审查结论为可交付，原生窗口及两页画稿的复查截图位于 `.impeccable/review/desktop/`。
