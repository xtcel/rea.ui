import { Page, Frame, Rect, Ellipse, Text } from '@rea/design';

export default (
  <Page id="main" designId="page-root" name="项目列表">
    <Frame designId="desktop" name="桌面画板" className="absolute left-0 top-0 w-[1280px] h-[900px] bg-[#f6f7f9]">
      <Text designId="page-title" name="页面标题" className="absolute left-[32px] top-[32px] w-[420px] h-[38px] text-[28px] leading-[38px] font-medium text-[#30343b]">项目</Text>
      <Text designId="page-subtitle" name="页面说明" className="absolute left-[32px] top-[74px] w-[520px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">共 128 个项目，其中 18 个正在进行。</Text>
      <Rect designId="secondary-button" name="导出按钮" className="absolute left-[1000px] top-[32px] w-[96px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
      <Text designId="secondary-button-label" name="导出" className="absolute left-[1030px] top-[42px] w-[40px] h-[20px] text-[13px] leading-[20px] text-[#30343b]">导出</Text>
      <Rect designId="primary-button" name="新建按钮" className="absolute left-[1112px] top-[32px] w-[136px] h-[40px] bg-[#356af0] rounded-lg" />
      <Text designId="primary-button-label" name="新建" className="absolute left-[1152px] top-[42px] w-[80px] h-[20px] text-[13px] leading-[20px] text-white">新建项目</Text>

      <Rect designId="search" name="搜索框" className="absolute left-[32px] top-[120px] w-[320px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
      <Text designId="search-label" name="搜索提示" className="absolute left-[48px] top-[130px] w-[240px] h-[20px] text-[13px] leading-[20px] text-[#8a929e]">搜索项目名称</Text>
      <Rect designId="filter-status" name="状态筛选" className="absolute left-[364px] top-[120px] w-[160px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
      <Text designId="filter-status-label" name="状态" className="absolute left-[380px] top-[130px] w-[100px] h-[20px] text-[13px] leading-[20px] text-[#30343b]">全部状态</Text>
      <Rect designId="filter-date" name="日期筛选" className="absolute left-[536px] top-[120px] w-[180px] h-[40px] bg-white border border-[#e5e7eb] rounded-lg" />
      <Text designId="filter-date-label" name="日期" className="absolute left-[552px] top-[130px] w-[120px] h-[20px] text-[13px] leading-[20px] text-[#30343b]">最近 30 天</Text>
      <Text designId="result-count" name="结果数" className="absolute left-[1088px] top-[130px] w-[160px] h-[20px] text-[13px] leading-[20px] text-[#656d79]">共 128 条</Text>

      <Frame designId="table" name="表格" className="absolute left-[32px] top-[184px] w-[1216px] h-[456px] bg-white rounded-xl border border-[#e5e7eb]">
        <Rect designId="table-head" name="表头" className="absolute left-0 top-0 w-[1216px] h-[40px] bg-[#f9fafb]" />
        <Text designId="th-name" name="项目名" className="absolute left-[24px] top-[10px] w-[200px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">项目名称</Text>
        <Text designId="th-owner" name="负责人" className="absolute left-[344px] top-[10px] w-[120px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">负责人</Text>
        <Text designId="th-status" name="状态" className="absolute left-[520px] top-[10px] w-[120px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">状态</Text>
        <Text designId="th-updated" name="更新时间" className="absolute left-[720px] top-[10px] w-[140px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">更新时间</Text>
        <Text designId="th-actions" name="操作" className="absolute left-[1088px] top-[10px] w-[80px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">操作</Text>

        <Frame designId="row-1" name="行 1" className="absolute left-0 top-[40px] w-[1216px] h-[52px] border-b border-[#e5e7eb]">
          <Text designId="row-1-name" name="项目名" className="absolute left-[24px] top-[15px] w-[280px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">品牌改版</Text>
          <Text designId="row-1-owner" name="负责人" className="absolute left-[344px] top-[15px] w-[120px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">林晓</Text>
          <Ellipse designId="row-1-dot" name="状态点" className="absolute left-[520px] top-[22px] w-[6px] h-[6px] bg-[#1d9e75]" />
          <Text designId="row-1-status" name="状态" className="absolute left-[534px] top-[15px] w-[100px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">进行中</Text>
          <Text designId="row-1-updated" name="更新时间" className="absolute left-[720px] top-[15px] w-[160px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">11-06 09:20</Text>
          <Text designId="row-1-action" name="操作" className="absolute left-[1088px] top-[15px] w-[80px] h-[22px] text-[13px] leading-[22px] text-[#356af0]">查看</Text>
        </Frame>
        <Frame designId="row-2" name="行 2" className="absolute left-0 top-[92px] w-[1216px] h-[52px] border-b border-[#e5e7eb]">
          <Text designId="row-2-name" name="项目名" className="absolute left-[24px] top-[15px] w-[280px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">移动端重构</Text>
          <Text designId="row-2-owner" name="负责人" className="absolute left-[344px] top-[15px] w-[120px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">陈墨</Text>
          <Ellipse designId="row-2-dot" name="状态点" className="absolute left-[520px] top-[22px] w-[6px] h-[6px] bg-[#ba7517]" />
          <Text designId="row-2-status" name="状态" className="absolute left-[534px] top-[15px] w-[100px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">有风险</Text>
          <Text designId="row-2-updated" name="更新时间" className="absolute left-[720px] top-[15px] w-[160px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">11-06 08:40</Text>
          <Text designId="row-2-action" name="操作" className="absolute left-[1088px] top-[15px] w-[80px] h-[22px] text-[13px] leading-[22px] text-[#356af0]">查看</Text>
        </Frame>
        <Frame designId="row-3" name="行 3" className="absolute left-0 top-[144px] w-[1216px] h-[52px] border-b border-[#e5e7eb]">
          <Text designId="row-3-name" name="项目名" className="absolute left-[24px] top-[15px] w-[280px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">数据看板 2.0</Text>
          <Text designId="row-3-owner" name="负责人" className="absolute left-[344px] top-[15px] w-[120px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">周宁</Text>
          <Ellipse designId="row-3-dot" name="状态点" className="absolute left-[520px] top-[22px] w-[6px] h-[6px] bg-[#1d9e75]" />
          <Text designId="row-3-status" name="状态" className="absolute left-[534px] top-[15px] w-[100px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">进行中</Text>
          <Text designId="row-3-updated" name="更新时间" className="absolute left-[720px] top-[15px] w-[160px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">11-05 17:10</Text>
          <Text designId="row-3-action" name="操作" className="absolute left-[1088px] top-[15px] w-[80px] h-[22px] text-[13px] leading-[22px] text-[#356af0]">查看</Text>
        </Frame>
        <Frame designId="row-4" name="行 4" className="absolute left-0 top-[196px] w-[1216px] h-[52px] border-b border-[#e5e7eb]">
          <Text designId="row-4-name" name="项目名" className="absolute left-[24px] top-[15px] w-[280px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">官网内容迁移</Text>
          <Text designId="row-4-owner" name="负责人" className="absolute left-[344px] top-[15px] w-[120px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">徐可</Text>
          <Ellipse designId="row-4-dot" name="状态点" className="absolute left-[520px] top-[22px] w-[6px] h-[6px] bg-[#8a929e]" />
          <Text designId="row-4-status" name="状态" className="absolute left-[534px] top-[15px] w-[100px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">已完成</Text>
          <Text designId="row-4-updated" name="更新时间" className="absolute left-[720px] top-[15px] w-[160px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">11-04 16:30</Text>
          <Text designId="row-4-action" name="操作" className="absolute left-[1088px] top-[15px] w-[80px] h-[22px] text-[13px] leading-[22px] text-[#356af0]">查看</Text>
        </Frame>
        <Frame designId="row-5" name="行 5" className="absolute left-0 top-[248px] w-[1216px] h-[52px] border-b border-[#e5e7eb]">
          <Text designId="row-5-name" name="项目名" className="absolute left-[24px] top-[15px] w-[280px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">会员体系调研</Text>
          <Text designId="row-5-owner" name="负责人" className="absolute left-[344px] top-[15px] w-[120px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">林晓</Text>
          <Ellipse designId="row-5-dot" name="状态点" className="absolute left-[520px] top-[22px] w-[6px] h-[6px] bg-[#356af0]" />
          <Text designId="row-5-status" name="状态" className="absolute left-[534px] top-[15px] w-[100px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">待评审</Text>
          <Text designId="row-5-updated" name="更新时间" className="absolute left-[720px] top-[15px] w-[160px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">11-03 11:00</Text>
          <Text designId="row-5-action" name="操作" className="absolute left-[1088px] top-[15px] w-[80px] h-[22px] text-[13px] leading-[22px] text-[#356af0]">查看</Text>
        </Frame>
        <Frame designId="row-6" name="行 6" className="absolute left-0 top-[300px] w-[1216px] h-[52px] border-b border-[#e5e7eb]">
          <Text designId="row-6-name" name="项目名" className="absolute left-[24px] top-[15px] w-[280px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">组件库补齐</Text>
          <Text designId="row-6-owner" name="负责人" className="absolute left-[344px] top-[15px] w-[120px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">陈墨</Text>
          <Ellipse designId="row-6-dot" name="状态点" className="absolute left-[520px] top-[22px] w-[6px] h-[6px] bg-[#1d9e75]" />
          <Text designId="row-6-status" name="状态" className="absolute left-[534px] top-[15px] w-[100px] h-[22px] text-[13px] leading-[22px] text-[#30343b]">进行中</Text>
          <Text designId="row-6-updated" name="更新时间" className="absolute left-[720px] top-[15px] w-[160px] h-[22px] text-[13px] leading-[22px] text-[#656d79]">11-02 14:20</Text>
          <Text designId="row-6-action" name="操作" className="absolute left-[1088px] top-[15px] w-[80px] h-[22px] text-[13px] leading-[22px] text-[#356af0]">查看</Text>
        </Frame>
      </Frame>

      <Text designId="pagination" name="分页" className="absolute left-[1000px] top-[664px] w-[248px] h-[24px] text-[13px] leading-[24px] text-[#656d79]">上一页　1　2　3　…　16　下一页</Text>
    </Frame>
  </Page>
);
