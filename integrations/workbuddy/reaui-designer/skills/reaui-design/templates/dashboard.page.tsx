import { Page, Frame, Text, Vector, Instance } from '@rea/design';

export default <Page id="main" designId="page-root" name="工作台">
  <Frame designId="desktop-artboard" name="研发工作台" className="absolute left-0 top-0 w-[1440px] h-[1024px] bg-[#f5f7fb] font-sans">
    <Frame designId="sidebar" name="侧边栏" className="absolute left-0 top-0 w-[240px] h-[1024px] border-r border-[#e1e7ef] bg-white">
      <Frame designId="brand" name="品牌区域" className="absolute left-[24px] top-[28px] w-[192px] h-[36px]">
        <Vector designId="compound-icon" name="研发镂空图标" viewBox="0 0 24 24" path={{closed:true,anchors:[{id:'outer-top',x:12,y:2,in:[-5.52285,0],out:[5.52285,0]},{id:'outer-right',x:22,y:12,in:[0,-5.52285],out:[0,5.52285]},{id:'outer-bottom',x:12,y:22,in:[5.52285,0],out:[-5.52285,0]},{id:'outer-left',x:2,y:12,in:[0,5.52285],out:[0,-5.52285]}],contours:[{closed:true,anchors:[{id:'inner-top',x:12,y:8,in:[-2.20914,0],out:[2.20914,0]},{id:'inner-right',x:16,y:12,in:[0,-2.20914],out:[0,2.20914]},{id:'inner-bottom',x:12,y:16,in:[2.20914,0],out:[-2.20914,0]},{id:'inner-left',x:8,y:12,in:[0,2.20914],out:[0,-2.20914]}]}]}} className="absolute left-0 top-[4px] w-[28px] h-[28px] fill-[#356af0] [fill-rule:evenodd]" />
        <Text designId="brand-name" name="品牌名称" className="absolute left-[40px] top-0 w-[152px] h-[36px] text-[20px] leading-[36px] font-semibold text-[#1b2b43]">REA Research</Text>
      </Frame>
      <Frame designId="primary-navigation" name="主导航" className="absolute left-[24px] top-[112px] w-[192px] h-[208px]">
        <Instance designId="nav-home" name="工作台导航" component="navigation-item" values={{label:'工作台'}} variant={{state:'active'}} className="absolute left-0 top-0" />
        <Instance designId="nav-projects" name="项目导航" component="navigation-item" values={{label:'研发项目'}} variant={{state:'default'}} className="absolute left-0 top-[52px]" />
        <Instance designId="nav-experiments" name="实验导航" component="navigation-item" values={{label:'实验记录'}} variant={{state:'default'}} className="absolute left-0 top-[104px]" />
        <Instance designId="nav-library" name="知识库导航" component="navigation-item" values={{label:'团队知识库'}} variant={{state:'default'}} className="absolute left-0 top-[156px]" />
      </Frame>
      <Text designId="sidebar-note" name="团队空间说明" className="absolute left-[40px] top-[952px] w-[176px] h-[24px] text-[12px] leading-[24px] text-[#7d889a]">研发一组 · 12 位成员</Text>
    </Frame>
    <Frame designId="topbar" name="顶部栏" className="absolute left-[240px] top-0 w-[1200px] h-[80px] border-b border-[#e1e7ef] bg-white">
      <Text designId="current-location" name="当前位置" className="absolute left-[40px] top-[28px] w-[260px] h-[24px] text-[14px] leading-[24px] text-[#526073]">团队空间 / 工作台</Text>
      <Frame designId="search-field" name="搜索框" className="absolute left-[720px] top-[20px] w-[320px] h-[40px] rounded-lg bg-[#f5f7fb]">
        <Vector designId="search-icon" name="搜索图标" viewBox="0 0 24 24" d="M15 8 A7 7 0 1 1 1 8 A7 7 0 1 1 15 8 M13 13 L21 21" className="absolute left-[14px] top-[12px] w-[16px] h-[16px] fill-none stroke-[#7d889a] stroke-[1.5px]" />
        <Text designId="search-placeholder" name="搜索提示" className="absolute left-[42px] top-[10px] w-[260px] h-[20px] text-[12px] leading-[20px] text-[#7d889a]">搜索项目、实验或文档</Text>
      </Frame>
      <Text designId="user-name" name="用户名称" className="absolute left-[1080px] top-[28px] w-[80px] h-[24px] text-[14px] leading-[24px] text-[#26364c]">林晓</Text>
    </Frame>
    <Frame designId="main-content" name="首页内容" className="absolute left-[280px] top-[112px] w-[1120px] h-[864px]">
      <Frame designId="welcome" name="欢迎区域" className="absolute left-0 top-0 w-[1120px] h-[76px]">
        <Text designId="welcome-title" name="欢迎标题" className="absolute left-0 top-0 w-[700px] h-[40px] text-[28px] leading-[40px] font-semibold text-[#1b2b43]">早上好，林晓</Text>
        <Text designId="welcome-description" name="欢迎说明" className="absolute left-0 top-[48px] w-[700px] h-[22px] text-[14px] leading-[22px] text-[#69758a]">把每一次发现，变成团队的下一步。</Text>
      </Frame>
      <Frame designId="research-overview" name="研发概览" className="absolute left-0 top-[108px] w-[1120px] h-[140px]">
        <Instance designId="metric-projects" name="进行中项目统计" component="metric-card" values={{label:'进行中项目',value:'18',detail:'本周新增 3 个项目'}} className="absolute left-0 top-0" />
        <Instance designId="metric-experiments" name="实验记录统计" component="metric-card" values={{label:'实验记录',value:'246',detail:'本周完成 24 次实验'}} className="absolute left-[284px] top-0" />
        <Instance designId="metric-todos" name="待办事项统计" component="metric-card" values={{label:'我的待办',value:'7',detail:'其中 2 项需要今天处理'}} className="absolute left-[568px] top-0" />
        <Instance designId="metric-knowledge" name="知识文档统计" component="metric-card" values={{label:'团队知识',value:'89',detail:'本周沉淀 6 篇文档'}} className="absolute left-[852px] top-0" />
      </Frame>
      <Frame designId="two-column-content" name="双栏内容区" className="absolute left-0 top-[280px] w-[1120px] h-[476px]">
        <Frame designId="experiment-panel" name="实验动态" className="absolute left-0 top-0 w-[648px] h-[400px] rounded-xl border border-[#e1e7ef] bg-white">
          <Instance designId="experiment-heading" name="实验动态标题" component="panel-heading" values={{title:'实验动态',action:'查看全部'}} className="absolute left-0 top-0" />
          <Frame designId="experiment-list" name="实验记录列表" className="absolute left-0 top-[64px] w-[648px] h-[312px]">
            <Instance designId="experiment-one" name="稳定性实验记录" component="experiment-row" values={{title:'新材料稳定性验证',code:'EXP-2026-024 · 今天 09:20',status:'已完成'}} variant={{state:'complete'}} className="absolute left-0 top-0" />
            <Instance designId="experiment-two" name="性能实验记录" component="experiment-row" values={{title:'高温环境性能测试',code:'EXP-2026-023 · 昨天 16:40',status:'进行中'}} variant={{state:'pending'}} className="absolute left-0 top-[78px]" />
            <Instance designId="experiment-three" name="配方实验记录" component="experiment-row" values={{title:'配方优化对照实验',code:'EXP-2026-022 · 昨天 14:10',status:'已完成'}} variant={{state:'complete'}} className="absolute left-0 top-[156px]" />
            <Instance designId="experiment-four" name="寿命实验记录" component="experiment-row" values={{title:'样品寿命周期分析',code:'EXP-2026-021 · 周一 11:30',status:'进行中'}} variant={{state:'pending'}} className="absolute left-0 top-[234px]" />
          </Frame>
        </Frame>
        <Frame designId="quick-panel" name="快捷开始" className="absolute left-[680px] top-0 w-[440px] h-[400px] rounded-xl border border-[#e1e7ef] bg-white">
          <Text designId="quick-panel-title" name="快捷开始标题" className="absolute left-[24px] top-[22px] w-[300px] h-[24px] text-[16px] leading-[24px] font-semibold text-[#26364c]">快捷开始</Text>
          <Instance designId="quick-experiment" name="新建实验入口" component="quick-entry" values={{title:'新建实验',detail:'记录新的研发发现'}} className="absolute left-[24px] top-[72px] w-[392px]" />
          <Instance designId="quick-project" name="创建项目入口" component="quick-entry" values={{title:'创建项目',detail:'和团队一起推进新的想法'}} className="absolute left-[24px] top-[172px] w-[392px]" />
          <Instance designId="quick-document" name="知识沉淀入口" component="quick-entry" values={{title:'沉淀知识',detail:'让经验成为可复用的团队资产'}} className="absolute left-[24px] top-[272px] w-[392px]" />
        </Frame>
      </Frame>
      <Text designId="workbench-note" name="工作台说明" className="absolute left-0 top-[796px] w-[1120px] h-[24px] text-[12px] leading-[24px] text-[#7d889a]">布局分组、组件参数与独立矢量图标均可在图层树中继续编辑。</Text>
    </Frame>
  </Frame>
</Page>;
