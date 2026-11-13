import { Components, Component, Frame, Text, Instance, Vector } from '@rea/design';

export default <Components>
  <Component id="navigation-item" designId="navigation-definition" name="导航项" parameters={{label:{type:'string',default:'工作台'}}} variants={[{name:'选中',axes:{state:'active'},overrides:{'navigation-content':{styles:{bg:'#e8f0ff'}},'navigation-label':{styles:{'text-color':'#356af0'}}}},{name:'默认',axes:{state:'default'},overrides:{}}]}>
    <Frame designId="navigation-content" name="导航内容" className="relative w-[192px] h-[44px] rounded-lg">
      <Vector designId="navigation-icon" name="导航方框图标" viewBox="0 0 24 24" d="M4 4 H20 V20 H4 Z" className="absolute left-[16px] top-[14px] w-[16px] h-[16px] fill-none stroke-[#7b8798] stroke-[2px]" />
      <Text designId="navigation-label" name="导航名称" binding="label" className="absolute left-[44px] top-[11px] w-[132px] h-[22px] text-[14px] leading-[22px] text-[#526073]" />
    </Frame>
  </Component>
  <Component id="metric-card" designId="metric-definition" name="统计卡片" parameters={{label:{type:'string',default:'实验数量'},value:{type:'string',default:'24'},detail:{type:'string',default:'本周新增 3 项'}}}>
    <Frame designId="metric-content" name="统计内容" className="relative w-[260px] h-[140px] rounded-xl border border-[#e1e7ef] bg-white">
      <Text designId="metric-label" name="统计名称" binding="label" className="absolute left-[24px] top-[20px] w-[212px] h-[22px] text-[13px] leading-[22px] text-[#69758a]" />
      <Text designId="metric-value" name="统计数值" binding="value" className="absolute left-[24px] top-[50px] w-[212px] h-[40px] text-[32px] leading-[40px] font-semibold text-[#1b2b43]" />
      <Text designId="metric-detail" name="统计说明" binding="detail" className="absolute left-[24px] top-[104px] w-[212px] h-[20px] text-[12px] leading-[20px] text-[#69758a]" />
    </Frame>
  </Component>
  <Component id="status-badge" designId="status-definition" name="状态标签" parameters={{label:{type:'string',default:'已完成'}}} variants={[{name:'完成',axes:{state:'complete'},overrides:{}},{name:'进行中',axes:{state:'pending'},overrides:{'status-content':{styles:{bg:'#e8f0ff'}},'status-label':{styles:{'text-color':'#356af0'}}}}]}>
    <Frame designId="status-content" name="标签底色" className="relative w-[76px] h-[26px] rounded-full bg-[#e8f5ee]">
      <Text designId="status-label" name="状态文字" binding="label" className="absolute left-[10px] top-[3px] w-[56px] h-[20px] text-[12px] leading-[20px] text-center text-[#23754f]" />
    </Frame>
  </Component>
  <Component id="experiment-row" designId="experiment-definition" name="实验记录行" parameters={{title:{type:'string',default:'稳定性实验'},code:{type:'string',default:'EXP-2026-001'},status:{type:'string',default:'已完成'}}} variants={[{name:'完成',axes:{state:'complete'},overrides:{}},{name:'进行中',axes:{state:'pending'},overrides:{'experiment-status':{props:{variant:{state:'pending'}}}}}]}>
    <Frame designId="experiment-content" name="记录内容" className="relative w-[648px] h-[78px] border-b border-[#edf0f5]">
      <Frame designId="experiment-symbol" name="实验图标" className="absolute left-[24px] top-[21px] w-[36px] h-[36px] rounded-lg bg-[#f0f4fc]">
        <Vector designId="experiment-path" name="试管轮廓" viewBox="0 0 24 24" d="M8 3 H16 M10 3 V10 L5 19 Q5 21 8 21 H16 Q19 21 19 19 L14 10 V3 M8 14 H16" className="absolute left-[8px] top-[8px] w-[20px] h-[20px] fill-none stroke-[#356af0] stroke-[1.5px]" />
      </Frame>
      <Frame designId="experiment-description" name="实验说明" className="absolute left-[76px] top-[17px] w-[420px] h-[46px]">
        <Text designId="experiment-title" name="实验名称" binding="title" className="absolute left-0 top-0 w-[420px] h-[22px] text-[14px] leading-[22px] text-[#26364c]" />
        <Text designId="experiment-code" name="实验编号" binding="code" className="absolute left-0 top-[26px] w-[420px] h-[18px] text-[12px] leading-[18px] text-[#7d889a]" />
      </Frame>
      <Instance designId="experiment-status" name="实验状态" component="status-badge" bindings={{'value:label':'status'}} className="absolute left-[548px] top-[26px]" />
    </Frame>
  </Component>
  <Component id="panel-heading" designId="heading-definition" name="面板标题" parameters={{title:{type:'string',default:'实验动态'},action:{type:'string',default:'查看全部'}}}>
    <Frame designId="heading-content" name="标题内容" className="relative w-[648px] h-[64px]">
      <Text designId="heading-title" name="面板名称" binding="title" className="absolute left-[24px] top-[22px] w-[420px] h-[24px] text-[16px] leading-[24px] font-semibold text-[#26364c]" />
      <Text designId="heading-action" name="面板操作" binding="action" className="absolute left-[548px] top-[24px] w-[76px] h-[20px] text-[12px] leading-[20px] text-right text-[#356af0]" />
    </Frame>
  </Component>
  <Component id="quick-entry" designId="quick-definition" name="快捷入口" parameters={{title:{type:'string',default:'新建实验'},detail:{type:'string',default:'记录新的研发发现'}}}>
    <Frame designId="quick-content" name="入口内容" className="relative w-[300px] h-[84px] rounded-lg bg-[#f5f7fb]">
      <Text designId="quick-title" name="入口名称" binding="title" className="absolute left-[16px] top-[16px] w-[268px] h-[24px] text-[14px] leading-[24px] font-medium text-[#26364c]" />
      <Text designId="quick-detail" name="入口说明" binding="detail" className="absolute left-[16px] top-[46px] w-[268px] h-[20px] text-[12px] leading-[20px] text-[#69758a]" />
    </Frame>
  </Component>
</Components>;
