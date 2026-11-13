import { Page, Frame, Rect, Ellipse, Text } from '@rea/design';

// 布局骨架：生成业务页面时，评估把重复字段和记录抽取到组件目录。
export default (
  <Page id="main" designId="page-root" name="项目设置">
    <Frame designId="desktop" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-[#f6f7f9]">
      <Frame designId="sidebar-layout" name="侧边栏" className="absolute left-[0px] top-[0px] w-[240px] h-[1024px]">
<Rect designId="sidebar" name="侧栏" className="absolute left-[0px] top-[0px] w-[240px] h-[1024px] bg-[#1f2430]" />
<Text designId="logo" name="品牌" className="absolute left-[24px] top-[24px] w-[120px] h-[28px] text-[20px] leading-[28px] font-medium text-white">NOVA</Text>
<Text designId="nav-1" name="工作台" className="absolute left-[32px] top-[112px] w-[120px] h-[24px] text-[14px] leading-[24px] text-[#c9d2e3]">工作台</Text>
<Text designId="nav-2" name="项目" className="absolute left-[32px] top-[160px] w-[120px] h-[24px] text-[14px] leading-[24px] text-white">项目</Text>
<Text designId="nav-3" name="设置" className="absolute left-[32px] top-[208px] w-[120px] h-[24px] text-[14px] leading-[24px] text-[#c9d2e3]">设置</Text>
</Frame>

      <Frame designId="page-introduction" name="设置页标题" className="absolute left-[280px] top-[88px] w-[560px] h-[64px]">
<Text designId="page-title" name="页面标题" className="absolute left-[0px] top-[0px] w-[420px] h-[38px] text-[28px] leading-[38px] font-medium text-[#30343b]">项目设置</Text>
<Text designId="page-subtitle" name="页面说明" className="absolute left-[0px] top-[42px] w-[560px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">修改基本信息、通知偏好与项目状态。</Text>
</Frame>

      <Frame designId="form-card" name="表单卡" className="absolute left-[280px] top-[176px] w-[720px] h-[632px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="group-1" name="分组标题" className="absolute left-[32px] top-[28px] w-[240px] h-[24px] text-[16px] leading-[24px] font-medium text-[#30343b]">基本信息</Text>

        <Frame designId="field-name" name="项目名称字段" className="absolute left-[32px] top-[72px] w-[656px] h-[62px]">
<Text designId="label-name" name="标签" className="absolute left-[0px] top-[0px] w-[120px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">项目名称</Text>
<Rect designId="input-name" name="输入框" className="absolute left-[0px] top-[22px] w-[656px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
<Text designId="input-name-value" name="输入值" className="absolute left-[14px] top-[32px] w-[300px] h-[20px] text-[13px] leading-[20px] text-[#30343b]">品牌改版</Text>
</Frame>

        <Frame designId="field-owner" name="负责人字段" className="absolute left-[32px] top-[154px] w-[320px] h-[62px]">
<Text designId="label-owner" name="标签" className="absolute left-[0px] top-[0px] w-[120px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">负责人</Text>
<Rect designId="input-owner" name="输入框" className="absolute left-[0px] top-[22px] w-[320px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
<Text designId="input-owner-value" name="输入值" className="absolute left-[14px] top-[32px] w-[200px] h-[20px] text-[13px] leading-[20px] text-[#30343b]">林晓</Text>
</Frame>

        <Frame designId="field-date" name="开始日期字段" className="absolute left-[368px] top-[154px] w-[320px] h-[62px]">
<Text designId="label-date" name="标签" className="absolute left-[0px] top-[0px] w-[120px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">开始日期</Text>
<Rect designId="input-date" name="输入框" className="absolute left-[0px] top-[22px] w-[320px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
<Text designId="input-date-value" name="输入值" className="absolute left-[14px] top-[32px] w-[200px] h-[20px] text-[13px] leading-[20px] text-[#30343b]">2026-11-01</Text>
</Frame>

        <Frame designId="field-desc" name="项目描述字段" className="absolute left-[32px] top-[236px] w-[656px] h-[140px]">
<Text designId="label-desc" name="标签" className="absolute left-[0px] top-[0px] w-[120px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">项目描述</Text>
<Rect designId="input-desc" name="描述框" className="absolute left-[0px] top-[22px] w-[656px] h-[96px] bg-white border border-[#e5e7eb] rounded-lg" />
<Text designId="input-desc-value" name="描述内容" className="absolute left-[14px] top-[34px] w-[600px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">统一品牌视觉与官网表达，覆盖首页、产品页与帮助中心。</Text>
<Text designId="desc-hint" name="描述提示" className="absolute left-[0px] top-[122px] w-[400px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">建议 120 字以内，面向团队成员说明目标。</Text>
</Frame>

        <Rect designId="divider" name="分隔线" className="absolute left-[32px] top-[400px] w-[656px] h-[1px] bg-[#eef0f3]" />

        <Text designId="group-2" name="分组标题" className="absolute left-[32px] top-[424px] w-[240px] h-[24px] text-[16px] leading-[24px] font-medium text-[#30343b]">通知</Text>
        <Frame designId="status-notifications" name="状态变更通知" className="absolute left-[32px] top-[468px] w-[656px] h-[42px]">
<Text designId="switch-1-label" name="开关标签" className="absolute left-[0px] top-[0px] w-[400px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">状态变更时通知我</Text>
<Text designId="switch-1-hint" name="开关说明" className="absolute left-[0px] top-[24px] w-[420px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">项目进入评审、完成或延期时发送站内信。</Text>
<Rect designId="switch-1" name="开关" className="absolute left-[616px] top-[4px] w-[40px] h-[22px] bg-[#356af0] rounded-full" />
<Ellipse designId="switch-1-knob" name="开关滑块" className="absolute left-[634px] top-[6px] w-[18px] h-[18px] bg-white" />
</Frame>

        <Frame designId="weekly-notifications" name="每周摘要通知" className="absolute left-[32px] top-[536px] w-[656px] h-[42px]">
<Text designId="switch-2-label" name="开关标签" className="absolute left-[0px] top-[0px] w-[400px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">每周发送进度摘要</Text>
<Text designId="switch-2-hint" name="开关说明" className="absolute left-[0px] top-[24px] w-[420px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">每周一 09:00 汇总上周交付与风险。</Text>
<Rect designId="switch-2" name="开关" className="absolute left-[616px] top-[4px] w-[40px] h-[22px] bg-[#e5e7eb] rounded-full" />
<Ellipse designId="switch-2-knob" name="开关滑块" className="absolute left-[618px] top-[6px] w-[18px] h-[18px] bg-white" />
</Frame>
      </Frame>

      <Frame designId="tip-card" name="提示卡" className="absolute left-[1024px] top-[176px] w-[352px] h-[188px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="tip-title" name="提示标题" className="absolute left-[24px] top-[24px] w-[280px] h-[24px] text-[14px] leading-[24px] font-medium text-[#30343b]">关于项目设置</Text>
        <Text designId="tip-1" name="提示 1" className="absolute left-[24px] top-[60px] w-[300px] h-[44px] text-[12px] leading-[22px] text-[#656d79]">负责人变更后，新负责人会收到一次通知。</Text>
        <Text designId="tip-2" name="提示 2" className="absolute left-[24px] top-[112px] w-[300px] h-[44px] text-[12px] leading-[22px] text-[#656d79]">归档项目保留只读访问，不占用进行中名额。</Text>
      </Frame>

      <Frame designId="form-actions" name="表单操作" className="absolute left-[1000px] top-[848px] w-[248px] h-[40px]">
<Rect designId="cancel-button" name="取消按钮" className="absolute left-[0px] top-[0px] w-[96px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
<Text designId="cancel-label" name="取消" className="absolute left-[28px] top-[10px] w-[40px] h-[20px] text-[13px] leading-[20px] text-[#30343b]">取消</Text>
<Rect designId="save-button" name="保存按钮" className="absolute left-[112px] top-[0px] w-[136px] h-[40px] bg-[#356af0] rounded-lg" />
<Text designId="save-label" name="保存" className="absolute left-[152px] top-[10px] w-[56px] h-[20px] text-[13px] leading-[20px] text-white">保存修改</Text>
</Frame>
    </Frame>
  </Page>
);
