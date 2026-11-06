## ADDED Requirements

### Requirement: 两个独立的显示偏好

系统 SHALL 提供两个互不联动的全局布尔偏好，保存在 `rea-home:preferences` 的 `Preferences` 中：`showRulers`（**默认 `false`**）控制标尺条带、角块、指针位置指示与「从标尺拖出创建」；`showGuides`（**默认 `true`**）控制参考线渲染、命中带、参考线右键操作与吸附候选。旧记录缺少任一字段 MUST 取各自默认值而不是被判定为损坏；修改其中一个 MUST NOT 改变另一个。写入后 SHALL 通过 `rea:preferences` 自定义事件同步同一页面内的首页与编辑器，并通过 `storage` 事件同步其他标签页。`showGuides` 关闭只影响「显示与交互」，MUST NOT 阻止用户从标尺拖出或从菜单添加参考线——这两种动作 SHALL 自动开启显示。

#### Scenario: 默认状态

- **WHEN** 首次打开编辑器，偏好中没有任何显式设置
- **THEN** 标尺不显示；若当前文档已有参考线，参考线正常显示

#### Scenario: 旧偏好兼容

- **WHEN** localStorage 中的 `preferences` 只有 `model` / `sendKey` / `directory`
- **THEN** `showRulers = false`、`showGuides = true`，设置页两个开关分别显示关闭与开启

#### Scenario: 两个开关互不联动

- **WHEN** 在标尺关闭、参考线开启的状态下把「显示参考线」关闭
- **THEN** 仅参考线消失，`showRulers` 仍为 false，标尺状态不变

#### Scenario: 三入口同步

- **WHEN** 在编辑器「视图」菜单开启标尺后打开首页设置页
- **THEN** 设置页的「显示标尺」开关也是开启状态

#### Scenario: 多标签页同步

- **WHEN** 另一个标签页修改了 `showGuides`
- **THEN** 当前标签页的参考线可见性随之更新，无需刷新

### Requirement: 设置页两个开关

首页「设置 → 创作偏好」SHALL 新增「显示标尺」与「显示参考线」两个独立开关，复用 `.home-setting-row` 与 `.rea-toggle` 样式；每个开关 MUST 有可见的无障碍名称与键盘焦点，并说明切换只影响显示与交互、参考线数据始终保留。

#### Scenario: 分别切换

- **WHEN** 在设置页关闭「显示参考线」并保持「显示标尺」开启后进入编辑器
- **THEN** 标尺可见但参考线不可见，已有参考线数据仍然存在

#### Scenario: 键盘可达

- **WHEN** 用 Tab 聚焦「显示标尺」复选框并按空格
- **THEN** 只有该开关状态切换，焦点样式清晰可见

### Requirement: 编辑器独立的「视图」菜单

编辑器顶栏 SHALL 提供一个**独立的「视图」下拉菜单按钮**，不与主菜单混排、不并入主菜单分组；其中 MUST 包含「添加垂直参考线」「添加水平参考线」「显示标尺」「显示参考线」四个命令，以及「清除当前页面参考线」。添加项 MUST 使用当前视口中心定位，且不依赖标尺是否开启。勾选项 MUST 使用 `role="menuitemcheckbox"` 与 `aria-checked` 表达状态，勾选图标使用 `className="size-3 text-[var(--rea-accent)]"` 一类的构建期 Tailwind 类。切换 MUST 立即生效并写入对应偏好。

#### Scenario: 勾选状态

- **WHEN** 标尺可见、参考线隐藏时打开「视图」菜单
- **THEN** 「显示标尺」为 `aria-checked="true"`，「显示参考线」为 `aria-checked="false"`

#### Scenario: 菜单即时切换

- **WHEN** 在「视图」菜单点击「显示标尺」且当前为关闭
- **THEN** 标尺立即出现，参考线可见性不变，再次点击立即隐藏

#### Scenario: 与主菜单分离

- **WHEN** 打开主菜单
- **THEN** 主菜单中没有任何标尺 / 参考线项，这些项只出现在「视图」菜单中

### Requirement: 画布菜单与元素菜单、参考线菜单分离

画布空白处右键 SHALL 显示独立的**画布菜单**（在既有画布命令之后追加「显示标尺」「显示参考线」两个勾选项与「清除当前页面参考线」）；图层 / 元素右键 SHALL 继续使用既有元素菜单，且 MUST NOT 混入任何标尺 / 参考线项；参考线上右键 SHALL 显示独立的**参考线菜单**（「删除此参考线」「显示参考线」「清除当前页面参考线」）。三个菜单 MUST 使用各自的 `ContextMenu` 标签，且清除项在无参考线时 MUST 禁用并给出原因提示。

#### Scenario: 画布空白处右键

- **WHEN** 在画布空白处右键
- **THEN** 出现的是「画布菜单」，含两个勾选项与清除项，不含「编组所选项」「删除」等元素命令

#### Scenario: 元素上右键

- **WHEN** 在一个矩形上右键
- **THEN** 出现的是「元素菜单」，不含「显示标尺」或「显示参考线」

#### Scenario: 参考线上右键

- **WHEN** 在一条参考线的命中带上右键
- **THEN** 出现的是「参考线菜单」，可只删除该条参考线，且不改变图层选区

#### Scenario: 无参考线时禁用清除

- **WHEN** 当前页面没有任何参考线时打开画布菜单
- **THEN** 「清除当前页面参考线」为禁用状态并提示「当前页面没有参考线」

### Requirement: 关闭时的行为

`showRulers` 为 false 时，系统 MUST 隐藏标尺与角块、禁止从标尺拖出参考线；`showGuides` 为 false 时，系统 MUST 隐藏参考线、禁止拖拽与参考线右键、且 MUST NOT 把参考线注入吸附候选。任一开关关闭时参考线数据 MUST 完整保留，重新开启后按原世界坐标恢复。标尺隐藏 MUST NOT 影响参考线的显示、拖动与删除（见 `manual-guides` 的边缘删除热区）。

#### Scenario: 标尺关闭后拖动

- **WHEN** `showRulers` 为 false 时按下标尺原本所在的画布区域并拖动
- **THEN** 行为与普通画布手势一致，不会创建参考线

#### Scenario: 参考线关闭后不吸附

- **WHEN** `showGuides` 为 false 时拖动节点靠近原参考线位置
- **THEN** 不会因参考线产生吸附，仍可按对象吸附

#### Scenario: 重新开启

- **WHEN** 关闭前页面有 x=120、y=64 两条参考线，重新开启「显示参考线」后
- **THEN** 两条参考线在原位置显示，恢复可拖拽与吸附
