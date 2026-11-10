import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="files" designId="page-root" name="文件明细与未归属">
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
    <Rect designId="nav-files-active" name="nav-files-active" className="absolute left-[12px] top-[211px] w-[208px] h-[38px] bg-[var(--rea-ds-color-selected)] rounded-[var(--rea-ds-radius-md)]" />
    <Rect designId="nav-files-mark" name="nav-files-mark" className="absolute left-[12px] top-[219px] w-[3px] h-[22px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="nav-files" name="nav-files" className="absolute left-[28px] top-[218px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-primary)] font-semibold">文件明细</Text>
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  文件明细</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="files-title" name="files-title" className="absolute left-[264px] top-[91px] w-[580px] h-[42px] text-[28px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">文件明细</Text>
    <Text designId="files-sub" name="files-sub" className="absolute left-[264px] top-[137px] w-[580px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">归一化文件与未归属记录</Text>
    <Text designId="files-tab-all" name="files-tab-all" className="absolute left-[264px] top-[190px] w-[104px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-muted)]">全部文件</Text>
    <Text designId="files-tab-unmatched" name="files-tab-unmatched" className="absolute left-[385px] top-[190px] w-[180px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-primary)] font-semibold">未归属文件  12</Text>
    <Rect designId="files-tab-line" name="files-tab-line" className="absolute left-[385px] top-[219px] w-[122px] h-[3px] bg-[var(--rea-ds-color-primary)]" />
    <Rect designId="files-tabs-line" name="files-tabs-line" className="absolute left-[264px] top-[222px] w-[1144px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="files-search" name="files-search" className="absolute left-[264px] top-[251px] w-[330px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="files-search-text" name="files-search-text" className="absolute left-[279px] top-[258px] w-[280px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索文件编码、名称</Text>
    <Rect designId="files-type" name="files-type" className="absolute left-[608px] top-[251px] w-[150px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="files-type-text" name="files-type-text" className="absolute left-[622px] top-[258px] w-[130px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">全部文件类型  ⌄</Text>
    <Rect designId="files-table" name="files-table" className="absolute left-[264px] top-[320px] w-[1144px] h-[490px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Rect designId="files-th-bg" name="files-th-bg" className="absolute left-[265px] top-[321px] w-[1142px] h-[42px] bg-[var(--rea-ds-color-subtle)]" />
    <Text designId="files-th-1" name="files-th-1" className="absolute left-[282px] top-[329px] w-[300px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">文件 / 编码</Text>
    <Text designId="files-th-2" name="files-th-2" className="absolute left-[655px] top-[329px] w-[180px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">类型 / 版本</Text>
    <Text designId="files-th-3" name="files-th-3" className="absolute left-[865px] top-[329px] w-[270px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">PLM 库路径</Text>
    <Text designId="files-th-4" name="files-th-4" className="absolute left-[1190px] top-[329px] w-[160px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">归属问题</Text>
    <Text designId="file-0-name" name="file-0-name" className="absolute left-[282px] top-[379px] w-[340px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">工艺流程图 P&amp;ID</Text>
    <Text designId="file-0-code" name="file-0-code" className="absolute left-[282px] top-[401px] w-[340px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">PID-2407-021</Text>
    <Text designId="file-0-type" name="file-0-type" className="absolute left-[655px] top-[386px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">P&amp;ID · R3</Text>
    <Text designId="file-0-path" name="file-0-path" className="absolute left-[865px] top-[386px] w-[294px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">/07.工艺图文档</Text>
    <Text designId="file-0-reason" name="file-0-reason" className="absolute left-[1190px] top-[386px] w-[170px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">编码未匹配</Text>
    <Rect designId="files-row-line-1" name="files-row-line-1" className="absolute left-[282px] top-[439px] w-[1108px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="file-1-name" name="file-1-name" className="absolute left-[282px] top-[448px] w-[340px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">结构总装三维模型</Text>
    <Text designId="file-1-code" name="file-1-code" className="absolute left-[282px] top-[470px] w-[340px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">ASM-1178-04</Text>
    <Text designId="file-1-type" name="file-1-type" className="absolute left-[655px] top-[455px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">三维模型 · B2</Text>
    <Text designId="file-1-path" name="file-1-path" className="absolute left-[865px] top-[455px] w-[294px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">/05.结构设计</Text>
    <Text designId="file-1-reason" name="file-1-reason" className="absolute left-[1190px] top-[455px] w-[170px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">项目别名缺失</Text>
    <Rect designId="files-row-line-2" name="files-row-line-2" className="absolute left-[282px] top-[508px] w-[1108px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="file-2-name" name="file-2-name" className="absolute left-[282px] top-[517px] w-[340px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">电气 IO 分配表</Text>
    <Text designId="file-2-code" name="file-2-code" className="absolute left-[282px] top-[539px] w-[340px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">EIO-2411-08</Text>
    <Text designId="file-2-type" name="file-2-type" className="absolute left-[655px] top-[524px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">IO 表 · R1</Text>
    <Text designId="file-2-path" name="file-2-path" className="absolute left-[865px] top-[524px] w-[294px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">/08.电气图文档</Text>
    <Text designId="file-2-reason" name="file-2-reason" className="absolute left-[1190px] top-[524px] w-[170px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">编码未匹配</Text>
    <Rect designId="files-row-line-3" name="files-row-line-3" className="absolute left-[282px] top-[577px] w-[1108px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="file-3-name" name="file-3-name" className="absolute left-[282px] top-[586px] w-[340px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">设备技术参数表</Text>
    <Text designId="file-3-code" name="file-3-code" className="absolute left-[282px] top-[608px] w-[340px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">PAR-2409-15</Text>
    <Text designId="file-3-type" name="file-3-type" className="absolute left-[655px] top-[593px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">参数表 · R2</Text>
    <Text designId="file-3-path" name="file-3-path" className="absolute left-[865px] top-[593px] w-[294px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">/07.工艺图文档</Text>
    <Text designId="file-3-reason" name="file-3-reason" className="absolute left-[1190px] top-[593px] w-[170px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">字段映射缺失</Text>
    <Rect designId="files-row-line-4" name="files-row-line-4" className="absolute left-[282px] top-[646px] w-[1108px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="file-4-name" name="file-4-name" className="absolute left-[282px] top-[655px] w-[340px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">结构 BOM 明细</Text>
    <Text designId="file-4-code" name="file-4-code" className="absolute left-[282px] top-[677px] w-[340px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">BOM-2397-06</Text>
    <Text designId="file-4-type" name="file-4-type" className="absolute left-[655px] top-[662px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">BOM · A4</Text>
    <Text designId="file-4-path" name="file-4-path" className="absolute left-[865px] top-[662px] w-[294px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">/04.结构物料</Text>
    <Text designId="file-4-reason" name="file-4-reason" className="absolute left-[1190px] top-[662px] w-[170px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">项目别名缺失</Text>
    <Rect designId="files-row-line-5" name="files-row-line-5" className="absolute left-[282px] top-[715px] w-[1108px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="file-5-name" name="file-5-name" className="absolute left-[282px] top-[724px] w-[340px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">工艺控制逻辑图</Text>
    <Text designId="file-5-code" name="file-5-code" className="absolute left-[282px] top-[746px] w-[340px] h-[18px] text-[11px] leading-[18px] text-[var(--rea-ds-color-muted)]">LOG-2407-12</Text>
    <Text designId="file-5-type" name="file-5-type" className="absolute left-[655px] top-[731px] w-[190px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">逻辑图 · R2</Text>
    <Text designId="file-5-path" name="file-5-path" className="absolute left-[865px] top-[731px] w-[294px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">/07.工艺图文档</Text>
    <Text designId="file-5-reason" name="file-5-reason" className="absolute left-[1190px] top-[731px] w-[170px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">编码未匹配</Text>
  </Frame>
</Page>
);
