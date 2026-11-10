import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="login" designId="page-root" name="登录">
  <Frame designId="desktop-artboard" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[900px] bg-[var(--rea-ds-color-background)]">
    <Rect designId="login-bg" name="login-bg" className="absolute left-[0px] top-[0px] w-[1440px] h-[900px] bg-[var(--rea-ds-color-background)]" />
    <Rect designId="login-side" name="login-side" className="absolute left-[0px] top-[0px] w-[610px] h-[900px] bg-[var(--rea-ds-color-sidebar)]" />
    <Rect designId="login-brand-mark" name="login-brand-mark" className="absolute left-[64px] top-[58px] w-[34px] h-[34px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="login-brand-letter" name="login-brand-letter" className="absolute left-[74px] top-[62px] w-[20px] h-[26px] text-[18px] leading-[26px] text-[var(--rea-ds-color-on-primary)] font-bold">P</Text>
    <Text designId="login-brand" name="login-brand" className="absolute left-[111px] top-[56px] w-[250px] h-[38px] text-[25px] leading-[38px] text-[var(--rea-ds-color-text)] font-semibold">PLViews</Text>
    <Text designId="login-hero" name="login-hero" className="absolute left-[64px] top-[263px] w-[480px] h-[132px] text-[46px] leading-[132px] text-[var(--rea-ds-color-text)] font-semibold whitespace-pre-line leading-[65px]">项目进度，
有据可查。</Text>
    <Text designId="login-description" name="login-description" className="absolute left-[64px] top-[438px] w-[450px] h-[70px] text-[17px] leading-[70px] text-[var(--rea-ds-color-muted)] whitespace-pre-line leading-[29px]">从 PLM 文件与版本证据出发，
看清每个节点的真实状态。</Text>
    <Rect designId="login-side-line" name="login-side-line" className="absolute left-[64px] top-[791px] w-[480px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="login-side-footer" name="login-side-footer" className="absolute left-[64px] top-[813px] w-[420px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">PLM 数据只读 · 进度判定留痕</Text>
    <Rect designId="login-form" name="login-form" className="absolute left-[770px] top-[159px] w-[500px] h-[585px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="login-title" name="login-title" className="absolute left-[814px] top-[211px] w-[390px] h-[45px] text-[28px] leading-[45px] text-[var(--rea-ds-color-text)] font-semibold">登录 PLViews</Text>
    <Text designId="login-sub" name="login-sub" className="absolute left-[814px] top-[264px] w-[390px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-muted)]">使用组织分配的本地账号</Text>
    <Text designId="login-account-label" name="login-account-label" className="absolute left-[814px] top-[322px] w-[390px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">账号</Text>
    <Rect designId="login-account" name="login-account" className="absolute left-[814px] top-[352px] w-[412px] h-[44px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="login-account-example" name="login-account-example" className="absolute left-[829px] top-[361px] w-[370px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-muted)]">例：lin.yu</Text>
    <Text designId="login-password-label" name="login-password-label" className="absolute left-[814px] top-[422px] w-[390px] h-[23px] text-[13px] leading-[23px] text-[var(--rea-ds-color-text)] font-medium">密码</Text>
    <Rect designId="login-password" name="login-password" className="absolute left-[814px] top-[452px] w-[412px] h-[44px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="login-password-example" name="login-password-example" className="absolute left-[829px] top-[461px] w-[370px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-muted)]">输入密码</Text>
    <Rect designId="login-submit-bg" name="login-submit-bg" className="absolute left-[814px] top-[538px] w-[412px] h-[46px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="login-submit" name="login-submit" className="absolute left-[814px] top-[547px] w-[412px] h-[27px] text-[15px] leading-[27px] text-[var(--rea-ds-color-on-primary)] font-semibold text-center">登录</Text>
    <Text designId="login-help" name="login-help" className="absolute left-[814px] top-[619px] w-[412px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">如需开通账号，请联系系统管理员。</Text>
  </Frame>
</Page>
);
