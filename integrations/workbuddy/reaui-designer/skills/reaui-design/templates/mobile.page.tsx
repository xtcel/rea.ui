import { Page, Frame, Rect, Ellipse, Text } from '@rea/design';

// 布局骨架：生成业务页面时，评估把重复字段和记录抽取到组件目录。
export default (
  <Page id="main" designId="page-root" name="消息">
    <Frame designId="mobile" name="移动画板" className="absolute left-0 top-0 w-[390px] h-[844px] bg-white">
      <Frame designId="message-header" name="消息标题栏" className="absolute left-[0px] top-[0px] w-[390px] h-[56px]">
<Rect designId="header" name="标题栏" className="absolute left-[0px] top-[0px] w-[390px] h-[56px] bg-white border-b border-[#e5e7eb]" />
<Text designId="header-title" name="标题" className="absolute left-[20px] top-[18px] w-[160px] h-[24px] text-[17px] leading-[24px] font-medium text-[#30343b]">消息</Text>
<Ellipse designId="header-avatar" name="头像" className="absolute left-[338px] top-[14px] w-[28px] h-[28px] bg-[#dbe4f7]" />
</Frame>

      <Frame designId="message-search" name="会话搜索框" className="absolute left-[20px] top-[72px] w-[350px] h-[36px]">
<Rect designId="search" name="搜索框" className="absolute left-[0px] top-[0px] w-[350px] h-[36px] bg-[#f6f7f9] rounded-lg" />
<Text designId="search-label" name="搜索提示" className="absolute left-[16px] top-[9px] w-[240px] h-[18px] text-[12px] leading-[18px] text-[#8a929e]">搜索会话或成员</Text>
</Frame>

      <Frame designId="conversation-list" name="会话列表" className="absolute left-[20px] top-[128px] w-[350px] h-[392px]">
<Frame designId="item-1" name="会话 1" className="absolute left-[0px] top-[0px] w-[350px] h-[72px]">
        <Ellipse designId="item-1-avatar" name="头像" className="absolute left-0 top-[14px] w-[44px] h-[44px] bg-[#dbe4f7]" />
        <Text designId="item-1-name" name="名称" className="absolute left-[56px] top-[14px] w-[200px] h-[22px] text-[14px] leading-[22px] font-medium text-[#30343b]">林晓</Text>
        <Text designId="item-1-text" name="摘要" className="absolute left-[56px] top-[38px] w-[240px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">品牌改版的评审稿已更新</Text>
        <Text designId="item-1-time" name="时间" className="absolute left-[300px] top-[14px] w-[50px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">09:20</Text>
        <Ellipse designId="item-1-unread" name="未读" className="absolute left-[340px] top-[40px] w-[8px] h-[8px] bg-[#356af0]" />
      </Frame>
<Frame designId="item-2" name="会话 2" className="absolute left-[0px] top-[80px] w-[350px] h-[72px]">
        <Ellipse designId="item-2-avatar" name="头像" className="absolute left-0 top-[14px] w-[44px] h-[44px] bg-[#e6f1fb]" />
        <Text designId="item-2-name" name="名称" className="absolute left-[56px] top-[14px] w-[200px] h-[22px] text-[14px] leading-[22px] font-medium text-[#30343b]">陈墨</Text>
        <Text designId="item-2-text" name="摘要" className="absolute left-[56px] top-[38px] w-[240px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">移动端重构需要延期两天</Text>
        <Text designId="item-2-time" name="时间" className="absolute left-[300px] top-[14px] w-[50px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">昨天</Text>
      </Frame>
<Frame designId="item-3" name="会话 3" className="absolute left-[0px] top-[160px] w-[350px] h-[72px]">
        <Ellipse designId="item-3-avatar" name="头像" className="absolute left-0 top-[14px] w-[44px] h-[44px] bg-[#eaf3de]" />
        <Text designId="item-3-name" name="名称" className="absolute left-[56px] top-[14px] w-[200px] h-[22px] text-[14px] leading-[22px] font-medium text-[#30343b]">产品设计组</Text>
        <Text designId="item-3-text" name="摘要" className="absolute left-[56px] top-[38px] w-[240px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">周宁：数据看板 2.0 已提测</Text>
        <Text designId="item-3-time" name="时间" className="absolute left-[300px] top-[14px] w-[50px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">周二</Text>
        <Ellipse designId="item-3-unread" name="未读" className="absolute left-[340px] top-[40px] w-[8px] h-[8px] bg-[#356af0]" />
      </Frame>
<Frame designId="item-4" name="会话 4" className="absolute left-[0px] top-[240px] w-[350px] h-[72px]">
        <Ellipse designId="item-4-avatar" name="头像" className="absolute left-0 top-[14px] w-[44px] h-[44px] bg-[#fbeaf0]" />
        <Text designId="item-4-name" name="名称" className="absolute left-[56px] top-[14px] w-[200px] h-[22px] text-[14px] leading-[22px] font-medium text-[#30343b]">徐可</Text>
        <Text designId="item-4-text" name="摘要" className="absolute left-[56px] top-[38px] w-[240px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">官网文案已经按意见改好了</Text>
        <Text designId="item-4-time" name="时间" className="absolute left-[300px] top-[14px] w-[50px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">周一</Text>
      </Frame>
<Frame designId="item-5" name="会话 5" className="absolute left-[0px] top-[320px] w-[350px] h-[72px]">
        <Ellipse designId="item-5-avatar" name="头像" className="absolute left-0 top-[14px] w-[44px] h-[44px] bg-[#faeeda]" />
        <Text designId="item-5-name" name="名称" className="absolute left-[56px] top-[14px] w-[200px] h-[22px] text-[14px] leading-[22px] font-medium text-[#30343b]">系统通知</Text>
        <Text designId="item-5-text" name="摘要" className="absolute left-[56px] top-[38px] w-[260px] h-[20px] text-[12px] leading-[20px] text-[#656d79]">你有 7 项任务即将逾期</Text>
        <Text designId="item-5-time" name="时间" className="absolute left-[300px] top-[14px] w-[50px] h-[18px] text-[11px] leading-[18px] text-[#8a929e]">周一</Text>
      </Frame>
</Frame>

      <Frame designId="bottom-navigation" name="底部导航区域" className="absolute left-[0px] top-[780px] w-[390px] h-[64px]">
<Rect designId="tabbar" name="底部导航" className="absolute left-[0px] top-[0px] w-[390px] h-[64px] bg-white border-t border-[#e5e7eb]" />
<Text designId="tab-1" name="工作台" className="absolute left-[38px] top-[20px] w-[60px] h-[20px] text-[11px] leading-[20px] text-[#8a929e]">工作台</Text>
<Text designId="tab-2" name="项目" className="absolute left-[124px] top-[20px] w-[40px] h-[20px] text-[11px] leading-[20px] text-[#8a929e]">项目</Text>
<Text designId="tab-3" name="消息" className="absolute left-[204px] top-[20px] w-[40px] h-[20px] text-[11px] leading-[20px] text-[#356af0]">消息</Text>
<Text designId="tab-4" name="我的" className="absolute left-[292px] top-[20px] w-[40px] h-[20px] text-[11px] leading-[20px] text-[#8a929e]">我的</Text>
</Frame>
    </Frame>
  </Page>
);
