import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';

export default (
<Page id="template-editor" designId="page-root" name="流程模板编辑">
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
    <Text designId="breadcrumb" name="breadcrumb" className="absolute left-[264px] top-[17px] w-[560px] h-[28px] text-[13px] leading-[28px] text-[var(--rea-ds-color-muted)]">工作区  /  流程模板 / T20–T30</Text>
    <Rect designId="global-search" name="global-search" className="absolute left-[1004px] top-[13px] w-[244px] h-[38px] bg-[var(--rea-ds-color-subtle)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="global-search-text" name="global-search-text" className="absolute left-[1020px] top-[20px] w-[210px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-muted)]">搜索项目、文件或节点</Text>
    <Text designId="header-time" name="header-time" className="absolute left-[1260px] top-[18px] w-[168px] h-[26px] text-[11px] leading-[26px] text-[var(--rea-ds-color-muted)]">示例数据 · 最近同步 09:42</Text>
    <Text designId="template-title" name="template-title" className="absolute left-[264px] top-[88px] w-[700px] h-[42px] text-[27px] leading-[42px] text-[var(--rea-ds-color-text)] font-semibold">T20–T30 进度模板</Text>
    <Text designId="template-sub" name="template-sub" className="absolute left-[264px] top-[132px] w-[700px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-muted)]">草稿 v3 · 未试算 · 当前发布版本 v2</Text>
    <Rect designId="template-save-bg" name="template-save-bg" className="absolute left-[1055px] top-[98px] w-[108px] h-[36px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-save-text" name="template-save-text" className="absolute left-[1067px] top-[103px] w-[84px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium text-center">保存草稿</Text>
    <Rect designId="template-preview-bg" name="template-preview-bg" className="absolute left-[1175px] top-[98px] w-[90px] h-[36px] bg-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-preview-text" name="template-preview-text" className="absolute left-[1187px] top-[103px] w-[66px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-on-primary)] font-medium text-center">试算</Text>
    <Rect designId="template-publish-bg" name="template-publish-bg" className="absolute left-[1277px] top-[98px] w-[131px] h-[36px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-publish-text" name="template-publish-text" className="absolute left-[1289px] top-[103px] w-[107px] h-[26px] text-[13px] leading-[26px] text-[var(--rea-ds-color-muted)] font-medium text-center">发布版本</Text>
    <Rect designId="template-toolbar" name="template-toolbar" className="absolute left-[264px] top-[183px] w-[1144px] h-[46px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-tool-add" name="template-tool-add" className="absolute left-[282px] top-[194px] w-[140px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)] font-medium">＋ 添加节点</Text>
    <Text designId="template-tool-undo" name="template-tool-undo" className="absolute left-[448px] top-[194px] w-[62px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-muted)]">撤销</Text>
    <Text designId="template-tool-redo" name="template-tool-redo" className="absolute left-[533px] top-[194px] w-[62px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-muted)]">重做</Text>
    <Text designId="template-tool-layout" name="template-tool-layout" className="absolute left-[628px] top-[194px] w-[100px] h-[25px] text-[13px] leading-[25px] text-[var(--rea-ds-color-text)]">自动布局</Text>
    <Text designId="template-tool-validate" name="template-tool-validate" className="absolute left-[1224px] top-[194px] w-[160px] h-[25px] text-[12px] leading-[25px] text-[var(--rea-ds-color-done)] font-medium">图校验通过</Text>
    <Rect designId="template-canvas" name="template-canvas" className="absolute left-[264px] top-[246px] w-[779px] h-[586px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="template-lane-1" name="template-lane-1" className="absolute left-[282px] top-[271px] w-[110px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)] font-semibold">工艺</Text>
    <Text designId="template-lane-2" name="template-lane-2" className="absolute left-[282px] top-[443px] w-[110px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)] font-semibold">结构</Text>
    <Text designId="template-lane-3" name="template-lane-3" className="absolute left-[282px] top-[615px] w-[110px] h-[22px] text-[12px] leading-[22px] text-[var(--rea-ds-color-muted)] font-semibold">电气</Text>
    <Rect designId="template-lane-line-1" name="template-lane-line-1" className="absolute left-[282px] top-[412px] w-[742px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="template-lane-line-2" name="template-lane-line-2" className="absolute left-[282px] top-[584px] w-[742px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Rect designId="template-node-0" name="template-node-0" className="absolute left-[332px] top-[326px] w-[208px] h-[58px] bg-[var(--rea-ds-color-selected)] border border-[var(--rea-ds-color-primary)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-node-0-text" name="template-node-0-text" className="absolute left-[345px] top-[343px] w-[184px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">T21 · 工艺设计包 A</Text>
    <Rect designId="template-node-1" name="template-node-1" className="absolute left-[618px] top-[326px] w-[208px] h-[58px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-node-1-text" name="template-node-1-text" className="absolute left-[631px] top-[343px] w-[184px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">T25 · 工艺设计包 B</Text>
    <Rect designId="template-node-2" name="template-node-2" className="absolute left-[332px] top-[498px] w-[208px] h-[58px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-node-2-text" name="template-node-2-text" className="absolute left-[345px] top-[515px] w-[184px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">T22 · 三维模型建立</Text>
    <Rect designId="template-node-3" name="template-node-3" className="absolute left-[618px] top-[498px] w-[208px] h-[58px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-node-3-text" name="template-node-3-text" className="absolute left-[631px] top-[515px] w-[184px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">T23–24 · 结构 BOM</Text>
    <Rect designId="template-node-4" name="template-node-4" className="absolute left-[332px] top-[670px] w-[208px] h-[58px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-node-4-text" name="template-node-4-text" className="absolute left-[345px] top-[687px] w-[184px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">T26 · 电气及 IO 配置</Text>
    <Rect designId="template-node-5" name="template-node-5" className="absolute left-[618px] top-[670px] w-[208px] h-[58px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-md)]" />
    <Text designId="template-node-5-text" name="template-node-5-text" className="absolute left-[631px] top-[687px] w-[184px] h-[26px] text-[12px] leading-[26px] text-[var(--rea-ds-color-text)] font-medium">T27 · 模拟测试</Text>
    <Rect designId="template-edge-0" name="template-edge-0" className="absolute left-[540px] top-[354px] w-[78px] h-[2px] bg-[var(--rea-ds-color-line)]" />
    <Rect designId="template-edge-1" name="template-edge-1" className="absolute left-[540px] top-[526px] w-[78px] h-[2px] bg-[var(--rea-ds-color-line)]" />
    <Rect designId="template-edge-2" name="template-edge-2" className="absolute left-[540px] top-[698px] w-[78px] h-[2px] bg-[var(--rea-ds-color-line)]" />
    <Rect designId="template-inspector" name="template-inspector" className="absolute left-[1061px] top-[246px] w-[347px] h-[586px] bg-[var(--rea-ds-color-surface)] border border-[var(--rea-ds-color-border)] rounded-[var(--rea-ds-radius-lg)]" />
    <Text designId="inspector-title" name="inspector-title" className="absolute left-[1081px] top-[269px] w-[300px] h-[28px] text-[17px] leading-[28px] text-[var(--rea-ds-color-text)] font-semibold">T21 · 工艺设计包 A</Text>
    <Text designId="inspector-sub" name="inspector-sub" className="absolute left-[1081px] top-[304px] w-[300px] h-[23px] text-[12px] leading-[23px] text-[var(--rea-ds-color-muted)]">工艺支路 · 自动完成</Text>
    <Rect designId="inspector-rule-1" name="inspector-rule-1" className="absolute left-[1081px] top-[343px] w-[307px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="inspector-rule-title" name="inspector-rule-title" className="absolute left-[1081px] top-[365px] w-[275px] h-[25px] text-[14px] leading-[25px] text-[var(--rea-ds-color-text)] font-semibold">文件匹配规则</Text>
    <Text designId="inspector-rule-logic" name="inspector-rule-logic" className="absolute left-[1081px] top-[401px] w-[280px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-text)]">齐套逻辑   全部满足</Text>
    <Text designId="inspector-rule-version" name="inspector-rule-version" className="absolute left-[1081px] top-[431px] w-[280px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-text)]">版本要求   同一受控版本</Text>
    <Rect designId="inspector-rule-2" name="inspector-rule-2" className="absolute left-[1081px] top-[470px] w-[307px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="inspector-items-title" name="inspector-items-title" className="absolute left-[1081px] top-[491px] w-[280px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-text)] font-semibold">所需文件项  ·  3</Text>
    <Text designId="inspector-item-1" name="inspector-item-1" className="absolute left-[1081px] top-[530px] w-[300px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-text)]">统一版本 P&amp;ID      /07.工艺图文档</Text>
    <Text designId="inspector-item-2" name="inspector-item-2" className="absolute left-[1081px] top-[563px] w-[300px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-text)]">工艺 BOM            /04.工艺物料</Text>
    <Text designId="inspector-item-3" name="inspector-item-3" className="absolute left-[1081px] top-[596px] w-[300px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-text)]">设备参数表          /07.工艺图文档</Text>
    <Text designId="inspector-add" name="inspector-add" className="absolute left-[1081px] top-[639px] w-[250px] h-[24px] text-[13px] leading-[24px] text-[var(--rea-ds-color-primary)] font-medium">＋ 添加文件项</Text>
    <Rect designId="inspector-rule-3" name="inspector-rule-3" className="absolute left-[1081px] top-[682px] w-[307px] h-[1px] bg-[var(--rea-ds-color-border)]" />
    <Text designId="inspector-warning" name="inspector-warning" className="absolute left-[1081px] top-[707px] w-[292px] h-[24px] text-[12px] leading-[24px] text-[var(--rea-ds-color-warning)]">发布前必须先对真实项目试算。</Text>
  </Frame>
</Page>
);
