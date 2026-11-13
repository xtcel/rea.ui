---
name: reaui-design
description: Use when the user asks to create, edit, validate, or preview REA UI design documents (.reaui) — app screens, dashboards, landing pages, forms, mobile pages, multi-page design files, or revisions to an existing .reaui. Produces editable static TSX, validates with the bundled reaui CLI, and packs a .reaui that the REA UI editor can open.
---

# REA UI design workflow

Deliver a **validated `.reaui` document** the user can open and keep editing in
REA UI. A `.reaui` is a ZIP containing `rea.json` plus one static TSX page per
screen. The same validator runs in the CLI and the editor: if
`reaui validate` passes, the editor can open the file.

Two runtimes ship with this plugin:

| Runtime | Use it for | Location |
|---|---|---|
| **CLI (primary)** | Everything that writes the user's project files: `init`, `validate`, `pack`, `unpack`, `preview`, `diff` | `scripts/reaui.mjs` next to this file (wraps `server/reaui-cli`) |
| **Local MCP (secondary)** | Drafting/validating inside the plugin workspace, plus the `reaui://protocol` resource | `server/reaui-mcp`, tools described in `references/mcp.md` |

Detailed references: `references/cli.md` (commands, flags, exit codes),
`references/mcp.md` (MCP tools, workspace rules), `references/protocol.md`
(document contract), `references/error-fixes.md` (validation errors),
`references/layout-patterns.md` and `templates/` (starting structures),
`references/design-system.md` (default visual tokens).

## Non-negotiables

1. Never create or edit `rea.json` by hand; use `reaui init` (or `reaui_create_design`).
2. Never hand-write, hand-zip, or hand-patch a `.reaui`. Always `reaui pack`.
3. Never raise the manifest `version` or place `design/system.json` by hand.
   Adopt systems through `reaui system set` when supported, or `scripts/pin-system.mjs` in older bundled runtimes. Existing project snapshots always take precedence over default tokens.
4. Never deliver a document that has not passed a final
   `reaui validate <file.reaui> --json` with `ok: true` (exit code 0).
5. Deliver files into the **user's project directory**. The MCP workspace and
   the plugin install directory are not delivery locations.
6. Do not claim visual acceptance, interaction, or a working app. A `.reaui`
   is an editable static design document.

## 1. Confirm scope (one round at most)

Ask only what the request cannot imply. Otherwise use these defaults and state
them in the delivery message:

| Item | Default |
|---|---|
| Pages | 1 page; 2–4 when the request mentions roles/steps/several screens; hard max 12 |
| Artboard | Desktop `1440×1024`; mobile `390×844`; dashboard/list `1280×900` (max 4096) |
| Visual style | Tokens in `references/design-system.md` unless the user supplies a brand/design system |
| Copy | User-provided real copy; otherwise idiomatic Chinese placeholders matched to the scenario |
| Output dir | `<project>/designs/<slug>/` for the source tree, `<project>/designs/<slug>.reaui` for the document, `<project>/designs/<slug>-preview.html` for the preview |

If the user gave no project directory, use the session working directory and
say so. Never write into the plugin directory as the final deliverable.

## 2. Preflight (must run before generating)

The directory containing this `SKILL.md` also contains `scripts/`. Set a shell
variable to it (use the absolute path of this skill file if the host exposed
it; otherwise locate it once):

```bash
SKILL_DIR="/absolute/path/to/reaui-designer/skills/reaui-design"
reaui() { node "$SKILL_DIR/scripts/reaui.mjs" "$@"; }
reaui --where       # prints pluginRoot, cli, cliVersion, mcpServer, mcpWorkspace
reaui --version     # must print 0.1.3
node --version       # must be >= 22.18
```

- If `--where` fails: retry with `npx -y @xtcel/reaui-cli@0.1.3 <command>`.
  If the network is unavailable too, use the local MCP for drafting only and
  tell the user the final `.reaui` export needs the CLI.
