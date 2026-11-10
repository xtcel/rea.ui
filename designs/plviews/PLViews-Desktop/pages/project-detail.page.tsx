import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="project-detail" designId="page-root" name="单项目进度">
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  项目 / PX-2412</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="project-title" name="project-title" className="absolute left-[264px] top-[88px] w-[720px] h-[42px] text-[27px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">PX-2412 高温反应系统</Text>
    <Text designId="project-subtitle" name="project-subtitle" className="absolute left-[264px] top-[133px] w-[800px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-muted)]">项目进度 8 / 13 个可识别节点 · 齐套率 74% · 数据不足 2</Text>
    <Rect designId="recalculate-bg" name="recalculate-bg" className="absolute left-[1268px] top-[98px] w-[140px] h-[36px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="recalculate-text" name="recalculate-text" className="absolute left-[1280px] top-[103px] w-[116px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium text-center">重新判定</Text>
    <Text designId="tab-nodes" name="tab-nodes" className="absolute left-[264px] top-[185px] w-[104px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-primary)] font-semibold">节点视图</Text>
    <Text designId="tab-flow" name="tab-flow" className="absolute left-[382px] top-[185px] w-[84px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">流程图</Text>
    <Text designId="tab-files" name="tab-files" className="absolute left-[486px] top-[185px] w-[104px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">文件记录</Text>
    <Rect designId="tab-active-line" name="tab-active-line" className="absolute left-[264px] top-[214px] w-[78px] h-[3px] bg-[var(--rea-ds-color-primary)]" />
    <Rect designId="tabs-rule" name="tabs-rule" className="absolute left-[264px] top-[218px] w-[1144px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="section-title" name="section-title" className="absolute left-[264px] top-[247px] w-[320px] h-[30px] text-[19px] leading-[30px] text-[var(--rea-ds-color-text)] font-semibold">节点判定</Text>
    <Text designId="section-sub" name="section-sub" className="absolute left-[264px] top-[282px] w-[680px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">按专业支路查看；选中节点显示判定依据。</Text>
    <Rect designId="node-table" name="node-table" className="absolute left-[264px] top-[322px] w-[782px] h-[495px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Rect designId="node-header" name="node-header" className="absolute left-[265px] top-[323px] w-[780px] h-[40px] bg-[var(--rea-ds-color-subtle)]" />
    <Text designId="node-th-name" name="node-th-name" className="absolute left-[284px] top-[330px] w-[320px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)] font-medium">节点</Text>
    <Text designId="node-th-state" name="node-th-state" className="absolute left-[633px] top-[330px] w-[130px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)] font-medium">状态</Text>
    <Text designId="node-th-rate" name="node-th-rate" className="absolute left-[830px] top-[330px] w-[130px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)] font-medium">文件齐套</Text>
    <Text designId="group-0-label" name="group-0-label" className="absolute left-[284px] top-[376px] w-[300px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-primary)] font-semibold">工艺支路</Text>
    <Text designId="group-1-label" name="group-1-label" className="absolute left-[284px] top-[516px] w-[300px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-primary)] font-semibold">结构支路</Text>
    <Text designId="group-2-label" name="group-2-label" className="absolute left-[284px] top-[656px] w-[300px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-primary)] font-semibold">电气支路</Text>
    <Text designId="node-0-name" name="node-0-name" className="absolute left-[284px] top-[414px] w-[330px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">T21 工艺设计包交接 A</Text>
    <Text designId="node-0-state" name="node-0-state" className="absolute left-[633px] top-[414px] w-[160px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-done)] font-medium">已完成</Text>
    <Text designId="node-0-rate" name="node-0-rate" className="absolute left-[830px] top-[414px] w-[100px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">3 / 3</Text>
    <Rect designId="selected-node" name="selected-node" className="absolute left-[266px] top-[456px] w-[778px] h-[51px] bg-[var(--rea-ds-color-selected)]" />
    <Text designId="node-1-name" name="node-1-name" className="absolute left-[284px] top-[466px] w-[330px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">T25 工艺设计包交接 B</Text>
    <Text designId="node-1-state" name="node-1-state" className="absolute left-[633px] top-[466px] w-[160px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-missing)] font-medium">文件不齐</Text>
    <Text designId="node-1-rate" name="node-1-rate" className="absolute left-[830px] top-[466px] w-[100px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">2 / 3</Text>
    <Text designId="node-2-name" name="node-2-name" className="absolute left-[284px] top-[554px] w-[330px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">T22 三维模型建立</Text>
    <Text designId="node-2-state" name="node-2-state" className="absolute left-[633px] top-[554px] w-[160px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-done)] font-medium">已完成</Text>
    <Text designId="node-2-rate" name="node-2-rate" className="absolute left-[830px] top-[554px] w-[100px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">2 / 2</Text>
    <Text designId="node-3-name" name="node-3-name" className="absolute left-[284px] top-[606px] w-[330px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">T23 管道图与结构 BOM</Text>
    <Text designId="node-3-state" name="node-3-state" className="absolute left-[633px] top-[606px] w-[160px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-ready)] font-medium">已齐套</Text>
    <Text designId="node-3-rate" name="node-3-rate" className="absolute left-[830px] top-[606px] w-[100px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">3 / 3</Text>
    <Text designId="node-4-name" name="node-4-name" className="absolute left-[284px] top-[694px] w-[330px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">T26 电气设计及 IO 配置</Text>
    <Text designId="node-4-state" name="node-4-state" className="absolute left-[633px] top-[694px] w-[160px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-done)] font-medium">已完成</Text>
    <Text designId="node-4-rate" name="node-4-rate" className="absolute left-[830px] top-[694px] w-[100px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">4 / 4</Text>
    <Text designId="node-5-name" name="node-5-name" className="absolute left-[284px] top-[746px] w-[330px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">T27 程序检查与模拟测试</Text>
    <Text designId="node-5-state" name="node-5-state" className="absolute left-[633px] top-[746px] w-[160px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-insufficient)] font-medium">数据不足</Text>
    <Text designId="node-5-rate" name="node-5-rate" className="absolute left-[830px] top-[746px] w-[100px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">—</Text>
    <Rect designId="evidence-panel" name="evidence-panel" className="absolute left-[1064px] top-[322px] w-[344px] h-[495px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="evidence-title" name="evidence-title" className="absolute left-[1084px] top-[342px] w-[300px] h-[28px] text-[16px] leading-[28px] text-[var(--rea-ds-color-text)] font-semibold">T25 · 工艺设计包交接 B</Text>
    <Text designId="evidence-status" name="evidence-status" className="absolute left-[1084px] top-[380px] w-[290px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-missing)] font-medium">文件不齐 · 已命中 2 / 3</Text>
    <Rect designId="evidence-divider-1" name="evidence-divider-1" className="absolute left-[1084px] top-[416px] w-[304px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="evidence-files-title" name="evidence-files-title" className="absolute left-[1084px] top-[434px] w-[240px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)] font-semibold">所需文件项</Text>
    <Text designId="evidence-file-1" name="evidence-file-1" className="absolute left-[1084px] top-[472px] w-[288px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-done)]">✓  统一版本 P&amp;ID · R3</Text>
    <Text designId="evidence-file-2" name="evidence-file-2" className="absolute left-[1084px] top-[506px] w-[288px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-done)]">✓  控制逻辑图 · R2</Text>
    <Text designId="evidence-file-3" name="evidence-file-3" className="absolute left-[1084px] top-[540px] w-[288px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-missing)] font-medium">○  设备参数表 · 缺失</Text>
    <Rect designId="evidence-divider-2" name="evidence-divider-2" className="absolute left-[1084px] top-[579px] w-[304px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="evidence-rule" name="evidence-rule" className="absolute left-[1084px] top-[596px] w-[290px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">判定规则 v3 · 快照 09:42</Text>
    <Text designId="evidence-link" name="evidence-link" className="absolute left-[1084px] top-[631px] w-[260px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-primary)] font-medium">展开判定依据  →</Text>
    <Text designId="evidence-override" name="evidence-override" className="absolute left-[1084px] top-[762px] w-[280px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-primary)] font-medium">人工修正</Text>
  </Frame>
</Page>
);
