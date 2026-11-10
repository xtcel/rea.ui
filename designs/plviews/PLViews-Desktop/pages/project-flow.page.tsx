import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="project-flow" designId="page-root" name="项目流程图">
  <Frame designId="desktop-artboard" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[900px] bg-[var(--rea-ds-color-background)]">
    <Rect designId="sidebar" name="sidebar" className="absolute left-[0px] top-[0px] w-[232px] h-[900px] bg-[var(--rea-ds-color-sidebar)]" />
    <Rect designId="sidebar-divider" name="sidebar-divider" className="absolute left-[231px] top-[0px] w-[1px] h-[900px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="brand-mark" name="brand-mark" className="absolute left-[22px] top-[22px] w-[28px] h-[28px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="brand-letter" name="brand-letter" className="absolute left-[30px] top-[24px] w-[16px] h-[22px] text-[16px] leading-[22px] text-[var(--rea-ds-color-on-primary)] font-bold">P</Text>
    <Text designId="brand-title" name="brand-title" className="absolute left-[60px] top-[19px] w-[145px] h-[28px] text-[20px] leading-[28px] text-[var(--rea-ds-color-text)] font-semibold">PLViews</Text>
    <Text designId="brand-caption" name="brand-caption" className="absolute left-[60px] top-[46px] w-[140px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">PLM 进度视图</Text>
    <Text designId="workspace-label" name="workspace-label" className="absolute left-[22px] top-[92px] w-[150px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)] font-semibold">工作区</Text>
    <Text designId="nav-dashboard" name="nav-dashboard" className="absolute left-[28px] top-[130px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">总览看板</Text>
    <Rect designId="nav-project-active" name="nav-project-active" className="absolute left-[12px] top-[167px] w-[208px] h-[38px] bg-[var(--rea-ds-color-selected)] rounded-[var(--rea-ds-radius-md)]" />
    <Rect designId="nav-project-mark" name="nav-project-mark" className="absolute left-[12px] top-[175px] w-[3px] h-[22px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="nav-project" name="nav-project" className="absolute left-[28px] top-[174px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-primary)] font-semibold">单项目进度</Text>
    <Text designId="nav-files" name="nav-files" className="absolute left-[28px] top-[218px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">文件明细</Text>
    <Text designId="nav-template" name="nav-template" className="absolute left-[28px] top-[262px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">流程模板</Text>
    <Text designId="nav-datasource" name="nav-datasource" className="absolute left-[28px] top-[306px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">数据源</Text>
    <Text designId="nav-admin" name="nav-admin" className="absolute left-[28px] top-[350px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">组织与权限</Text>
    <Text designId="future-label" name="future-label" className="absolute left-[22px] top-[412px] w-[150px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)] font-semibold">规划中</Text>
    <Text designId="future-task" name="future-task" className="absolute left-[28px] top-[446px] w-[180px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">任务   ·   即将上线</Text>
    <Text designId="future-gantt" name="future-gantt" className="absolute left-[28px] top-[488px] w-[180px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">甘特图   ·   即将上线</Text>
    <Rect designId="sidebar-footer-line" name="sidebar-footer-line" className="absolute left-[18px] top-[830px] w-[196px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Ellipse designId="user-avatar" name="user-avatar" className="absolute left-[22px] top-[848px] w-[30px] h-[30px] bg-[var(--rea-ds-color-primary)] rounded-full" />
    <Text designId="user-avatar-letter" name="user-avatar-letter" className="absolute left-[30px] top-[852px] w-[16px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-on-primary)] font-medium">林</Text>
    <Text designId="user-name" name="user-name" className="absolute left-[62px] top-[846px] w-[135px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">林项目经理</Text>
    <Text designId="user-role" name="user-role" className="absolute left-[62px] top-[868px] w-[135px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">项目经理</Text>
    <Rect designId="topbar" name="topbar" className="absolute left-[232px] top-[0px] w-[1208px] h-[64px] bg-[var(--rea-ds-color-header)]" />
    <Rect designId="topbar-line" name="topbar-line" className="absolute left-[232px] top-[63px] w-[1208px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  项目 / PX-2412 / 流程图</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="flow-title" name="flow-title" className="absolute left-[264px] top-[87px] w-[650px] h-[42px] text-[27px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">PX-2412 · 流程图</Text>
    <Text designId="flow-subtitle" name="flow-subtitle" className="absolute left-[264px] top-[132px] w-[830px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">只读视图 · 三专业并行 → 版本汇总 → T28 齐套点 → 采购</Text>
    <Text designId="flow-tab-flow" name="flow-tab-flow" className="absolute left-[382px] top-[183px] w-[84px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-primary)] font-semibold">流程图</Text>
    <Rect designId="flow-tab-line" name="flow-tab-line" className="absolute left-[382px] top-[213px] w-[57px] h-[3px] bg-[var(--rea-ds-color-primary)]" />
    <Rect designId="flow-tabs-rule" name="flow-tabs-rule" className="absolute left-[264px] top-[218px] w-[1144px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="flow-canvas" name="flow-canvas" className="absolute left-[264px] top-[244px] w-[817px] h-[584px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="flow-lane-process" name="flow-lane-process" className="absolute left-[284px] top-[278px] w-[90px] h-[20px] text-[12px] leading-[20px] text-[var(--rea-ds-color-muted)] font-semibold">工艺</Text>
    <Text designId="flow-lane-structure" name="flow-lane-structure" className="absolute left-[284px] top-[431px] w-[90px] h-[20px] text-[12px] leading-[20px] text-[var(--rea-ds-color-muted)] font-semibold">结构</Text>
    <Text designId="flow-lane-electrical" name="flow-lane-electrical" className="absolute left-[284px] top-[584px] w-[90px] h-[20px] text-[12px] leading-[20px] text-[var(--rea-ds-color-muted)] font-semibold">电气</Text>
    <Rect designId="flow-lane-line-1" name="flow-lane-line-1" className="absolute left-[284px] top-[405px] w-[775px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="flow-lane-line-2" name="flow-lane-line-2" className="absolute left-[284px] top-[558px] w-[775px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="edge-0" name="edge-0" className="absolute left-[536px] top-[340px] w-[372px] h-[2px] bg-[var(--rea-ds-color-line)]" />
    <Rect designId="edge-1" name="edge-1" className="absolute left-[536px] top-[493px] w-[372px] h-[2px] bg-[var(--rea-ds-color-line)]" />
    <Rect designId="edge-2" name="edge-2" className="absolute left-[536px] top-[646px] w-[372px] h-[2px] bg-[var(--rea-ds-color-line)]" />
    <Rect designId="flow-node-0" name="flow-node-0" className="absolute left-[386px] top-[316px] w-[150px] h-[50px] bg-[var(--rea-ds-color-done-bg)] border border-[var(--rea-ds-color-done)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-0-text" name="flow-node-0-text" className="absolute left-[395px] top-[328px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">T19–20 工艺评审 · 已完成</Text>
    <Rect designId="flow-node-1" name="flow-node-1" className="absolute left-[565px] top-[316px] w-[150px] h-[50px] bg-[var(--rea-ds-color-done-bg)] border border-[var(--rea-ds-color-done)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-1-text" name="flow-node-1-text" className="absolute left-[574px] top-[328px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">T21 设计包 A · 已完成</Text>
    <Rect designId="flow-node-2" name="flow-node-2" className="absolute left-[744px] top-[316px] w-[150px] h-[50px] bg-[var(--rea-ds-color-missing-bg)] border border-[var(--rea-ds-color-missing)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-2-text" name="flow-node-2-text" className="absolute left-[753px] top-[328px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-missing)] font-medium">T25 设计包 B · 文件不齐</Text>
    <Rect designId="flow-node-3" name="flow-node-3" className="absolute left-[386px] top-[469px] w-[150px] h-[50px] bg-[var(--rea-ds-color-done-bg)] border border-[var(--rea-ds-color-done)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-3-text" name="flow-node-3-text" className="absolute left-[395px] top-[481px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">T22 模型建立 · 已完成</Text>
    <Rect designId="flow-node-4" name="flow-node-4" className="absolute left-[565px] top-[469px] w-[150px] h-[50px] bg-[var(--rea-ds-color-done-bg)] border border-[var(--rea-ds-color-done)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-4-text" name="flow-node-4-text" className="absolute left-[574px] top-[481px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">T22 联合评审 · 已完成</Text>
    <Rect designId="flow-node-5" name="flow-node-5" className="absolute left-[744px] top-[469px] w-[150px] h-[50px] bg-[var(--rea-ds-color-ready-bg)] border border-[var(--rea-ds-color-ready)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-5-text" name="flow-node-5-text" className="absolute left-[753px] top-[481px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-ready)] font-medium">T23–24 结构图 · 已齐套</Text>
    <Rect designId="flow-node-6" name="flow-node-6" className="absolute left-[386px] top-[622px] w-[150px] h-[50px] bg-[var(--rea-ds-color-done-bg)] border border-[var(--rea-ds-color-done)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-6-text" name="flow-node-6-text" className="absolute left-[395px] top-[634px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">T26 电气设计 · 已完成</Text>
    <Rect designId="flow-node-7" name="flow-node-7" className="absolute left-[565px] top-[622px] w-[150px] h-[50px] bg-[var(--rea-ds-color-waiting-bg)] border border-[var(--rea-ds-color-waiting)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-7-text" name="flow-node-7-text" className="absolute left-[574px] top-[634px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-waiting)] font-medium">T26 PLC/HMI · 待前置</Text>
    <Rect designId="flow-node-8" name="flow-node-8" className="absolute left-[744px] top-[622px] w-[150px] h-[50px] bg-[var(--rea-ds-color-insufficient-bg)] border border-[var(--rea-ds-color-insufficient)] rounded-[var(--rea-ds-radius-md)] border-dashed" />
    <Text designId="flow-node-8-text" name="flow-node-8-text" className="absolute left-[753px] top-[634px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-insufficient)] font-medium">T27 模拟测试 · 数据不足</Text>
    <Rect designId="flow-node-9" name="flow-node-9" className="absolute left-[908px] top-[316px] w-[150px] h-[50px] bg-[var(--rea-ds-color-missing-bg)] border border-[var(--rea-ds-color-missing)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-9-text" name="flow-node-9-text" className="absolute left-[917px] top-[328px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-missing)] font-medium">T20→28 工艺 · 文件不齐</Text>
    <Rect designId="flow-node-10" name="flow-node-10" className="absolute left-[908px] top-[469px] w-[150px] h-[50px] bg-[var(--rea-ds-color-ready-bg)] border border-[var(--rea-ds-color-ready)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="flow-node-10-text" name="flow-node-10-text" className="absolute left-[917px] top-[481px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-ready)] font-medium">T23→28 结构汇总 · 已齐套</Text>
    <Rect designId="flow-node-11" name="flow-node-11" className="absolute left-[908px] top-[622px] w-[150px] h-[50px] bg-[var(--rea-ds-color-insufficient-bg)] border border-[var(--rea-ds-color-insufficient)] rounded-[var(--rea-ds-radius-md)] border-dashed" />
    <Text designId="flow-node-11-text" name="flow-node-11-text" className="absolute left-[917px] top-[634px] w-[134px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-insufficient)] font-medium">T26→29 电气 · 数据不足</Text>
    <Rect designId="flow-right" name="flow-right" className="absolute left-[1097px] top-[244px] w-[311px] h-[584px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="flow-right-title" name="flow-right-title" className="absolute left-[1117px] top-[268px] w-[270px] h-[28px] text-[17px] leading-[28px] text-[var(--rea-ds-color-text)] font-semibold">当前齐套点</Text>
    <Text designId="flow-right-code" name="flow-right-code" className="absolute left-[1117px] top-[307px] w-[275px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">T28 · 设计汇总及跨专业交底</Text>
    <Text designId="flow-right-state" name="flow-right-state" className="absolute left-[1117px] top-[346px] w-[275px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-missing)] font-medium">文件不齐 · 2 / 3 专业已齐套</Text>
    <Rect designId="flow-right-rule" name="flow-right-rule" className="absolute left-[1117px] top-[386px] w-[270px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="flow-right-1" name="flow-right-1" className="absolute left-[1117px] top-[408px] w-[270px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-missing)]">工艺批准版本    缺失</Text>
    <Text designId="flow-right-2" name="flow-right-2" className="absolute left-[1117px] top-[442px] w-[270px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-ready)]">结构批准版本    已齐套</Text>
    <Text designId="flow-right-3" name="flow-right-3" className="absolute left-[1117px] top-[476px] w-[270px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-insufficient)]">电气批准版本    数据不足</Text>
    <Rect designId="flow-right-rule-2" name="flow-right-rule-2" className="absolute left-[1117px] top-[523px] w-[270px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="flow-right-next" name="flow-right-next" className="absolute left-[1117px] top-[546px] w-[250px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)] font-semibold">后续节点</Text>
    <Text designId="flow-right-next-1" name="flow-right-next-1" className="absolute left-[1117px] top-[584px] w-[272px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-waiting)]">T29 采购技术条件交接 · 待前置</Text>
    <Text designId="flow-right-next-2" name="flow-right-next-2" className="absolute left-[1117px] top-[618px] w-[272px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-insufficient)]">T30 采购计划与下单 · 数据不足</Text>
    <Text designId="flow-right-link" name="flow-right-link" className="absolute left-[1117px] top-[771px] w-[260px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-primary)] font-medium">查看 T28 判定依据  →</Text>
  </Frame>
</Page>
);
