import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="design-system" designId="page-root" name="设计系统">
  <Frame designId="desktop-artboard" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[900px] bg-[var(--rea-ds-color-background)]">
    <Rect designId="ds-background" name="ds-background" className="absolute left-[0px] top-[0px] w-[1440px] h-[900px] bg-[var(--rea-ds-color-background)]" />
    <Text designId="ds-title" name="ds-title" className="absolute left-[48px] top-[36px] w-[800px] h-[42px] text-[30px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">PLViews 设计系统</Text>
    <Text designId="ds-subtitle" name="ds-subtitle" className="absolute left-[48px] top-[86px] w-[960px] h-[24px] text-[14px] leading-[24px] text-[var(--rea-ds-color-muted)]">桌面端 · 浅色主稿  /  深色扩展 · 以信息判定为中心</Text>
    <Rect designId="ds-rule" name="ds-rule" className="absolute left-[48px] top-[126px] w-[1344px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="ds-colors-title" name="ds-colors-title" className="absolute left-[48px] top-[158px] w-[500px] h-[30px] text-[20px] leading-[30px] text-[var(--rea-ds-color-text)] font-semibold">基础色</Text>
    <Text designId="ds-colors-note" name="ds-colors-note" className="absolute left-[48px] top-[191px] w-[610px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-muted)]">工作区维持低噪声，颜色留给行动和判定状态。</Text>
    <Rect designId="swatch-primary" name="swatch-primary" className="absolute left-[48px] top-[236px] w-[196px] h-[84px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="swatch-primary-label" name="swatch-primary-label" className="absolute left-[48px] top-[331px] w-[196px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">主操作</Text>
    <Rect designId="swatch-background" name="swatch-background" className="absolute left-[268px] top-[236px] w-[196px] h-[84px] bg-[var(--rea-ds-color-background)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="swatch-background-label" name="swatch-background-label" className="absolute left-[268px] top-[331px] w-[196px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">画布</Text>
    <Rect designId="swatch-surface" name="swatch-surface" className="absolute left-[488px] top-[236px] w-[196px] h-[84px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="swatch-surface-label" name="swatch-surface-label" className="absolute left-[488px] top-[331px] w-[196px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">表面</Text>
    <Rect designId="swatch-text" name="swatch-text" className="absolute left-[708px] top-[236px] w-[196px] h-[84px] bg-[var(--rea-ds-color-text)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="swatch-text-label" name="swatch-text-label" className="absolute left-[708px] top-[331px] w-[196px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">正文</Text>
    <Rect designId="swatch-border" name="swatch-border" className="absolute left-[928px] top-[236px] w-[196px] h-[84px] bg-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="swatch-border-label" name="swatch-border-label" className="absolute left-[928px] top-[331px] w-[196px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">分隔</Text>
    <Rect designId="swatch-selected" name="swatch-selected" className="absolute left-[1148px] top-[236px] w-[196px] h-[84px] bg-[var(--rea-ds-color-selected)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="swatch-selected-label" name="swatch-selected-label" className="absolute left-[1148px] top-[331px] w-[196px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-text)] font-medium">选中</Text>
    <Text designId="states-title" name="states-title" className="absolute left-[48px] top-[390px] w-[460px] h-[30px] text-[20px] leading-[30px] text-[var(--rea-ds-color-text)] font-semibold">判定状态</Text>
    <Text designId="states-note" name="states-note" className="absolute left-[48px] top-[422px] w-[700px] h-[22px] text-[13px] leading-[22px] text-[var(--rea-ds-color-muted)]">同一状态始终同色；所有颜色都同时出现文字标签。</Text>
    <Rect designId="state-done-bg" name="state-done-bg" className="absolute left-[48px] top-[462px] w-[128px] h-[26px] bg-[var(--rea-ds-color-done-bg)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="state-done-text" name="state-done-text" className="absolute left-[56px] top-[464px] w-[112px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-done)] font-medium">已完成</Text>
    <Rect designId="state-ready-bg" name="state-ready-bg" className="absolute left-[378px] top-[462px] w-[172px] h-[26px] bg-[var(--rea-ds-color-ready-bg)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="state-ready-text" name="state-ready-text" className="absolute left-[386px] top-[464px] w-[156px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-ready)] font-medium">已齐套待确认</Text>
    <Rect designId="state-missing-bg" name="state-missing-bg" className="absolute left-[708px] top-[462px] w-[128px] h-[26px] bg-[var(--rea-ds-color-missing-bg)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="state-missing-text" name="state-missing-text" className="absolute left-[716px] top-[464px] w-[112px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-missing)] font-medium">文件不齐</Text>
    <Rect designId="state-waiting-bg" name="state-waiting-bg" className="absolute left-[1038px] top-[462px] w-[128px] h-[26px] bg-[var(--rea-ds-color-waiting-bg)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="state-waiting-text" name="state-waiting-text" className="absolute left-[1046px] top-[464px] w-[112px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-waiting)] font-medium">待前置</Text>
    <Rect designId="state-abnormal-bg" name="state-abnormal-bg" className="absolute left-[48px] top-[514px] w-[128px] h-[26px] bg-[var(--rea-ds-color-abnormal-bg)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="state-abnormal-text" name="state-abnormal-text" className="absolute left-[56px] top-[516px] w-[112px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-abnormal)] font-medium">异常</Text>
    <Rect designId="state-insufficient-bg" name="state-insufficient-bg" className="absolute left-[378px] top-[514px] w-[128px] h-[26px] bg-[var(--rea-ds-color-insufficient-bg)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="state-insufficient-text" name="state-insufficient-text" className="absolute left-[386px] top-[516px] w-[112px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-insufficient)] font-medium">数据不足</Text>
    <Rect designId="state-notstarted-bg" name="state-notstarted-bg" className="absolute left-[708px] top-[514px] w-[128px] h-[26px] bg-[var(--rea-ds-color-not-started-bg)] rounded-[var(--rea-ds-radius-sm)]" />
    <Text designId="state-notstarted-text" name="state-notstarted-text" className="absolute left-[716px] top-[516px] w-[112px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-not-started)] font-medium">未开始</Text>
    <Rect designId="ds-second-rule" name="ds-second-rule" className="absolute left-[48px] top-[590px] w-[1344px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="type-title" name="type-title" className="absolute left-[48px] top-[620px] w-[360px] h-[30px] text-[20px] leading-[30px] text-[var(--rea-ds-color-text)] font-semibold">排版与控件</Text>
    <Text designId="type-heading" name="type-heading" className="absolute left-[48px] top-[666px] w-[390px] h-[38px] text-[28px] leading-[38px] text-[var(--rea-ds-color-text)] font-semibold">页面标题  28 / 35</Text>
    <Text designId="type-body" name="type-body" className="absolute left-[48px] top-[711px] w-[430px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)]">正文  14 / 21    ·    辅助  12 / 18</Text>
    <Text designId="type-note" name="type-note" className="absolute left-[48px] top-[747px] w-[600px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">系统字体，8px 间距基数；控件 8px 圆角，面板 12px。</Text>
    <Rect designId="ds-primary-bg" name="ds-primary-bg" className="absolute left-[686px] top-[665px] w-[130px] h-[36px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="ds-primary-text" name="ds-primary-text" className="absolute left-[698px] top-[670px] w-[106px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-on-primary)] font-medium text-center">主要操作</Text>
    <Rect designId="ds-secondary-bg" name="ds-secondary-bg" className="absolute left-[830px] top-[665px] w-[130px] h-[36px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="ds-secondary-text" name="ds-secondary-text" className="absolute left-[842px] top-[670px] w-[106px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium text-center">次要操作</Text>
    <Rect designId="ds-input" name="ds-input" className="absolute left-[686px] top-[719px] w-[274px] h-[38px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="ds-input-hint" name="ds-input-hint" className="absolute left-[700px] top-[726px] w-[242px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">例：项目编号 PX-2412</Text>
    <Rect designId="ds-dark-preview" name="ds-dark-preview" className="absolute left-[1030px] top-[629px] w-[362px] h-[164px] bg-[var(--rea-ds-color-dark-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="ds-dark-label" name="ds-dark-label" className="absolute left-[1054px] top-[653px] w-[280px] h-[25px] text-[16px] leading-[25px] text-[var(--rea-ds-color-dark-text)] font-semibold">深色扩展</Text>
    <Text designId="ds-dark-copy" name="ds-dark-copy" className="absolute left-[1054px] top-[688px] w-[314px] h-[46px] text-[13px] leading-[46px] text-[var(--rea-ds-color-dark-muted)] leading-[23px]">同一布局与状态语义；切换表面、文字与边线令牌。</Text>
    <Text designId="ds-footer" name="ds-footer" className="absolute left-[48px] top-[833px] w-[1320px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">参考：monday.com 的分组工作区、列式信息与状态标签。示例页面使用 PLViews 语义。</Text>
  </Frame>
</Page>
);
