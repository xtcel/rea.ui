import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="template-preview" designId="page-root" name="模板试算结果">
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
    <Rect designId="nav-template-active" name="nav-template-active" className="absolute left-[12px] top-[255px] w-[208px] h-[38px] bg-[var(--rea-ds-color-selected)] rounded-[var(--rea-ds-radius-md)]" />
    <Rect designId="nav-template-mark" name="nav-template-mark" className="absolute left-[12px] top-[263px] w-[3px] h-[22px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="nav-template" name="nav-template" className="absolute left-[28px] top-[262px] w-[182px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-primary)] font-semibold">流程模板</Text>
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  流程模板 / 试算结果</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="preview-title" name="preview-title" className="absolute left-[264px] top-[91px] w-[720px] h-[42px] text-[28px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">模板试算结果</Text>
    <Text designId="preview-sub" name="preview-sub" className="absolute left-[264px] top-[137px] w-[820px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">T20–T30 进度模板 · 草稿 v3 · 试算项目 PX-2412</Text>
    <Rect designId="preview-back-bg" name="preview-back-bg" className="absolute left-[1064px] top-[96px] w-[114px] h-[36px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="preview-back-text" name="preview-back-text" className="absolute left-[1076px] top-[101px] w-[90px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium text-center">返回编辑</Text>
    <Rect designId="preview-publish-bg" name="preview-publish-bg" className="absolute left-[1190px] top-[96px] w-[138px] h-[36px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="preview-publish-text" name="preview-publish-text" className="absolute left-[1202px] top-[101px] w-[114px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-on-primary)] font-medium text-center">发布版本</Text>
    <Rect designId="preview-summary" name="preview-summary" className="absolute left-[264px] top-[190px] w-[1144px] h-[108px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="preview-summary-title" name="preview-summary-title" className="absolute left-[286px] top-[207px] w-[340px] h-[25px] text-[16px] leading-[25px] text-[var(--rea-ds-color-text)] font-semibold">与已发布 v2 相比</Text>
    <Text designId="preview-summary-sub" name="preview-summary-sub" className="absolute left-[286px] top-[243px] w-[540px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">以真实文件快照预演；不会修改项目现有判定。</Text>
    <Text designId="preview-summary-one" name="preview-summary-one" className="absolute left-[856px] top-[208px] w-[70px] h-[36px] text-[28px] leading-[36px] text-[var(--rea-ds-color-text)] font-semibold">2</Text>
    <Text designId="preview-summary-one-label" name="preview-summary-one-label" className="absolute left-[856px] top-[251px] w-[156px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">节点状态变化</Text>
    <Text designId="preview-summary-two" name="preview-summary-two" className="absolute left-[1120px] top-[208px] w-[70px] h-[36px] text-[28px] leading-[36px] text-[var(--rea-ds-color-text)] font-semibold">1</Text>
    <Text designId="preview-summary-two-label" name="preview-summary-two-label" className="absolute left-[1120px] top-[251px] w-[156px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)]">新增异常</Text>
    <Text designId="preview-diff-title" name="preview-diff-title" className="absolute left-[264px] top-[337px] w-[400px] h-[29px] text-[19px] leading-[29px] text-[var(--rea-ds-color-text)] font-semibold">判定变化</Text>
    <Rect designId="preview-table" name="preview-table" className="absolute left-[264px] top-[382px] w-[1144px] h-[338px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Rect designId="preview-table-head" name="preview-table-head" className="absolute left-[265px] top-[383px] w-[1142px] h-[42px] bg-[var(--rea-ds-color-subtle)]" />
    <Text designId="preview-th-1" name="preview-th-1" className="absolute left-[284px] top-[391px] w-[340px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">节点</Text>
    <Text designId="preview-th-2" name="preview-th-2" className="absolute left-[705px] top-[391px] w-[188px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">当前 v2</Text>
    <Text designId="preview-th-3" name="preview-th-3" className="absolute left-[990px] top-[391px] w-[188px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">试算 v3</Text>
    <Text designId="preview-th-4" name="preview-th-4" className="absolute left-[1190px] top-[391px] w-[180px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)] font-medium">原因</Text>
    <Text designId="preview-0-node" name="preview-0-node" className="absolute left-[284px] top-[449px] w-[400px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">T21 工艺设计包交接 A</Text>
    <Text designId="preview-0-old" name="preview-0-old" className="absolute left-[705px] top-[449px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">已完成</Text>
    <Text designId="preview-0-new" name="preview-0-new" className="absolute left-[990px] top-[449px] w-[180px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-done)] font-medium">已完成</Text>
    <Text designId="preview-0-reason" name="preview-0-reason" className="absolute left-[1190px] top-[449px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-text)]">无变化</Text>
    <Rect designId="preview-row-line-1" name="preview-row-line-1" className="absolute left-[284px] top-[498px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="preview-1-node" name="preview-1-node" className="absolute left-[284px] top-[512px] w-[400px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">T25 工艺设计包交接 B</Text>
    <Text designId="preview-1-old" name="preview-1-old" className="absolute left-[705px] top-[512px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">文件不齐</Text>
    <Text designId="preview-1-new" name="preview-1-new" className="absolute left-[990px] top-[512px] w-[180px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-abnormal)] font-medium">异常</Text>
    <Text designId="preview-1-reason" name="preview-1-reason" className="absolute left-[1190px] top-[512px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-text)]">版本冲突</Text>
    <Rect designId="preview-row-line-2" name="preview-row-line-2" className="absolute left-[284px] top-[561px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="preview-2-node" name="preview-2-node" className="absolute left-[284px] top-[575px] w-[400px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">T28 设计汇总及交底</Text>
    <Text designId="preview-2-old" name="preview-2-old" className="absolute left-[705px] top-[575px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">待前置</Text>
    <Text designId="preview-2-new" name="preview-2-new" className="absolute left-[990px] top-[575px] w-[180px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-missing)] font-medium">文件不齐</Text>
    <Text designId="preview-2-reason" name="preview-2-reason" className="absolute left-[1190px] top-[575px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-text)]">新增文件项</Text>
    <Rect designId="preview-row-line-3" name="preview-row-line-3" className="absolute left-[284px] top-[624px] w-[1099px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="preview-3-node" name="preview-3-node" className="absolute left-[284px] top-[638px] w-[400px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">T30 采购计划与下单</Text>
    <Text designId="preview-3-old" name="preview-3-old" className="absolute left-[705px] top-[638px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-muted)]">数据不足</Text>
    <Text designId="preview-3-new" name="preview-3-new" className="absolute left-[990px] top-[638px] w-[180px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-insufficient)] font-medium">数据不足</Text>
    <Text designId="preview-3-reason" name="preview-3-reason" className="absolute left-[1190px] top-[638px] w-[190px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-text)]">无变化</Text>
    <Text designId="preview-footer" name="preview-footer" className="absolute left-[264px] top-[763px] w-[1080px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">发布后仅影响显式重新绑定模板的项目；已有项目继续使用原版本。</Text>
  </Frame>
</Page>
);
