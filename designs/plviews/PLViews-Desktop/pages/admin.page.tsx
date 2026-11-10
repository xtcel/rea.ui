import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="admin" designId="page-root" name="组织与权限">
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
    <Text designId="nav-datasource" name="nav-datasource" className="absolute left-[28px] top-[306px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-text)]">数据源</Text>
    <Rect designId="nav-admin-active" name="nav-admin-active" className="absolute left-[12px] top-[343px] w-[208px] h-[38px] bg-[var(--rea-ds-color-selected)] rounded-[var(--rea-ds-radius-md)]" />
    <Rect designId="nav-admin-mark" name="nav-admin-mark" className="absolute left-[12px] top-[351px] w-[3px] h-[22px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="nav-admin" name="nav-admin" className="absolute left-[28px] top-[350px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-primary)] font-semibold">组织与权限</Text>
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  组织与权限</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="admin-title" name="admin-title" className="absolute left-[264px] top-[91px] w-[650px] h-[42px] text-[28px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">组织与权限</Text>
    <Text designId="admin-sub" name="admin-sub" className="absolute left-[264px] top-[137px] w-[680px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">管理本地账号、角色与项目可见范围</Text>
    <Rect designId="admin-add-bg" name="admin-add-bg" className="absolute left-[1286px] top-[96px] w-[122px] h-[36px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="admin-add-text" name="admin-add-text" className="absolute left-[1298px] top-[101px] w-[98px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-on-primary)] font-medium text-center">添加用户</Text>
    <Text designId="admin-tab-users" name="admin-tab-users" className="absolute left-[264px] top-[189px] w-[70px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-primary)] font-semibold">用户</Text>
    <Text designId="admin-tab-access" name="admin-tab-access" className="absolute left-[366px] top-[189px] w-[120px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">项目权限</Text>
    <Text designId="admin-tab-audit" name="admin-tab-audit" className="absolute left-[513px] top-[189px] w-[120px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">审计日志</Text>
    <Rect designId="admin-tab-line" name="admin-tab-line" className="absolute left-[264px] top-[219px] w-[29px] h-[3px] bg-[var(--rea-ds-color-primary)]" />
    <Rect designId="admin-tabs-rule" name="admin-tabs-rule" className="absolute left-[264px] top-[223px] w-[1144px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="admin-search" name="admin-search" className="absolute left-[264px] top-[252px] w-[310px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="admin-search-text" name="admin-search-text" className="absolute left-[279px] top-[259px] w-[265px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索姓名或账号</Text>
    <Text designId="admin-count" name="admin-count" className="absolute left-[1275px] top-[260px] w-[130px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-muted)] text-right">共 24 位用户</Text>
    <Rect designId="admin-table" name="admin-table" className="absolute left-[264px] top-[320px] w-[1144px] h-[409px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Rect designId="admin-th-bg" name="admin-th-bg" className="absolute left-[265px] top-[321px] w-[1142px] h-[42px] bg-[var(--rea-ds-color-subtle)]" />
    <Text designId="admin-th-user" name="admin-th-user" className="absolute left-[285px] top-[329px] w-[260px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">用户</Text>
    <Text designId="admin-th-role" name="admin-th-role" className="absolute left-[644px] top-[329px] w-[160px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">角色</Text>
    <Text designId="admin-th-scope" name="admin-th-scope" className="absolute left-[885px] top-[329px] w-[220px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">项目范围</Text>
    <Text designId="admin-th-state" name="admin-th-state" className="absolute left-[1214px] top-[329px] w-[150px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">账号状态</Text>
    <Text designId="admin-user-0" name="admin-user-0" className="absolute left-[285px] top-[383px] w-[240px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">陈晓</Text>
    <Text designId="admin-account-0" name="admin-account-0" className="absolute left-[285px] top-[403px] w-[240px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">chen.xiao</Text>
    <Text designId="admin-role-0" name="admin-role-0" className="absolute left-[644px] top-[389px] w-[180px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">管理员</Text>
    <Text designId="admin-scope-0" name="admin-scope-0" className="absolute left-[885px] top-[389px] w-[290px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">所有项目</Text>
    <Text designId="admin-state-0" name="admin-state-0" className="absolute left-[1214px] top-[389px] w-[125px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-done)] font-medium">启用</Text>
    <Rect designId="admin-line-1" name="admin-line-1" className="absolute left-[285px] top-[441px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="admin-user-1" name="admin-user-1" className="absolute left-[285px] top-[451px] w-[240px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">林宇</Text>
    <Text designId="admin-account-1" name="admin-account-1" className="absolute left-[285px] top-[471px] w-[240px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">lin.yu</Text>
    <Text designId="admin-role-1" name="admin-role-1" className="absolute left-[644px] top-[457px] w-[180px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">项目经理</Text>
    <Text designId="admin-scope-1" name="admin-scope-1" className="absolute left-[885px] top-[457px] w-[290px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">负责项目 · 6</Text>
    <Text designId="admin-state-1" name="admin-state-1" className="absolute left-[1214px] top-[457px] w-[125px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-done)] font-medium">启用</Text>
    <Rect designId="admin-line-2" name="admin-line-2" className="absolute left-[285px] top-[509px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="admin-user-2" name="admin-user-2" className="absolute left-[285px] top-[519px] w-[240px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">周敏</Text>
    <Text designId="admin-account-2" name="admin-account-2" className="absolute left-[285px] top-[539px] w-[240px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">zhou.min</Text>
    <Text designId="admin-role-2" name="admin-role-2" className="absolute left-[644px] top-[525px] w-[180px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">部门查看者</Text>
    <Text designId="admin-scope-2" name="admin-scope-2" className="absolute left-[885px] top-[525px] w-[290px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">结构专业 · 12</Text>
    <Text designId="admin-state-2" name="admin-state-2" className="absolute left-[1214px] top-[525px] w-[125px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-done)] font-medium">启用</Text>
    <Rect designId="admin-line-3" name="admin-line-3" className="absolute left-[285px] top-[577px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="admin-user-3" name="admin-user-3" className="absolute left-[285px] top-[587px] w-[240px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">吴杰</Text>
    <Text designId="admin-account-3" name="admin-account-3" className="absolute left-[285px] top-[607px] w-[240px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">wu.jie</Text>
    <Text designId="admin-role-3" name="admin-role-3" className="absolute left-[644px] top-[593px] w-[180px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">部门查看者</Text>
    <Text designId="admin-scope-3" name="admin-scope-3" className="absolute left-[885px] top-[593px] w-[290px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">电气专业 · 8</Text>
    <Text designId="admin-state-3" name="admin-state-3" className="absolute left-[1214px] top-[593px] w-[125px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-done)] font-medium">启用</Text>
    <Rect designId="admin-line-4" name="admin-line-4" className="absolute left-[285px] top-[645px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="admin-user-4" name="admin-user-4" className="absolute left-[285px] top-[655px] w-[240px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">何涛</Text>
    <Text designId="admin-account-4" name="admin-account-4" className="absolute left-[285px] top-[675px] w-[240px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">he.tao</Text>
    <Text designId="admin-role-4" name="admin-role-4" className="absolute left-[644px] top-[661px] w-[180px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">只读访客</Text>
    <Text designId="admin-scope-4" name="admin-scope-4" className="absolute left-[885px] top-[661px] w-[290px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">指定项目 · 3</Text>
    <Text designId="admin-state-4" name="admin-state-4" className="absolute left-[1214px] top-[661px] w-[125px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">停用</Text>
    <Text designId="admin-note" name="admin-note" className="absolute left-[264px] top-[770px] w-[950px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">PLM 连接凭据仅管理员可见；项目经理仅访问获授权的项目。</Text>
  </Frame>
</Page>
);
