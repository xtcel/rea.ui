import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="field-mapping" designId="page-root" name="字段映射">
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  数据源 / 字段映射</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="mapping-title" name="mapping-title" className="absolute left-[264px] top-[91px] w-[680px] h-[42px] text-[28px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">字段映射</Text>
    <Text designId="mapping-sub" name="mapping-sub" className="absolute left-[264px] top-[137px] w-[680px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">将 PLM 实际列与 PLViews 逻辑字段对应。</Text>
    <Rect designId="mapping-save-bg" name="mapping-save-bg" className="absolute left-[1277px] top-[96px] w-[131px] h-[36px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="mapping-save-text" name="mapping-save-text" className="absolute left-[1289px] top-[101px] w-[107px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-on-primary)] font-medium text-center">保存映射</Text>
    <Text designId="mapping-tab-connection" name="mapping-tab-connection" className="absolute left-[264px] top-[190px] w-[150px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">连接与采集</Text>
    <Text designId="mapping-tab-fields" name="mapping-tab-fields" className="absolute left-[437px] top-[190px] w-[120px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-primary)] font-semibold">字段映射</Text>
    <Text designId="mapping-tab-path" name="mapping-tab-path" className="absolute left-[577px] top-[190px] w-[150px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">库路径规则</Text>
    <Text designId="mapping-tab-log" name="mapping-tab-log" className="absolute left-[742px] top-[190px] w-[120px] h-[27px] text-[14px] leading-[27px] text-[var(--rea-ds-color-muted)]">同步日志</Text>
    <Rect designId="mapping-tab-line" name="mapping-tab-line" className="absolute left-[437px] top-[221px] w-[58px] h-[3px] bg-[var(--rea-ds-color-primary)]" />
    <Rect designId="mapping-tabs-rule" name="mapping-tabs-rule" className="absolute left-[264px] top-[226px] w-[1144px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="mapping-source" name="mapping-source" className="absolute left-[264px] top-[254px] w-[248px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="mapping-source-text" name="mapping-source-text" className="absolute left-[280px] top-[261px] w-[220px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)]">鼎捷 PLM 只读副本  ⌄</Text>
    <Text designId="mapping-state" name="mapping-state" className="absolute left-[1110px] top-[261px] w-[290px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-warning)] font-medium text-right">12 / 15 个关键字段已核对</Text>
    <Rect designId="mapping-table" name="mapping-table" className="absolute left-[264px] top-[324px] w-[1144px] h-[448px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Rect designId="mapping-table-head" name="mapping-table-head" className="absolute left-[265px] top-[325px] w-[1142px] h-[42px] bg-[var(--rea-ds-color-subtle)]" />
    <Text designId="mapping-th-1" name="mapping-th-1" className="absolute left-[285px] top-[333px] w-[265px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">PLViews 逻辑字段</Text>
    <Text designId="mapping-th-2" name="mapping-th-2" className="absolute left-[650px] top-[333px] w-[330px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">PLM 表 / 列</Text>
    <Text designId="mapping-th-3" name="mapping-th-3" className="absolute left-[1130px] top-[333px] w-[215px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">核对状态</Text>
    <Text designId="mapping-0-logical" name="mapping-0-logical" className="absolute left-[285px] top-[387px] w-[310px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">文件版本标识</Text>
    <Text designId="mapping-0-plm" name="mapping-0-plm" className="absolute left-[650px] top-[387px] w-[430px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)]">ma_foundation.GUID</Text>
    <Text designId="mapping-0-state" name="mapping-0-state" className="absolute left-[1130px] top-[387px] w-[240px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">已核对</Text>
    <Rect designId="mapping-line-1" name="mapping-line-1" className="absolute left-[285px] top-[437px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="mapping-1-logical" name="mapping-1-logical" className="absolute left-[285px] top-[449px] w-[310px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">跨版本主键</Text>
    <Text designId="mapping-1-plm" name="mapping-1-plm" className="absolute left-[650px] top-[449px] w-[430px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)]">ma_foundation.MASTERFK</Text>
    <Text designId="mapping-1-state" name="mapping-1-state" className="absolute left-[1130px] top-[449px] w-[240px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">已核对</Text>
    <Rect designId="mapping-line-2" name="mapping-line-2" className="absolute left-[285px] top-[499px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="mapping-2-logical" name="mapping-2-logical" className="absolute left-[285px] top-[511px] w-[310px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">文件名称</Text>
    <Text designId="mapping-2-plm" name="mapping-2-plm" className="absolute left-[650px] top-[511px] w-[430px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)]">ma_foundation.NAME</Text>
    <Text designId="mapping-2-state" name="mapping-2-state" className="absolute left-[1130px] top-[511px] w-[240px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-done)] font-medium">已核对</Text>
    <Rect designId="mapping-line-3" name="mapping-line-3" className="absolute left-[285px] top-[561px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="mapping-3-logical" name="mapping-3-logical" className="absolute left-[285px] top-[573px] w-[310px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">受控状态</Text>
    <Text designId="mapping-3-plm" name="mapping-3-plm" className="absolute left-[650px] top-[573px] w-[430px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)]">ma_foundation.STATUS</Text>
    <Text designId="mapping-3-state" name="mapping-3-state" className="absolute left-[1130px] top-[573px] w-[240px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-missing)] font-medium">待核对枚举</Text>
    <Rect designId="mapping-line-4" name="mapping-line-4" className="absolute left-[285px] top-[623px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="mapping-4-logical" name="mapping-4-logical" className="absolute left-[285px] top-[635px] w-[310px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">入库时间</Text>
    <Text designId="mapping-4-plm" name="mapping-4-plm" className="absolute left-[650px] top-[635px] w-[430px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)]">ma_foundation.COMMITTIME</Text>
    <Text designId="mapping-4-state" name="mapping-4-state" className="absolute left-[1130px] top-[635px] w-[240px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-missing)] font-medium">待核对时区</Text>
    <Rect designId="mapping-line-5" name="mapping-line-5" className="absolute left-[285px] top-[685px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="mapping-5-logical" name="mapping-5-logical" className="absolute left-[285px] top-[697px] w-[310px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">项目归属</Text>
    <Text designId="mapping-5-plm" name="mapping-5-plm" className="absolute left-[650px] top-[697px] w-[430px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)]">ma_foundation.PROJECTREFERENCE</Text>
    <Text designId="mapping-5-state" name="mapping-5-state" className="absolute left-[1130px] top-[697px] w-[240px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-missing)] font-medium">待核对路径</Text>
    <Text designId="mapping-footer" name="mapping-footer" className="absolute left-[264px] top-[811px] w-[1120px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">实际表名、枚举和时区以迭代 0 的数据库核对结果为准。</Text>
  </Frame>
</Page>
);
