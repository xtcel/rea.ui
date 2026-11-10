import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="project-discovery" designId="page-root" name="项目发现与绑定">
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  项目总览 / 待确认项目</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="discover-title" name="discover-title" className="absolute left-[264px] top-[91px] w-[600px] h-[42px] text-[28px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">待确认项目</Text>
    <Text designId="discover-sub" name="discover-sub" className="absolute left-[264px] top-[137px] w-[700px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">从 PLM 新发现的项目，确认后绑定进度模板。</Text>
    <Text designId="discover-count" name="discover-count" className="absolute left-[1270px] top-[106px] w-[138px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-warning)] font-medium text-right">4 个待确认</Text>
    <Rect designId="discover-search" name="discover-search" className="absolute left-[264px] top-[190px] w-[308px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="discover-search-hint" name="discover-search-hint" className="absolute left-[280px] top-[197px] w-[275px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目编码或名称</Text>
    <Rect designId="discover-table" name="discover-table" className="absolute left-[264px] top-[258px] w-[1144px] h-[468px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Rect designId="discover-table-head" name="discover-table-head" className="absolute left-[265px] top-[259px] w-[1142px] h-[42px] bg-[var(--rea-ds-color-subtle)]" />
    <Text designId="discover-th-1" name="discover-th-1" className="absolute left-[285px] top-[267px] w-[350px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">项目 / 编码</Text>
    <Text designId="discover-th-2" name="discover-th-2" className="absolute left-[700px] top-[267px] w-[170px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">发现来源</Text>
    <Text designId="discover-th-3" name="discover-th-3" className="absolute left-[910px] top-[267px] w-[150px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">候选文件</Text>
    <Text designId="discover-th-4" name="discover-th-4" className="absolute left-[1174px] top-[267px] w-[200px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">处理</Text>
    <Text designId="discover-0-name" name="discover-0-name" className="absolute left-[285px] top-[321px] w-[345px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">精密混配装置</Text>
    <Text designId="discover-0-code" name="discover-0-code" className="absolute left-[285px] top-[347px] w-[345px] h-[21px] text-[12px] leading-[21px] text-[var(--rea-ds-color-muted)]">PX-2416</Text>
    <Text designId="discover-0-source" name="discover-0-source" className="absolute left-[700px] top-[333px] w-[200px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">产品库 · 项目对象</Text>
    <Text designId="discover-0-files" name="discover-0-files" className="absolute left-[910px] top-[333px] w-[140px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">18 份</Text>
    <Text designId="discover-0-action" name="discover-0-action" className="absolute left-[1174px] top-[333px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-primary)] font-medium">确认并绑定  →</Text>
    <Rect designId="discover-row-line-1" name="discover-row-line-1" className="absolute left-[285px] top-[398px] w-[1098px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="discover-1-name" name="discover-1-name" className="absolute left-[285px] top-[413px] w-[345px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">低温反应机组</Text>
    <Text designId="discover-1-code" name="discover-1-code" className="absolute left-[285px] top-[439px] w-[345px] h-[21px] text-[12px] leading-[21px] text-[var(--rea-ds-color-muted)]">PX-2415</Text>
    <Text designId="discover-1-source" name="discover-1-source" className="absolute left-[700px] top-[425px] w-[200px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">产品库 · 项目对象</Text>
    <Text designId="discover-1-files" name="discover-1-files" className="absolute left-[910px] top-[425px] w-[140px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">23 份</Text>
    <Text designId="discover-1-action" name="discover-1-action" className="absolute left-[1174px] top-[425px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-primary)] font-medium">确认并绑定  →</Text>
    <Rect designId="discover-row-line-2" name="discover-row-line-2" className="absolute left-[285px] top-[490px] w-[1098px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="discover-2-name" name="discover-2-name" className="absolute left-[285px] top-[505px] w-[345px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">分散控制系统</Text>
    <Text designId="discover-2-code" name="discover-2-code" className="absolute left-[285px] top-[531px] w-[345px] h-[21px] text-[12px] leading-[21px] text-[var(--rea-ds-color-muted)]">PX-2414</Text>
    <Text designId="discover-2-source" name="discover-2-source" className="absolute left-[700px] top-[517px] w-[200px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">产品库 · 项目对象</Text>
    <Text designId="discover-2-files" name="discover-2-files" className="absolute left-[910px] top-[517px] w-[140px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">11 份</Text>
    <Text designId="discover-2-action" name="discover-2-action" className="absolute left-[1174px] top-[517px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-primary)] font-medium">确认并绑定  →</Text>
    <Rect designId="discover-row-line-3" name="discover-row-line-3" className="absolute left-[285px] top-[582px] w-[1098px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="discover-3-name" name="discover-3-name" className="absolute left-[285px] top-[597px] w-[345px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">模块化泵站</Text>
    <Text designId="discover-3-code" name="discover-3-code" className="absolute left-[285px] top-[623px] w-[345px] h-[21px] text-[12px] leading-[21px] text-[var(--rea-ds-color-muted)]">PX-2413</Text>
    <Text designId="discover-3-source" name="discover-3-source" className="absolute left-[700px] top-[609px] w-[200px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">产品库 · 项目对象</Text>
    <Text designId="discover-3-files" name="discover-3-files" className="absolute left-[910px] top-[609px] w-[140px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">15 份</Text>
    <Text designId="discover-3-action" name="discover-3-action" className="absolute left-[1174px] top-[609px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-primary)] font-medium">确认并绑定  →</Text>
    <Rect designId="discover-footer-line" name="discover-footer-line" className="absolute left-[264px] top-[763px] w-[1144px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="discover-footer" name="discover-footer" className="absolute left-[264px] top-[782px] w-[1110px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">确认项目后生成节点实例；模板新版本不会自动改变已有项目。</Text>
  </Frame>
</Page>
);
