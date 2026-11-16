## ADDED Requirements

### Requirement: 间距刻度

`tokens.space.scale` MUST 是至少 1 项的数组，每项 MUST 为有限非负整数（允许 `0`）。校验 MUST NOT 限制项数、顺序，MUST NOT 排序或去重。每档 MUST 派生一个 `--rea-ds-space-<value>` 变量，值为对应的 `px` 长度（`0` 为 `0px`）。同一数值重复出现时 MUST 报错，避免派生同名变量。

#### Scenario: 含零的长刻度通过校验

- **WHEN** `space.scale` 为 `[0,2,3,4,5,6,7,8,9,10,11,12,14,15,16,18,20,22,30]`
- **THEN** `validateSystem()` 不产生 `tokens.space.scale` 的问题
- **AND** 派生变量包含 `--rea-ds-space-0:0px` 与 `--rea-ds-space-30:30px`

#### Scenario: 乱序刻度原样通过

- **WHEN** `space.scale` 为 `[24,8,16]`
- **THEN** 校验不报错，顺序保持 `[24,8,16]`，不被重排

#### Scenario: 空刻度被拒绝

- **WHEN** `space.scale` 为 `[]`
- **THEN** 校验报告 `DS_TOKEN_INVALID`，路径为 `tokens.space.scale`，说明「间距刻度至少需要 1 项。」

#### Scenario: 负数与小数被拒绝

- **WHEN** `space.scale` 为 `[-4,8]` 或 `[4,8.5]`
- **THEN** 校验在对应下标报告 `DS_TOKEN_INVALID`，说明「间距刻度必须是 0 或正整数。」

#### Scenario: 重复刻度被拒绝

- **WHEN** `space.scale` 为 `[4,8,8]`
- **THEN** 校验在第二个 `8` 上报 `DS_TOKEN_INVALID`，说明「间距刻度不能重复。」

#### Scenario: 缺少 unit 时基数取最小非零刻度

- **WHEN** DESIGN.md 的 `spacing` 只有刻度（含 `"0": 0px`）而没有 `unit`
- **THEN** 导入结果的 `space.unit` 为最小非零刻度，而不是 `0`