- If you cannot locate the skill directory, search for it rather than guessing:
  `ls -d ~/.codex/plugins/cache/*/reaui-designer/*/skills/reaui-design`
  (adjust for the host's plugin cache on Windows).
- **Expected stderr noise**: `[UNDICI-EHPA] Warning` and, in sandboxed hosts,
  `WebSocket server error: listen EPERM ... 0.0.0.0:24678` from Vite. They are
  harmless. Judge success by exit code and the `--json` payload, not by stderr.

## 3. Read the contract once

- MCP available: read the `reaui://protocol` resource (`read_mcp_resource`).
- Otherwise read `references/protocol.md` and `references/cli.md`.
- Pick the closest skeleton from `references/layout-patterns.md` and
  `templates/`; replace all sample copy.

## 4. Plan, then initialize

Decide page ids (lowercase kebab-case, `^[a-z][a-z0-9-]{0,63}$`), page names,
artboard size, and section structure before writing TSX.

Create the directories first — `pack --out` does not create parent directories:

```bash
mkdir -p "$PROJECT/designs"
```

Then:

```bash
reaui init "$DOC" --name "文档名称" \
  --page dashboard --page-name 工作台 \
  --page settings --page-name 设置 \
  --width 1440 --height 1024
```

`init` writes v2 by default; add `--components` for v3, or `--system` for v4. Use `components init` to add a catalog to an existing document. Never create `rea.json`
yourself.

## 5. Write page TSX

Validator-enforced rules (these fail `reaui validate`):

- One page file = one default-exported `<Page>`; imports only from `@rea/design`.
- Core primitives: `Page`, `Frame`, `Group`, `Rect`, `Ellipse`, `Text`,
  `Vector`, `Line`, `Polygon`, `Star`. Use `Instance`/`SlotContent` on pages and `Components`/`Component`/`Slot` in the catalog when reuse is useful. HTML tags (`div`/`span`/`img`/`svg`) and
  project components are rejected. Component reuse is a default design decision, not an opt-in profile. `Image` may reference only existing local assets under `assets/`.
- Every top-level `Frame` needs `absolute` plus an explicit width and height
  (`w-[…px] h-[…px]`). `left-0 top-0` is recommended for determinism; the
  validator requires `absolute` + size.
- Props are static literals only: no functions, events, variables, loops,
  `map`, conditionals, template strings, spread, `style`, `key`, `ref`, `href`.
- `designId` is lowercase kebab-case (`^[a-z][a-z0-9-]{1,63}$`), unique within
  its page; use readable `name` values. Page ids must match the manifest.

Editor/Tailwind conventions (not validator errors, but required by the protocol
and checked visually by humans):

- All styling in a Tailwind `className` (Tailwind 4.3.3 default theme and
  preflight). Colours as hex arbitrary values, e.g. `bg-[#ffffff]`,
  `text-[#30343b]`; sizes `w-[317px]`; shadows `shadow-[0_1px_2px_rgba(...)]`.
- No percentages, `vw`/`vh`, `calc()`, `env()`, external fonts/images/icons.
  Draw icons with `Vector`/geometry; use `Rect` placeholders for images.
- Generation budget (editor AI limits): keep **≤ 12 pages**; treat **80 layers per page as a soft planning budget**. Preserve layout hierarchy and independent business elements even when faithful reproduction needs more layers. Keep all content inside the artboard.
- Copy is Chinese unless the user asks otherwise.

Write each page as a complete file (write/edit tool or the MCP
`reaui_write_page`), then validate immediately (next step). Do not batch all
pages and validate only at the end.

## 6. Validate and repair loop

```bash
reaui validate "$DOC" --json
reaui audit "$DOC" --json
```

- Two payload shapes:
  - Static document errors (page subset/static rules, designId, manifest, page
    references, id mismatch, ZIP): `{ ok: false, errors: [{ code, path,
    message, hint }] }`.
  - Full report (validation passed, or design-system conformance): `{ ok,
    document, pages, system, issues: [{ code, severity, path, node?, message,
    hint }], warnings[] }`.
- Repair the first `errors[0]` entry, or — when there is no `errors` array —
  the first `issues[]` entry with `severity: "error"`. Re-run validation after
  each fix. Do not rewrite the whole page because of one error, and do not
  "fix" by deleting large regions.
- After 3 repair rounds still failing (or an error you cannot map to a rule),
  stop, report the exact `code`/`path`/`message`, and ask how to proceed.
- Use `--strict` only when the user explicitly wants warnings treated as
  failures. `DS_OFF_SCALE` / `DS_LITERAL_COLOR` are warnings, not errors.
- Never pack or deliver while `ok` is false. Never hand-edit `rea.json` to
  silence `MANIFEST_INVALID`; regenerate with `init` instead.

## 7. Pinned design system (optional v4 capability)

Use this only when the user supplies or asks for a brand/design system, design
tokens, "固定设计系统", or a token-driven theme. Existing v4 projects always retain and use their embedded system; do not substitute the default visual tokens. New requests without a system stay unbound. v4 supports both components and system snapshots.

Pipeline:

1. Create `<project>/designs/<slug>.system.json` describing the system
   (`format: "reaui-design-system"`, `schemaVersion: 1`, `id`, `revision`,
   `name`, `tokens`, `components`, `guidelines`; `hash` may be omitted — the
   script computes it). See `references/design-system.md` for token shape.
2. Prefer adopting the valid complete package first with `reaui system set "$DOC" --system <package.json>` when supported. Then make page `className` values reference the system through
   `var(--rea-ds-*)` for colour, spacing, radius and shadow; positioning and
   sizes stay design px. Validate first while the document is v2: unresolved
   token references surface as `DS_TOKEN_UNDECLARED`, and a v2 document that
   uses tokens reports `DS_REQUIRES_V4`.
3. Pin atomically:

   ```bash
   node "$SKILL_DIR/scripts/pin-system.mjs" \
     --design "$DOC" --system "<project>/designs/<slug>.system.json"
   ```

   The script validates the snapshot, recomputes the SHA-256 hash, sets
   `rea.json` to version 4, writes `design/system.json`, runs
   `validate --system`, and on failure restores `rea.json` and removes what it
   wrote (including the `design/` directory it created).
   Add `--force` only to replace a different already-pinned system.
4. Re-run `reaui validate "$DOC" --json` and confirm `system.source: "pinned"`.
5. **Editor compatibility is a gate.** Format v4 opens only in a REA UI build
   that supports v4 (repository builds after 2026-11-09). The REA UI 0.1.0
   desktop app built on 2026-11-07 accepts only v2/v3 and shows
   `无法打开「…」：rea.json 清单格式不合法`. Ask the user which editor build
   they will open the file with. If it predates v4 support, deliver the v2
   version as well (re-run `init` + pages without pinning) or ask them to
   update; do not silently deliver a file that will not open.

MCP note: MCP tools expose no design-system operation, so this step must use
the CLI scripts.

## 8. Preview, pack, verify

```bash
mkdir -p "$PROJECT/designs"
reaui preview "$DOC" --out "$PROJECT/designs/<slug>-preview.html"
reaui pack "$DOC" --out "$PROJECT/designs/<slug>.reaui" --force
reaui validate "$PROJECT/designs/<slug>.reaui" --json
reaui audit "$PROJECT/designs/<slug>.reaui" --json
```

If `pack` reports `DOC_INVALID` / `ENOENT` for the output file, the parent
directory does not exist; create it and retry.

The last command is the delivery gate: it must return `ok: true` (exit 0). It
also validates the ZIP container, manifest references, and (when pinned) the
design system snapshot.

## 9. Edit an existing `.reaui`

```bash
reaui unpack "$PROJECT/designs/old.reaui" --out "$PROJECT/designs/old-edit"
# edit only the requested pages; keep designId/name/order of untouched nodes
reaui validate "$PROJECT/designs/old-edit" --json
reaui preview "$PROJECT/designs/old-edit" --out "$PROJECT/designs/new-preview.html"
reaui pack "$PROJECT/designs/old-edit" --out "$PROJECT/designs/new.reaui"
reaui validate "$PROJECT/designs/new.reaui" --json
```

- Unpack to a **new** directory; never edit the original `.reaui` in place.
- Preserve `designId`, page ids, page order, and untouched copy.
- `reaui diff <before> <after>` reports scope; run it when a before-copy exists.
- Keep an existing v4 document at version 4 and leave `design/system.json`
  untouched unless the request changes the system. To change it, use
  `pin-system.mjs --force` and re-validate.
- Overwrite the user's original file only when they ask; otherwise deliver a
  new filename and say which is which.

## 10. Local MCP (secondary path)

The host starts the bundled MCP server with its workspace set to the plugin
root, so **relative MCP paths resolve inside the plugin install directory, not
in the user's project**. Paths must resolve inside that workspace: `..` and
outside paths are rejected with `路径不在工作区内`, and relative paths are the
reliable option. Consequences:

- Use MCP when the user wants a draft, validation, or preview inside the
  plugin workspace, or when you need the `reaui://protocol` resource.
- Do not treat MCP-created files as the deliverable. Export with the CLI:
  `reaui validate <pluginRoot>/designs/<doc> --json` then
  `reaui pack <pluginRoot>/designs/<doc> --out "$PROJECT/designs/<slug>.reaui"`.
- If the user configures their own MCP client (Claude Desktop, Cursor, Codex
  CLI), start the server with `--root <absolute project path>`; then relative
  paths do target the project. See `references/mcp.md`.
- If the MCP tools are missing, continue with the CLI and say the local MCP
  server did not connect. Never fabricate `.reaui` output.

Full tool table, workspace rules, and standalone setup: `references/mcp.md`.

## 11. Deliver

Report, in the user's language:

- Absolute path of the `.reaui`, plus absolute path of the preview when generated.
- Page count and page names, artboard size, manifest version.
- Validation result: `ok`, warning count, pinned system id/revision/hash if any.
- For v4: the editor-build requirement; do not claim it opens everywhere.
- Anything intentionally not done (e.g. images left as `Rect` placeholders).

Do not include raw TSX as the deliverable, and do not claim the design was
visually accepted or behaves like a running app.

## Failure handling

| Symptom | Action |
|---|---|
| `CLI missing` / `ENOENT` | Re-run preflight; fallback `npx -y @xtcel/reaui-cli@0.1.3`; if still unavailable, explain and stop file operations |
| MCP tools unavailable | Continue with the CLI; mention the MCP server did not connect |
| `MANIFEST_INVALID` on a user file | Do not patch JSON; `unpack`/`init` a fresh document and report the original as damaged |
| `rea.json 清单格式不合法` when opening in REA UI | Likely a v4 document in a pre-v4 editor build (REA UI 0.1.0). Explain and offer the v2 version |
| Designs appear under the plugin directory | MCP workspace is the plugin root; export with the CLI and delete the stray draft if the user agrees |
| Validation still failing after 3 rounds | Stop; report `code`/`path`/`message`; ask for guidance |
| `ZIP`/`REAUI_INVALID` errors | Repack with `reaui pack`; never hand-zip |

## 可编辑性要求（格式校验之外）

- 先画布局树：侧边栏 / 顶部栏 / 内容区 / 面板 / 记录行。每区用有业务名称的 Frame/Group，子层使用局部坐标，容器边界贴合内容。例如父 `absolute left-[240px] top-[80px] w-[960px] h-[720px]`，子 `absolute left-[24px] top-[24px]`。
- 优先使用已有组件。同结构重复两次及以上时评估提取 Component/Instance；文字、数字用参数，状态用变体，图标差异可用实例参数，额外内容用插槽。一次性布局不强行组件化。不需要用户每次强调复用。
- 一个业务图标对应独立容器、语义名称（如“搜索图标”）和局部 viewBox（如 `0 0 24 24`）。图标内多个轮廓可属于同一 Vector；禁止按颜色跨图标合并路径，禁止跨业务记录合并多行 Text。Rect/Frame/Line 能表达的内容优先用原语。
- 优先结构化 `path`：`anchors/closed` 为首轮廓，`contours` 为后续轮廓数组，每项也有 `anchors/closed`，锚点 id 全路径唯一。新编辑器支持 A/a 转贝塞尔（转换误差界默认 0.01 SVG 用户单位）和多轮廓锚点编辑。孔洞保留整体 `[fill-rule:evenodd]`，或保留 nonzero 的轮廓方向，不拆成填实形状。
- 80 图层仅为软预算。复杂还原优先保留语义层级、独立编辑与完整内容，不通过合并业务对象来压缩节点。使用已有字体，不下载字体。
- `validate` 只证明格式/契约有效。交付前另运行 `reaui audit <dir> --json` 与最终 `.reaui` 审计；按 path/node/hint 修复，人工判断疑似重复和合并提示，披露保留的建议。不得将零格式错误称为视觉验收或可编辑性证明。
- 新的复合 `path.contours` 需要包含本次改动的编辑器。旧编辑器兼容输出可保留独立 Vector 的原始 d，但必须说明无法在旧编辑器逐点编辑；不得承诺全面可编辑。

### 组件工作流

先使用 `reaui init <dir> --components`；已有文档用 `reaui components init <dir>`。CLI 自动创建合法空目录并按需升级 v3，已有 v4 保留，不手改清单。然后写 `components/main.components.tsx`：

```tsx
import { Components, Component, Frame, Text } from '@rea/design';
export default <Components>
  <Component id="record-row" designId="record-definition" name="实验记录行" parameters={{label:{type:'string',default:'实验名称'}}}>
    <Frame designId="record-content" name="记录内容" className="relative w-[320px] h-[48px]">
      <Text designId="record-label" name="实验名称" binding="label" className="absolute left-[16px] top-[12px] w-[280px] h-[24px] text-[14px]" />
    </Frame>
  </Component>
</Components>;
```

页面 import `Instance`，写静态 `<Instance designId="record-one" name="实验一" component="record-row" values={{label:'稳定性实验'}} className="absolute left-[24px] top-[24px]" />`。每个实例独立 designId；不运行函数、不直接导入业务 React 组件、不伪造 library 来源。

CLI 预检除版本外必须检查 `reaui help` 含 `audit` 和 `components`。这些能力随本次仓库/插件构建提供，尚未发布 npm；旧版 npx 回退没有这些命令时使用更新的仓库/插件构建，不能手改 version 绕过。

工作台模板由 `templates/dashboard.page.tsx` 和 `templates/dashboard.components.tsx` 配套组成。先 init --components，再把后者写入 components/main.components.tsx；其它模板为布局骨架，生成时按业务重复情况评估抽取。
