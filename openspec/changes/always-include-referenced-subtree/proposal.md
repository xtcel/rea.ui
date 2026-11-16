## Why

引用画布元素时，每个引用带一个「仅自身 / 含子级」作用域标记，默认「仅自身」。这个默认值多数时候是错的：用户引用一个画框，本意是「改这块区域」，但默认只把画框本身交给 Agent，子级变成了只读——Agent 连里面的文字都改不了，用户还得回头找胶囊上那个小按钮切一次。

同时这个开关本身很难被发现，也没有稳定的心智模型：引用一个画框与引用一段文字，行为完全不同，但界面上只有一个 11px 的角标。

## What Changes

- 引用一律包含整棵子树：节点本身与其全部后代共同构成本轮可改范围。
- 删除「仅自身 / 含子级」作用域开关：去掉输入框胶囊上的切换按钮、`AgentRef.subtree` 字段、`AgentCanvasContext.toggleSubtree()` 与对应样式。
- 范围判定不再看标记：`classifyChanges()` 只要改动的节点是引用节点或它的后代，就算在本轮范围内。
- 提示词改写为「下列元素及其全部子级是唯一可改范围」，不再出现「含子级 / 未标注」的说法。
- 历史轮次里的引用只显示名称，不再追加「（含子级）」。

## 范围说明

- 不改引用数量上限（8 个）、按顶层节点合并、发送后清空等既有行为。
- 不保留「只改容器本身」的模式：真要限制范围，就只引用那个更小的节点。
- 旧会话文件里的 `subtree` 字段不再读取，缺失或多余都不影响加载。

## Impact

`packages/editor/src/agent/{sessions,context,scope,elementContext,generation,DesignAgentPanel}.tsx`、`packages/editor/src/EditorApp.tsx`、`packages/editor/src/home/HomeComposer.tsx`、`apps/web/src/home.css`、`packages/editor/src/agent/context.test.ts`、`docs/local-agent.md`。
