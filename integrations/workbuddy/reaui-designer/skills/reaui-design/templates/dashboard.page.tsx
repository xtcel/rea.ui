import { Page, Frame, Rect, Ellipse, Text } from '@rea/design';

export default (
  <Page id="main" designId="page-root" name="工作台">
    <Frame designId="desktop" name="桌面画板" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-[#f6f7f9]">
      <Rect designId="sidebar" name="侧栏" className="absolute left-0 top-0 w-[240px] h-[1024px] bg-[#1f2430]" />
      <Text designId="logo" name="品牌" className="absolute left-[24px] top-[24px] w-[120px] h-[28px] text-[20px] leading-[28px] font-medium text-white">NOVA</Text>
      <Rect designId="nav-active" name="选中项" className="absolute left-[16px] top-[104px] w-[208px] h-[40px] bg-[#2b3345] rounded-lg" />
      <Text designId="nav-1" name="工作台" className="absolute left-[32px] top-[112px] w-[120px] h-[24px] text-[14px] leading-[24px] text-white">工作台</Text>
      <Text designId="nav-2" name="项目" className="absolute left-[32px] top-[160px] w-[120px] h-[24px] text-[14px] leading-[24px] text-[#c9d2e3]">项目</Text>
      <Text designId="nav-3" name="成员" className="absolute left-[32px] top-[208px] w-[120px] h-[24px] text-[14px] leading-[24px] text-[#c9d2e3]">成员</Text>
      <Text designId="nav-4" name="报表" className="absolute left-[32px] top-[256px] w-[120px] h-[24px] text-[14px] leading-[24px] text-[#c9d2e3]">报表</Text>
      <Text designId="nav-5" name="设置" className="absolute left-[32px] top-[304px] w-[120px] h-[24px] text-[14px] leading-[24px] text-[#c9d2e3]">设置</Text>

      <Rect designId="topbar" name="顶栏" className="absolute left-[240px] top-0 w-[1200px] h-[64px] bg-white border-b border-[#e5e7eb]" />
      <Rect designId="search" name="搜索框" className="absolute left-[280px] top-[14px] w-[280px] h-[36px] bg-[#f6f7f9] rounded-lg" />
      <Text designId="search-label" name="搜索提示" className="absolute left-[296px] top-[23px] w-[200px] h-[18px] text-[12px] leading-[18px] text-[#8a929e]">搜索项目、成员或报表</Text>
      <Ellipse designId="avatar" name="头像" className="absolute left-[1352px] top-[16px] w-[32px] h-[32px] bg-[#dbe4f7]" />
      <Text designId="avatar-text" name="头像文字" className="absolute left-[1360px] top-[22px] w-[16px] h-[20px] text-[12px] leading-[20px] text-[#356af0]">林</Text>

      <Text designId="page-title" name="页面标题" className="absolute left-[280px] top-[104px] w-[420px] h-[38px] text-[28px] leading-[38px] font-medium text-[#30343b]">工作台</Text>
      <Text designId="page-subtitle" name="页面说明" className="absolute left-[280px] top-[146px] w-[520px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">本周团队共完成 24 个交付项，较上周增长 12%。</Text>
      <Rect designId="primary-button" name="主按钮" className="absolute left-[1216px] top-[104px] w-[160px] h-[40px] bg-[#356af0] rounded-lg" />
      <Text designId="primary-button-label" name="主按钮文字" className="absolute left-[1256px] top-[114px] w-[80px] h-[20px] text-[13px] leading-[20px] text-white">新建项目</Text>

      <Frame designId="metric-1" name="指标卡 1" className="absolute left-[280px] top-[192px] w-[256px] h-[120px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="metric-1-label" name="指标名" className="absolute left-[24px] top-[20px] w-[160px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">进行中的项目</Text>
        <Text designId="metric-1-value" name="指标值" className="absolute left-[24px] top-[48px] w-[180px] h-[40px] text-[30px] leading-[40px] font-medium text-[#30343b]">18</Text>
        <Text designId="metric-1-trend" name="趋势" className="absolute left-[24px] top-[92px] w-[200px] h-[18px] text-[12px] leading-[18px] text-[#1d9e75]">+3 本周新增</Text>
      </Frame>
      <Frame designId="metric-2" name="指标卡 2" className="absolute left-[560px] top-[192px] w-[256px] h-[120px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="metric-2-label" name="指标名" className="absolute left-[24px] top-[20px] w-[160px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">待处理任务</Text>
        <Text designId="metric-2-value" name="指标值" className="absolute left-[24px] top-[48px] w-[180px] h-[40px] text-[30px] leading-[40px] font-medium text-[#30343b]">42</Text>
        <Text designId="metric-2-trend" name="趋势" className="absolute left-[24px] top-[92px] w-[200px] h-[18px] text-[12px] leading-[18px] text-[#ba7517]">7 项即将逾期</Text>
      </Frame>
      <Frame designId="metric-3" name="指标卡 3" className="absolute left-[840px] top-[192px] w-[256px] h-[120px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="metric-3-label" name="指标名" className="absolute left-[24px] top-[20px] w-[160px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">按时交付率</Text>
        <Text designId="metric-3-value" name="指标值" className="absolute left-[24px] top-[48px] w-[180px] h-[40px] text-[30px] leading-[40px] font-medium text-[#30343b]">94%</Text>
        <Text designId="metric-3-trend" name="趋势" className="absolute left-[24px] top-[92px] w-[200px] h-[18px] text-[12px] leading-[18px] text-[#1d9e75]">+2.4% 环比</Text>
      </Frame>
      <Frame designId="metric-4" name="指标卡 4" className="absolute left-[1120px] top-[192px] w-[256px] h-[120px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="metric-4-label" name="指标名" className="absolute left-[24px] top-[20px] w-[160px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">团队成员</Text>
        <Text designId="metric-4-value" name="指标值" className="absolute left-[24px] top-[48px] w-[180px] h-[40px] text-[30px] leading-[40px] font-medium text-[#30343b]">12</Text>
        <Text designId="metric-4-trend" name="趋势" className="absolute left-[24px] top-[92px] w-[200px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">3 位设计师</Text>
      </Frame>

      <Frame designId="chart-card" name="趋势卡" className="absolute left-[280px] top-[336px] w-[720px] h-[360px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="chart-title" name="图表标题" className="absolute left-[24px] top-[24px] w-[240px] h-[24px] text-[16px] leading-[24px] font-medium text-[#30343b]">交付趋势</Text>
        <Text designId="chart-subtitle" name="图表说明" className="absolute left-[24px] top-[50px] w-[320px] h-[18px] text-[12px] leading-[18px] text-[#656d79]">最近 7 天完成的交付项</Text>
        <Rect designId="chart-baseline" name="基线" className="absolute left-[40px] top-[300px] w-[640px] h-[1px] bg-[#e5e7eb]" />
        <Rect designId="bar-1" name="周一" className="absolute left-[48px] top-[180px] w-[40px] h-[120px] bg-[#c7d7fb] rounded-t" />
        <Rect designId="bar-2" name="周二" className="absolute left-[136px] top-[132px] w-[40px] h-[168px] bg-[#c7d7fb] rounded-t" />
        <Rect designId="bar-3" name="周三" className="absolute left-[224px] top-[204px] w-[40px] h-[96px] bg-[#c7d7fb] rounded-t" />
        <Rect designId="bar-4" name="周四" className="absolute left-[312px] top-[100px] w-[40px] h-[200px] bg-[#c7d7fb] rounded-t" />
        <Rect designId="bar-5" name="周五" className="absolute left-[400px] top-[148px] w-[40px] h-[152px] bg-[#c7d7fb] rounded-t" />
        <Rect designId="bar-6" name="周六" className="absolute left-[488px] top-[68px] w-[40px] h-[232px] bg-[#356af0] rounded-t" />
        <Rect designId="bar-7" name="周日" className="absolute left-[576px] top-[116px] w-[40px] h-[184px] bg-[#c7d7fb] rounded-t" />
        <Text designId="chart-footnote" name="图表脚注" className="absolute left-[24px] top-[318px] w-[400px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">周六达到本周峰值 28 项</Text>
      </Frame>

      <Frame designId="activity-card" name="活动卡" className="absolute left-[1024px] top-[336px] w-[352px] h-[360px] bg-white rounded-xl border border-[#e5e7eb]">
        <Text designId="activity-title" name="活动标题" className="absolute left-[24px] top-[24px] w-[240px] h-[24px] text-[16px] leading-[24px] font-medium text-[#30343b]">最近动态</Text>
        <Ellipse designId="activity-dot-1" name="状态点" className="absolute left-[24px] top-[72px] w-[8px] h-[8px] bg-[#1d9e75]" />
        <Text designId="activity-1" name="动态 1" className="absolute left-[44px] top-[64px] w-[240px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">林晓更新了「品牌改版」</Text>
        <Text designId="activity-time-1" name="时间 1" className="absolute left-[44px] top-[88px] w-[200px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">12 分钟前</Text>
        <Ellipse designId="activity-dot-2" name="状态点" className="absolute left-[24px] top-[132px] w-[8px] h-[8px] bg-[#356af0]" />
        <Text designId="activity-2" name="动态 2" className="absolute left-[44px] top-[124px] w-[260px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">陈墨提交了 3 个设计评审</Text>
        <Text designId="activity-time-2" name="时间 2" className="absolute left-[44px] top-[148px] w-[200px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">1 小时前</Text>
        <Ellipse designId="activity-dot-3" name="状态点" className="absolute left-[24px] top-[192px] w-[8px] h-[8px] bg-[#ba7517]" />
        <Text designId="activity-3" name="动态 3" className="absolute left-[44px] top-[184px] w-[260px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">「移动端重构」延期 2 天</Text>
        <Text designId="activity-time-3" name="时间 3" className="absolute left-[44px] top-[208px] w-[200px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">今天 09:20</Text>
        <Rect designId="activity-divider" name="分隔线" className="absolute left-[24px] top-[248px] w-[304px] h-[1px] bg-[#eef0f3]" />
        <Text designId="activity-more" name="更多" className="absolute left-[24px] top-[268px] w-[160px] h-[22px] text-[13px] leading-[22px] text-[#356af0]">查看全部动态</Text>
      </Frame>

      <Text designId="footer" name="页脚" className="absolute left-[280px] top-[728px] w-[400px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">数据更新于 2026-11-06 09:30</Text>
    </Frame>
  </Page>
);
