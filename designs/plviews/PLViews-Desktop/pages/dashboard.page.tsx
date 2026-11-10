import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="dashboard" designId="page-root" name="项目总览看板">
  <Frame designId="desktop-artboard" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[900px] bg-[var(--rea-ds-color-background)]">
    <Rect designId="sidebar" name="sidebar" className="absolute left-[0px] top-[0px] w-[232px] h-[900px] bg-[var(--rea-ds-color-sidebar)]" />
    <Rect designId="sidebar-divider" name="sidebar-divider" className="absolute left-[231px] top-[0px] w-[1px] h-[900px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="brand-mark" name="brand-mark" className="absolute left-[22px] top-[22px] w-[28px] h-[28px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="brand-letter" name="brand-letter" className="absolute left-[30px] top-[24px] w-[16px] h-[22px] text-[16px] leading-[22px] text-[var(--rea-ds-color-on-primary)] font-bold">P</Text>
    <Text designId="brand-title" name="brand-title" className="absolute left-[60px] top-[19px] w-[145px] h-[28px] text-[20px] leading-[28px] text-[var(--rea-ds-color-text)] font-semibold">PLViews</Text>
    <Text designId="brand-caption" name="brand-caption" className="absolute left-[60px] top-[46px] w-[140px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">PLM 进度视图</Text>
    <Text designId="workspace-label" name="workspace-label" className="absolute left-[22px] top-[92px] w-[150px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)] font-semibold">工作区</Text>
    <Rect designId="nav-dashboard-active" name="nav-dashboard-active" className="absolute left-[12px] top-[123px] w-[208px] h-[38px] bg-[var(--rea-ds-color-selected)] rounded-[var(--rea-ds-radius-md)]" />
    <Rect designId="nav-dashboard-mark" name="nav-dashboard-mark" className="absolute left-[12px] top-[131px] w-[3px] h-[22px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="nav-dashboard" name="nav-dashboard" className="absolute left-[28px] top-[130px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-primary)] font-semibold">总览看板</Text>
    <Text designId="nav-project" name="nav-project" className="absolute left-[28px] top-[174px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">单项目进度</Text>
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  项目总览</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="page-title" name="page-title" className="absolute left-[264px] top-[91px] w-[480px] h-[42px] text-[28px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">项目总览</Text>
    <Text designId="page-subtitle" name="page-subtitle" className="absolute left-[264px] top-[137px] w-[470px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">从项目卡点进入判定依据</Text>
    <Rect designId="export-bg" name="export-bg" className="absolute left-[1260px] top-[96px] w-[136px] h-[36px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="export-text" name="export-text" className="absolute left-[1272px] top-[101px] w-[112px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium text-center">导出视图</Text>
    <Rect designId="summary-panel" name="summary-panel" className="absolute left-[264px] top-[186px] w-[1144px] h-[110px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="metric-0-number" name="metric-0-number" className="absolute left-[292px] top-[207px] w-[150px] h-[42px] text-[30px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">18</Text>
    <Text designId="metric-0-label" name="metric-0-label" className="absolute left-[292px] top-[254px] w-[160px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">在管项目</Text>
    <Text designId="metric-1-number" name="metric-1-number" className="absolute left-[566px] top-[207px] w-[150px] h-[42px] text-[30px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">9</Text>
    <Text designId="metric-1-label" name="metric-1-label" className="absolute left-[566px] top-[254px] w-[160px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">正常推进</Text>
    <Text designId="metric-2-number" name="metric-2-number" className="absolute left-[840px] top-[207px] w-[150px] h-[42px] text-[30px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">5</Text>
    <Text designId="metric-2-label" name="metric-2-label" className="absolute left-[840px] top-[254px] w-[160px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">需要关注</Text>
    <Text designId="metric-3-number" name="metric-3-number" className="absolute left-[1114px] top-[207px] w-[150px] h-[42px] text-[30px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">4</Text>
    <Text designId="metric-3-label" name="metric-3-label" className="absolute left-[1114px] top-[254px] w-[160px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">待确认项目</Text>
    <Rect designId="filter-search" name="filter-search" className="absolute left-[264px] top-[326px] w-[300px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="filter-search-text" name="filter-search-text" className="absolute left-[280px] top-[333px] w-[250px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-muted)]">搜索项目名称或编号</Text>
    <Rect designId="filter-status" name="filter-status" className="absolute left-[580px] top-[326px] w-[134px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="filter-status-text" name="filter-status-text" className="absolute left-[594px] top-[333px] w-[110px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)]">全部状态  ⌄</Text>
    <Text designId="table-count" name="table-count" className="absolute left-[1282px] top-[333px] w-[125px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-muted)] text-right">共 18 个项目</Text>
    <Rect designId="table" name="table" className="absolute left-[264px] top-[390px] w-[1144px] h-[426px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Rect designId="table-header" name="table-header" className="absolute left-[265px] top-[391px] w-[1142px] h-[42px] bg-[var(--rea-ds-color-subtle)]" />
    <Text designId="th-name" name="th-name" className="absolute left-[286px] top-[399px] w-[285px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">项目 / 编号</Text>
    <Text designId="th-progress" name="th-progress" className="absolute left-[654px] top-[399px] w-[148px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">节点进度</Text>
    <Text designId="th-completeness" name="th-completeness" className="absolute left-[822px] top-[399px] w-[88px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">齐套率</Text>
    <Text designId="th-blocker" name="th-blocker" className="absolute left-[935px] top-[399px] w-[180px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">当前卡点</Text>
    <Text designId="th-exception" name="th-exception" className="absolute left-[1165px] top-[399px] w-[190px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">异常 / 数据不足</Text>
    <Text designId="row-0-name" name="row-0-name" className="absolute left-[286px] top-[445px] w-[350px] h-[23px] text-[14px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">PX-2412 高温反应系统</Text>
    <Text designId="row-0-progress" name="row-0-progress" className="absolute left-[654px] top-[451px] w-[140px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-semibold">8 / 13</Text>
    <Text designId="row-0-rate" name="row-0-rate" className="absolute left-[822px] top-[451px] w-[84px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">74%</Text>
    <Text designId="row-0-block" name="row-0-block" className="absolute left-[935px] top-[451px] w-[202px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">T28 跨专业交底</Text>
    <Text designId="row-0-exceptions" name="row-0-exceptions" className="absolute left-[1190px] top-[451px] w-[126px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-missing)] font-medium">1 / 2</Text>
    <Rect designId="row-line-1" name="row-line-1" className="absolute left-[281px] top-[509px] w-[1110px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="row-1-name" name="row-1-name" className="absolute left-[286px] top-[518px] w-[350px] h-[23px] text-[14px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">PX-2407 智能配料产线</Text>
    <Text designId="row-1-progress" name="row-1-progress" className="absolute left-[654px] top-[524px] w-[140px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-semibold">5 / 12</Text>
    <Text designId="row-1-rate" name="row-1-rate" className="absolute left-[822px] top-[524px] w-[84px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">61%</Text>
    <Text designId="row-1-block" name="row-1-block" className="absolute left-[935px] top-[524px] w-[202px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">T23 结构 BOM</Text>
    <Text designId="row-1-exceptions" name="row-1-exceptions" className="absolute left-[1190px] top-[524px] w-[126px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">2 / 3</Text>
    <Rect designId="row-line-2" name="row-line-2" className="absolute left-[281px] top-[582px] w-[1110px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="row-2-name" name="row-2-name" className="absolute left-[286px] top-[591px] w-[350px] h-[23px] text-[14px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">PX-2405 热交换机组</Text>
    <Text designId="row-2-progress" name="row-2-progress" className="absolute left-[654px] top-[597px] w-[140px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-semibold">10 / 13</Text>
    <Text designId="row-2-rate" name="row-2-rate" className="absolute left-[822px] top-[597px] w-[84px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">85%</Text>
    <Text designId="row-2-block" name="row-2-block" className="absolute left-[935px] top-[597px] w-[202px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">T29 技术条件</Text>
    <Text designId="row-2-exceptions" name="row-2-exceptions" className="absolute left-[1190px] top-[597px] w-[126px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-ready)] font-medium">0 / 2</Text>
    <Rect designId="row-line-3" name="row-line-3" className="absolute left-[281px] top-[655px] w-[1110px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="row-3-name" name="row-3-name" className="absolute left-[286px] top-[664px] w-[350px] h-[23px] text-[14px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">PX-2402 精馏控制系统</Text>
    <Text designId="row-3-progress" name="row-3-progress" className="absolute left-[654px] top-[670px] w-[140px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-semibold">11 / 14</Text>
    <Text designId="row-3-rate" name="row-3-rate" className="absolute left-[822px] top-[670px] w-[84px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">93%</Text>
    <Text designId="row-3-block" name="row-3-block" className="absolute left-[935px] top-[670px] w-[202px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">T30 采购下单</Text>
    <Text designId="row-3-exceptions" name="row-3-exceptions" className="absolute left-[1190px] top-[670px] w-[126px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-done)] font-medium">0 / 1</Text>
  </Frame>
</Page>
);
