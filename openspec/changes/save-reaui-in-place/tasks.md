## 1. 原生侧：路径与受控写回

- [x] 1.1 `OpenedFile` 增加 `path`，`read_document()` 返回解析后的绝对路径（`canonicalize`），并让 `reads_the_original_bytes_and_filename` 断言路径就是网页层会原样交回的那一份
- [x] 1.2 新增 `DocumentPathStore`（`bound` + `opened`），启动时从应用数据目录 `document-paths.json` 载入，写入后原子持久化
- [x] 1.3 `take_pending_open_files` 把成功读取的文档路径记入 `opened`
- [x] 1.4 新增 `save_document(id, name, bytes, path, choose_path)`：命中已授权路径直接写，否则弹原生保存对话框；写入走 `.{name}.{pid}.tmp` → `sync_all()` → `rename()`
- [x] 1.5 单元测试：`authorized` / `remembered_target` 的授权范围、原子替换后无临时文件残留、目标不可写时原文件不受影响、缺少扩展名补 `.reaui`

## 2. 前端：平台层与文档会话

- [x] 2.1 `platform.ts`：`listenForOpenedFiles` 把 `path` 传给回调；新增 `saveDocument(blob, name, { id, path, choosePath })`，桌面版走 `save_document`，浏览器版下载并返回 `downloaded`
- [x] 2.2 `useDocument`：启动时读回 `meta.document-files`，`importFile(file, path)` 绑定来源路径，`remove` 清理绑定
- [x] 2.3 `useDocument` 新增 `save()` / `saveAs()`：先排空自动保存，再导出整份 `.reaui`，成功后更新绑定并用 2.4 秒自动消失的提示回执
- [x] 2.4 `EditorApp` 绑定 `⌘/Ctrl+S` 与 `⇧⌘S`，主菜单改为「保存」+「另存为 .reaui…」，快捷键一览补一行，保存状态按钮的 tooltip 显示当前目标文件

## 3. 测试与验证

- [x] 3.1 `platform.test.ts`：写回时透传已知路径、无路径时不带路径、另存为强制对话框、取消不写、写入失败向上抛、浏览器版下载且不调用原生命令、打开文件时转发路径
- [x] 3.2 `cargo test -p rea-ui-desktop`：10 项通过
- [x] 3.3 `scripts/verify-save-shortcut.mjs`：`#demo` 打开示例后 `⌘S` 产出 ZIP（含 `rea.json` 与页面，8.2kB）、提示「已下载」，`⇧⌘S` 再次产出
- [x] 3.4 `pnpm typecheck` / `pnpm test` / `pnpm build` / `openspec validate save-reaui-in-place --strict` / `git diff --check`
- [ ] 3.5 真机桌面版复核：`pnpm desktop:dev` 后从 Finder 打开一份 `.reaui`，改图层、`⌘S`、退出、重新双击打开确认改动保留（需人工操作，未在本次会话执行）

## 4. 文档

- [x] 4.1 `docs/desktop.md`：保存入口、原子替换、写回权限、路径持久化、同名副本边界
- [x] 4.2 `docs/architecture.md`：数据流补 `⌘S` 分支，「持久化与恢复」补充来源路径与受控写回
- [x] 4.3 `README.md` / `README.zh-CN.md`：保存行与快捷键表
- [x] 4.4 `docs/verification.md`：本次自动检查、CDP 复核与未覆盖项
