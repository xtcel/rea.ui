import { Page, Frame, Rect, Ellipse, Text } from '@rea/design';

export default (
  <Page id="main" designId="page-main" name="画板" className="bg-slate-100">
    {/* 桌面端画框 */}
    <Frame designId="frame-desktop" name="桌面端 (960×640)" className="absolute left-0 top-0 w-[960px] h-[640px] bg-white rounded-lg shadow-sm">
      <Text designId="title-main" name="标题" className="absolute left-16 top-16 text-3xl font-bold text-slate-900">
        REA UI 设计系统
      </Text>
      <Text designId="subtitle-main" name="说明" className="absolute left-16 top-28 text-base text-slate-500">
        基于 React + Tailwind CSS 的单源设计编辑器。
      </Text>
      <Rect designId="card-rect" name="卡片矩形" className="absolute left-16 top-44 w-72 h-48 bg-blue-500 rounded-xl" />
      <Ellipse designId="avatar-ellipse" name="圆形头像" className="absolute left-96 top-44 w-32 h-32 bg-emerald-400" />
    </Frame>

    {/* 移动端画框 */}
    <Frame designId="frame-mobile" name="移动端 (375×667)" className="absolute left-[1024px] top-0 w-[375px] h-[667px] bg-white rounded-lg shadow-sm">
      <Text designId="m-title" name="移动标题" className="absolute left-6 top-12 text-xl font-bold text-slate-800">
        移动端预览
      </Text>
      <Rect designId="m-banner" name="横幅" className="absolute left-6 top-24 w-[327px] h-36 bg-indigo-500 rounded-lg" />
    </Frame>
  </Page>
);
