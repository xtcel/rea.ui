# 校验错误与修复

`reaui validate --json` 返回 `{ ok, errors[] }`。按 `code` 查表，只改 `path` 指向的文件与 `message` 指向的位置。

## 错误码

| code | 含义 | 典型 message |
|---|---|---|
| `PAGE_SUBSET` | 使用了不允许的节点或模块 | `未注册的设计节点：div` |
| `PAGE_STATIC_ONLY` | 出现非静态表达式 | `禁止非声明式表达式：ArrowFunctionExpression` |
| `PAGE_STRUCTURE` | 顶层 Frame 或容器结构不合法 | `顶层 Frame 必须含基础 absolute` |
| `DESIGN_ID` | designId 不合法或重复 | `designId 不合法` |
| `MANIFEST_INVALID` | 清单字段或页面路径不合法 | `清单格式不合法` |
| `PAGE_MISSING` | 清单引用页面缺失 | `缺少页面文件` |
| `PAGE_ID_MISMATCH` | Page id 与清单不一致 | `页面 id main 与清单 home 不一致` |
| `NODE_LOCKED` | 修改了锁定节点 | `节点已锁定` |
| `REAUI_INVALID` | ZIP 损坏或格式不支持 | `ZIP 目录损坏` |

## 常见修复

### 1. 用了 HTML 标签

```tsx
// 错误
<div className="p-4"><span>标题</span></div>

// 正确
<Frame designId="card" className="absolute left-0 top-0 w-[320px] h-[180px] p-4">
  <Text designId="card-title" className="absolute left-0 top-0 w-[200px] h-[24px] text-[16px]">标题</Text>
</Frame>
```

`div` → `Frame`；纯色块 → `Rect`；文字 → `Text`；圆 → `Ellipse`；图标 → `Vector`。

### 2. 用了事件或函数

```tsx
// 错误
<Text designId="btn" onClick={() => save()}>保存</Text>

// 正确
<Text designId="btn-label" className="absolute left-0 top-0 w-[64px] h-[40px] text-[14px] text-white">保存</Text>
```

设计稿不承载交互，按钮用 `Rect` + `Text` 叠出来即可。

### 3. 用了变量或 map

```tsx
// 错误
{items.map(item => <Text key={item.id}>{item.name}</Text>)}

// 正确：展开为静态节点
<Text designId="row-1" className="absolute left-[24px] top-[80px] w-[200px] h-[22px] text-[14px]">张三</Text>
<Text designId="row-2" className="absolute left-[24px] top-[132px] w-[200px] h-[22px] text-[14px]">李四</Text>
```

### 4. 顶层 Frame 缺尺寸

```tsx
// 错误
<Frame designId="page" className="w-full h-full">

// 正确
<Frame designId="page" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-[#f6f7f9]">
```

顶层 Frame 必须同时有 `absolute`、`left-*`、`top-*`、`w-[…]`、`h-[…]`。

### 5. designId 重复

同一页面内每个 `designId` 唯一。列表项用 `row-1`、`row-2`，卡片用 `card-1`、`card-2`，不要复用 `card`。

### 6. 用了 style 或百分比

```tsx
// 错误
<Rect designId="box" style={{ width: '50%', background: '#eee' }} />

// 正确
<Rect designId="box" className="absolute left-0 top-0 w-[480px] h-[120px] bg-[#eeeeee]" />
```

### 7. 用了 Image

本期不支持资源。用 `Rect` 占位 + `Vector` 图标表达图片区域，并在交付说明中标注「图片位待替换」。

## 修复纪律

1. 一次只处理 `errors[0]`，改完立即重新校验。
2. 不因为一个错误重写整页。
3. 两轮后仍有错误，停止并向用户说明。
4. 不要把错误页面打包成 `.reaui`。
