import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="datasource" designId="page-root" name="数据源配置">
  <Frame designId="desktop-artboard" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[900px] bg-[var(--rea-ds-color-background)]">
    <Rect designId="sidebar" name="sidebar" className="absolute left-[0px] top-[0px] w-[232px] h-[900px] bg-[var(--rea-ds-color-sidebar)]" />
    <Rect designId="sidebar-divider" name="sidebar-divider" className="absolute left-[231px] top-[0px] w-[1px] h-[900px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="brand-mark" name="brand-mark" className="absolute left-[22px] top-[22px] w-[28px] h-[28px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="brand-letter" name="brand-letter" className="absolute left-[30px] top-[24px] w-[16px] h-[22px] text-[16px] leading-[22px] text-[var(--rea-ds-color-on-primary)] font-bold">P</Text>
    <Text designId="brand-title" name="brand-title" className="absolute left-[60px] top-[19px] w-[145px] h-[28px] text-[20px] leading-[28px] text-[var(--rea-ds-color-text)] font-semibold">PLViews</Text>
    <Text designId="brand-caption" name="brand-caption" className="absolute left-[60px] top-[46px] w-[140px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">PLM 进度视图</Text>
    <Text designId="workspace-label" name="workspace-label" className="absolute left-[22px] top-[92px] w-[150px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)] font-semibold">工作区</Text>
    <Text designId="nav-dashboard" name="nav-dashboard" className="absolute left-[28px] top-[130px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">总览看板</Text>
    <Text designId="nav-project" name="nav-project" className="absolute left-[28px] top-[174px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">单项目进度</Text>
    <Text designId="nav-files" name="nav-files" className="absolute left-[28px] top-[218px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">文件明细</Text>
    <Text designId="nav-template" name="nav-template" className="absolute left-[28px] top-[262px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">流程模板</Text>
    <Rect designId="nav-datasource-active" name="nav-datasource-active" className="absolute left-[12px] top-[299px] w-[208px] h-[38px] bg-[var(--rea-ds-color-selected)] rounded-[var(--rea-ds-radius-md)]" />
    <Rect designId="nav-datasource-mark" name="nav-datasource-mark" className="absolute left-[12px] top-[307px] w-[3px] h-[22px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="nav-datasource" name="nav-datasource" className="absolute left-[28px] top-[306px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-primary)] font-semibold">数据源</Text>
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  数据源</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="ds-page-title" name="ds-page-title" className="absolute left-[264px] top-[91px] w-[600px] h-[42px] text-[28px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">数据源</Text>
    <Text designId="ds-page-sub" name="ds-page-sub" className="absolute left-[264px] top-[137px] w-[650px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">PLM PostgreSQL 只读采集与同步监控</Text>
    <Rect designId="ds-edit-bg" name="ds-edit-bg" className="absolute left-[1275px] top-[96px] w-[133px] h-[36px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="ds-edit-text" name="ds-edit-text" className="absolute left-[1287px] top-[101px] w-[109px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium text-center">编辑连接</Text>
    <Rect designId="ds-status-panel" name="ds-status-panel" className="absolute left-[264px] top-[187px] w-[1144px] h-[124px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Ellipse designId="ds-health-dot" name="ds-health-dot" className="absolute left-[286px] top-[211px] w-[10px] h-[10px] bg-[var(--rea-ds-color-done)] rounded-full" />
    <Text designId="ds-health" name="ds-health" className="absolute left-[306px] top-[201px] w-[520px] h-[29px] text-[17px] leading-[29px] text-[var(--rea-ds-color-text)] font-semibold">鼎捷 PLM · 连接正常</Text>
    <Text designId="ds-health-sub" name="ds-health-sub" className="absolute left-[286px] top-[243px] w-[765px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">只读副本  ·  最近健康检查 09:45  ·  增量采集每 10 分钟</Text>
    <Text designId="ds-last-sync" name="ds-last-sync" className="absolute left-[1110px] top-[211px] w-[270px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-done)] font-medium">最近成功同步 09:42</Text>
    <Text designId="ds-tab-connection" name="ds-tab-connection" className="absolute left-[264px] top-[348px] w-[150px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-primary)] font-semibold">连接与采集</Text>
    <Text designId="ds-tab-mapping" name="ds-tab-mapping" className="absolute left-[437px] top-[348px] w-[120px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">字段映射</Text>
    <Text designId="ds-tab-library" name="ds-tab-library" className="absolute left-[577px] top-[348px] w-[150px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">库路径规则</Text>
    <Text designId="ds-tab-log" name="ds-tab-log" className="absolute left-[742px] top-[348px] w-[120px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">同步日志</Text>
    <Rect designId="ds-tab-line" name="ds-tab-line" className="absolute left-[264px] top-[380px] w-[88px] h-[3px] bg-[var(--rea-ds-color-primary)]" />
    <Rect designId="ds-tabs-rule" name="ds-tabs-rule" className="absolute left-[264px] top-[384px] w-[1144px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="ds-section-title" name="ds-section-title" className="absolute left-[264px] top-[420px] w-[400px] h-[30px] text-[19px] leading-[30px] text-[var(--rea-ds-color-text)] font-semibold">采集配置</Text>
    <Rect designId="ds-config-panel" name="ds-config-panel" className="absolute left-[264px] top-[465px] w-[705px] h-[236px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="ds-config-host-label" name="ds-config-host-label" className="absolute left-[286px] top-[489px] w-[150px] h-[20px] text-[12px] leading-[20px] text-[var(--rea-ds-color-muted)]">数据库地址</Text>
    <Text designId="ds-config-host" name="ds-config-host" className="absolute left-[286px] top-[516px] w-[420px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-text)] font-medium">plm-readonly.internal:5432</Text>
    <Text designId="ds-config-user-label" name="ds-config-user-label" className="absolute left-[286px] top-[564px] w-[150px] h-[20px] text-[12px] leading-[20px] text-[var(--rea-ds-color-muted)]">连接用户</Text>
    <Text designId="ds-config-user" name="ds-config-user" className="absolute left-[286px] top-[590px] w-[340px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-text)] font-medium">plviews_reader</Text>
    <Text designId="ds-config-policy" name="ds-config-policy" className="absolute left-[286px] top-[655px] w-[370px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">全量兜底  每日 03:00</Text>
    <Rect designId="ds-actions-panel" name="ds-actions-panel" className="absolute left-[989px] top-[465px] w-[419px] h-[236px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="ds-actions-title" name="ds-actions-title" className="absolute left-[1011px] top-[488px] w-[320px] h-[26px] text-[16px] leading-[26px] text-[var(--rea-ds-color-text)] font-semibold">同步操作</Text>
    <Text designId="ds-actions-copy" name="ds-actions-copy" className="absolute left-[1011px] top-[529px] w-[360px] h-[48px] text-[13px] leading-[48px] text-[var(--rea-ds-color-muted)]">手动同步与定时任务使用同一把数据源锁。</Text>
    <Text designId="ds-actions-watermark" name="ds-actions-watermark" className="absolute left-[1011px] top-[590px] w-[350px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">当前水位  2026-11-10 09:42</Text>
    <Rect designId="ds-run-bg" name="ds-run-bg" className="absolute left-[1011px] top-[640px] w-[185px] h-[36px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="ds-run-text" name="ds-run-text" className="absolute left-[1023px] top-[645px] w-[161px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-on-primary)] font-medium text-center">运行增量同步</Text>
    <Text designId="ds-log-title" name="ds-log-title" className="absolute left-[264px] top-[740px] w-[350px] h-[28px] text-[19px] leading-[28px] text-[var(--rea-ds-color-text)] font-semibold">最近批次</Text>
    <Text designId="ds-log-1" name="ds-log-1" className="absolute left-[264px] top-[785px] w-[900px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">09:42  增量采集成功   ·   126 条归一化文件   ·   18 个项目更新</Text>
    <Text designId="ds-log-2" name="ds-log-2" className="absolute left-[264px] top-[819px] w-[900px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">09:32  增量采集成功   ·   84 条归一化文件   ·   7 个项目更新</Text>
  </Frame>
</Page>
);
