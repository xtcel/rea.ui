"""Generate static ReaUI page sources for the PLViews desktop design."""

from html import escape
from pathlib import Path

OUT = Path('/private/tmp/plviews-reaui-pages')
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1440, 900


def c(name):
    out = []
    for char in name:
        if char.isupper():
            out.extend(['-', char.lower()])
        else:
            out.append(char)
    return 'var(--rea-ds-color-' + ''.join(out) + ')'


def rect(id, x, y, w, h, bg='surface', border=None, radius=0, extra=''):
    cls = f'absolute left-[{x}px] top-[{y}px] w-[{w}px] h-[{h}px] bg-[{c(bg)}]'
    if border:
        cls += f' border border-[{c(border)}]'
    if radius:
        cls += f' rounded-[var(--rea-ds-radius-{radius})]'
    if extra:
        cls += f' {extra}'
    return f'<Rect designId="{id}" name="{id}" className="{cls}" />'


def txt(id, value, x, y, w, h, size=14, color='text', weight='normal', extra=''):
    cls = f'absolute left-[{x}px] top-[{y}px] w-[{w}px] h-[{h}px] text-[{size}px] leading-[{h}px] text-[{c(color)}]'
    if weight != 'normal':
        cls += f' font-{weight}'
    if extra:
        cls += f' {extra}'
    return f'<Text designId="{id}" name="{id}" className="{cls}">{escape(value)}</Text>'


def ellipse(id, x, y, d, bg):
    return f'<Ellipse designId="{id}" name="{id}" className="absolute left-[{x}px] top-[{y}px] w-[{d}px] h-[{d}px] bg-[{c(bg)}] rounded-full" />'


def tag(id, label, x, y, w, kind):
    return [rect(id+'-bg', x, y, w, 26, kind+'Bg', radius='sm'),
            txt(id+'-text', label, x+8, y+2, w-16, 22, 12, kind, 'medium')]


def button(id, label, x, y, w=104, primary=False, disabled=False):
    bg = 'primary' if primary else 'surface'
    fg = 'onPrimary' if primary else ('muted' if disabled else 'text')
    return [rect(id+'-bg', x, y, w, 36, bg, None if primary else 'border', 'md'),
            txt(id+'-text', label, x+12, y+5, w-24, 26, 13, fg, 'medium', 'text-center')]


NAV = [
    ('总览看板', 'dashboard'), ('单项目进度', 'project'), ('文件明细', 'files'),
    ('流程模板', 'template'), ('数据源', 'datasource'), ('组织与权限', 'admin')
]


def shell(active, crumb):
    a = [rect('sidebar', 0, 0, 232, 900, 'sidebar'), rect('sidebar-divider', 231, 0, 1, 900, 'border'),
         rect('brand-mark', 22, 22, 28, 28, 'primary', radius='md'),
         txt('brand-letter', 'P', 30, 24, 16, 22, 16, 'onPrimary', 'bold'),
         txt('brand-title', 'PLViews', 60, 19, 145, 28, 20, 'text', 'semibold'),
         txt('brand-caption', 'PLM 进度视图', 60, 46, 140, 18, 11, 'muted'),
         txt('workspace-label', '工作区', 22, 92, 150, 18, 11, 'muted', 'semibold')]
    for i, (label, key) in enumerate(NAV):
        y = 126+i*44
        if key == active:
            a.append(rect(f'nav-{key}-active', 12, y-3, 208, 38, 'selected', radius='md'))
            a.append(rect(f'nav-{key}-mark', 12, y+5, 3, 22, 'primary', radius='sm'))
        a.append(txt(f'nav-{key}', label, 28, y+4, 182, 24, 14, 'primary' if key == active else 'text', 'semibold' if key == active else 'normal'))
    a += [txt('future-label', '规划中', 22, 412, 150, 18, 11, 'muted', 'semibold'),
          txt('future-task', '任务   ·   即将上线', 28, 446, 180, 24, 13, 'muted'),
          txt('future-gantt', '甘特图   ·   即将上线', 28, 488, 180, 24, 13, 'muted'),
          rect('sidebar-footer-line', 18, 830, 196, 1, 'border'),
          ellipse('user-avatar', 22, 848, 30, 'primary'),
          txt('user-avatar-letter', '林', 30, 852, 16, 22, 13, 'onPrimary', 'medium'),
          txt('user-name', '林项目经理', 62, 846, 135, 22, 13, 'text', 'medium'),
          txt('user-role', '项目经理', 62, 868, 135, 18, 11, 'muted'),
          rect('topbar', 232, 0, 1208, 64, 'header'),
          rect('topbar-line', 232, 63, 1208, 1, 'border'),
          txt('breadcrumb', '工作区  /  '+crumb, 264, 17, 560, 28, 13, 'muted'),
          rect('global-search', 1004, 13, 244, 38, 'subtle', 'border', 'md'),
          txt('global-search-text', '搜索项目、文件或节点', 1020, 20, 210, 24, 12, 'muted'),
          txt('header-time', '示例数据 · 最近同步 09:42', 1260, 18, 168, 26, 11, 'muted')]
    return a


def finish(pageid, name, a):
    if len(a) > 80:
        raise ValueError(f'{pageid}: {len(a)} layers')
    source = "import { Page, Frame, Rect, Text, Ellipse } from '@rea/design';\n\n"
    source += f'<Page id="{pageid}" designId="page-root" name="{name}">\n'
    source += f'  <Frame designId="desktop-artboard" name="桌面画板" className="absolute left-0 top-0 w-[{W}px] h-[{H}px] bg-[{c("background")}]">\n'
    source += '\n'.join('    '+item for item in a)
    source += '\n  </Frame>\n</Page>\n'
    source = source.replace('<Page id=', 'export default (\n<Page id=', 1).rstrip() + '\n);\n'
    (OUT / f'{pageid}.page.tsx').write_text(source, encoding='utf-8')
    print(pageid, name, len(a))


def design_system():
    a = [rect('ds-background',0,0,W,H,'background'),
         txt('ds-title','PLViews 设计系统',48,36,800,42,30,'text','semibold'),
         txt('ds-subtitle','桌面端 · 浅色主稿  /  深色扩展 · 以信息判定为中心',48,86,960,24,14,'muted'),
         rect('ds-rule',48,126,1344,1,'border'),
         txt('ds-colors-title','基础色',48,158,500,30,20,'text','semibold'),
         txt('ds-colors-note','工作区维持低噪声，颜色留给行动和判定状态。',48,191,610,23,13,'muted')]
    swatches=[('primary','主操作'),('background','画布'),('surface','表面'),('text','正文'),('border','分隔'),('selected','选中')]
    for i,(col,label) in enumerate(swatches):
        x=48+i*220
        a += [rect(f'swatch-{col}',x,236,196,84,col,'border' if col in ('surface','background') else None,'md'),
              txt(f'swatch-{col}-label',label,x,331,196,22,13,'text','medium')]
    a += [txt('states-title','判定状态',48,390,460,30,20,'text','semibold'),
          txt('states-note','同一状态始终同色；所有颜色都同时出现文字标签。',48,422,700,22,13,'muted')]
    status=[('done','已完成'),('ready','已齐套待确认'),('missing','文件不齐'),('waiting','待前置'),('abnormal','异常'),('insufficient','数据不足'),('notStarted','未开始')]
    for i,(kind,label) in enumerate(status):
        x=48+(i%4)*330; y=462+(i//4)*52
        a += tag(f'state-{kind.lower()}',label,x,y,172 if i==1 else 128,kind)
    a += [rect('ds-second-rule',48,590,1344,1,'border'),
          txt('type-title','排版与控件',48,620,360,30,20,'text','semibold'),
          txt('type-heading','页面标题  28 / 35',48,666,390,38,28,'text','semibold'),
          txt('type-body','正文  14 / 21    ·    辅助  12 / 18',48,711,430,25,14,'text'),
          txt('type-note','系统字体，8px 间距基数；控件 8px 圆角，面板 12px。',48,747,600,24,13,'muted')]
    a += button('ds-primary','主要操作',686,665,130,True)
    a += button('ds-secondary','次要操作',830,665,130)
    a += [rect('ds-input',686,719,274,38,'surface','border','md'),
          txt('ds-input-hint','例：项目编号 PX-2412',700,726,242,24,13,'muted'),
          rect('ds-dark-preview',1030,629,362,164,'darkSurface','border','lg'),
          txt('ds-dark-label','深色扩展',1054,653,280,25,16,'darkText','semibold'),
          txt('ds-dark-copy','同一布局与状态语义；切换表面、文字与边线令牌。',1054,688,314,46,13,'darkMuted','normal','leading-[23px]'),
          txt('ds-footer','参考：monday.com 的分组工作区、列式信息与状态标签。示例页面使用 PLViews 语义。',48,833,1320,24,12,'muted')]
    finish('design-system','设计系统',a)


def dashboard():
    a=shell('dashboard','项目总览')
    a += [txt('page-title','项目总览',264,91,480,42,28,'text','semibold'),
          txt('page-subtitle','从项目卡点进入判定依据',264,137,470,24,13,'muted')]
    a += button('export','导出视图',1260,96,136)
    a += [rect('summary-panel',264,186,1144,110,'surface','border','lg')]
    for i,(num,label) in enumerate([('18','在管项目'),('9','正常推进'),('5','需要关注'),('4','待确认项目')]):
        x=292+i*274
        a += [txt(f'metric-{i}-number',num,x,207,150,42,30,'text','semibold'),
              txt(f'metric-{i}-label',label,x,254,160,22,12,'muted')]
    a += [rect('filter-search',264,326,300,38,'surface','border','md'),
          txt('filter-search-text','搜索项目名称或编号',280,333,250,23,13,'muted'),
          rect('filter-status',580,326,134,38,'surface','border','md'),
          txt('filter-status-text','全部状态  ⌄',594,333,110,23,13,'text'),
          txt('table-count','共 18 个项目',1282,333,125,23,12,'muted','normal','text-right'),
          rect('table',264,390,1144,426,'surface','border','lg'),
          rect('table-header',265,391,1142,42,'subtle'),
          txt('th-name','项目 / 编号',286,399,285,24,12,'muted','medium'),
          txt('th-progress','节点进度',654,399,148,24,12,'muted','medium'),
          txt('th-completeness','齐套率',822,399,88,24,12,'muted','medium'),
          txt('th-blocker','当前卡点',935,399,180,24,12,'muted','medium'),
          txt('th-exception','异常 / 数据不足',1165,399,190,24,12,'muted','medium')]
    rows=[
        ('PX-2412 高温反应系统','PX-2412','8 / 13','74%','T28 跨专业交底','1 / 2','missing'),
        ('PX-2407 智能配料产线','PX-2407','5 / 12','61%','T23 结构 BOM','2 / 3','abnormal'),
        ('PX-2405 热交换机组','PX-2405','10 / 13','85%','T29 技术条件','0 / 2','ready'),
        ('PX-2402 精馏控制系统','PX-2402','11 / 14','93%','T30 采购下单','0 / 1','done'),
    ]
    for i,(name,code,progress,rate,block,exceptions,kind) in enumerate(rows):
        y=445+i*73
        if i: a.append(rect(f'row-line-{i}',281,y-9,1110,1,'border'))
        a += [txt(f'row-{i}-name',name,286,y,350,23,14,'text','medium'),
              txt(f'row-{i}-progress',progress,654,y+6,140,25,14,'text','semibold'),
              txt(f'row-{i}-rate',rate,822,y+6,84,25,14,'text','medium'),
              txt(f'row-{i}-block',block,935,y+6,202,25,13,'text'),
              txt(f'row-{i}-exceptions',exceptions,1190,y+6,126,25,13,kind,'medium')]
    finish('dashboard','项目总览看板',a)


def project_detail():
    a=shell('project','项目 / PX-2412')
    a += [txt('project-title','PX-2412 高温反应系统',264,88,720,42,27,'text','semibold'),
          txt('project-subtitle','项目进度 8 / 13 个可识别节点 · 齐套率 74% · 数据不足 2',264,133,800,25,13,'muted')]
    a += button('recalculate','重新判定',1268,98,140)
    a += [txt('tab-nodes','节点视图',264,185,104,27,14,'primary','semibold'),
          txt('tab-flow','流程图',382,185,84,27,14,'muted'),
          txt('tab-files','文件记录',486,185,104,27,14,'muted'),
          rect('tab-active-line',264,214,78,3,'primary'),
          rect('tabs-rule',264,218,1144,1,'border'),
          txt('section-title','节点判定',264,247,320,30,19,'text','semibold'),
          txt('section-sub','按专业支路查看；选中节点显示判定依据。',264,282,680,22,12,'muted'),
          rect('node-table',264,322,782,495,'surface','border','lg'),
          rect('node-header',265,323,780,40,'subtle'),
          txt('node-th-name','节点',284,330,320,22,12,'muted','medium'),
          txt('node-th-state','状态',633,330,130,22,12,'muted','medium'),
          txt('node-th-rate','文件齐套',830,330,130,22,12,'muted','medium')]
    groups=[('工艺支路',374),('结构支路',514),('电气支路',654)]
    for j,(label,y) in enumerate(groups):
        a += [txt(f'group-{j}-label',label,284,y+2,300,23,12,'primary','semibold')]
    nodes=[
        ('T21 工艺设计包交接 A','已完成','3 / 3','done',406),
        ('T25 工艺设计包交接 B','文件不齐','2 / 3','missing',458),
        ('T22 三维模型建立','已完成','2 / 2','done',546),
        ('T23 管道图与结构 BOM','已齐套','3 / 3','ready',598),
        ('T26 电气设计及 IO 配置','已完成','4 / 4','done',686),
        ('T27 程序检查与模拟测试','数据不足','—','insufficient',738),
    ]
    for i,(name,state,rate,kind,y) in enumerate(nodes):
        if i==1: a.append(rect('selected-node',266,y-2,778,51,'selected'))
        a += [txt(f'node-{i}-name',name,284,y+8,330,23,13,'text','medium'),
              txt(f'node-{i}-state',state,633,y+8,160,23,12,kind,'medium'),
              txt(f'node-{i}-rate',rate,830,y+8,100,23,13,'text','medium')]
    a += [rect('evidence-panel',1064,322,344,495,'surface','border','lg'),
          txt('evidence-title','T25 · 工艺设计包交接 B',1084,342,300,28,16,'text','semibold'),
          txt('evidence-status','文件不齐 · 已命中 2 / 3',1084,380,290,23,13,'missing','medium'),
          rect('evidence-divider-1',1084,416,304,1,'border'),
          txt('evidence-files-title','所需文件项',1084,434,240,24,13,'text','semibold'),
          txt('evidence-file-1','✓  统一版本 P&ID · R3',1084,472,288,22,12,'done'),
          txt('evidence-file-2','✓  控制逻辑图 · R2',1084,506,288,22,12,'done'),
          txt('evidence-file-3','○  设备参数表 · 缺失',1084,540,288,22,12,'missing','medium'),
          rect('evidence-divider-2',1084,579,304,1,'border'),
          txt('evidence-rule','判定规则 v3 · 快照 09:42',1084,596,290,22,12,'muted'),
          txt('evidence-link','展开判定依据  →',1084,631,260,24,13,'primary','medium'),
          txt('evidence-override','人工修正',1084,762,280,22,13,'primary','medium')]
    finish('project-detail','单项目进度',a)


def project_flow():
    a=shell('project','项目 / PX-2412 / 流程图')
    a += [txt('flow-title','PX-2412 · 流程图',264,87,650,42,27,'text','semibold'),
          txt('flow-subtitle','只读视图 · 三专业并行 → 版本汇总 → T28 齐套点 → 采购',264,132,830,24,13,'muted'),
          txt('flow-tab-flow','流程图',382,183,84,27,14,'primary','semibold'),
          rect('flow-tab-line',382,213,57,3,'primary'), rect('flow-tabs-rule',264,218,1144,1,'border'),
          rect('flow-canvas',264,244,817,584,'surface','border','lg'),
          txt('flow-lane-process','工艺',284,278,90,20,12,'muted','semibold'),
          txt('flow-lane-structure','结构',284,431,90,20,12,'muted','semibold'),
          txt('flow-lane-electrical','电气',284,584,90,20,12,'muted','semibold'),
          rect('flow-lane-line-1',284,405,775,1,'border'),
          rect('flow-lane-line-2',284,558,775,1,'border')]
    nodes=[
        ('T19–20 工艺评审 · 已完成',386,316,'done'),('T21 设计包 A · 已完成',565,316,'done'),('T25 设计包 B · 文件不齐',744,316,'missing'),
        ('T22 模型建立 · 已完成',386,469,'done'),('T22 联合评审 · 已完成',565,469,'done'),('T23–24 结构图 · 已齐套',744,469,'ready'),
        ('T26 电气设计 · 已完成',386,622,'done'),('T26 PLC/HMI · 待前置',565,622,'waiting'),('T27 模拟测试 · 数据不足',744,622,'insufficient'),
        ('T20→28 工艺 · 文件不齐',908,316,'missing'),('T23→28 结构汇总 · 已齐套',908,469,'ready'),('T26→29 电气 · 数据不足',908,622,'insufficient')]
    for i,y in enumerate([340,493,646]):
        a.append(rect(f'edge-{i}',536,y,372,2,'line'))
    for i,(label,x,y,kind) in enumerate(nodes):
        a += [rect(f'flow-node-{i}',x,y,150,50,kind+'Bg',kind,'md','border-dashed' if kind=='insufficient' else ''),
              txt(f'flow-node-{i}-text',label,x+9,y+12,134,26,11,kind,'medium')]
    a += [rect('flow-right',1097,244,311,584,'surface','border','lg'),
          txt('flow-right-title','当前齐套点',1117,268,270,28,17,'text','semibold'),
          txt('flow-right-code','T28 · 设计汇总及跨专业交底',1117,307,275,25,13,'text','medium'),
          txt('flow-right-state','文件不齐 · 2 / 3 专业已齐套',1117,346,275,24,12,'missing','medium'),
          rect('flow-right-rule',1117,386,270,1,'border'),
          txt('flow-right-1','工艺批准版本    缺失',1117,408,270,23,12,'missing'),
          txt('flow-right-2','结构批准版本    已齐套',1117,442,270,23,12,'ready'),
          txt('flow-right-3','电气批准版本    数据不足',1117,476,270,23,12,'insufficient'),
          rect('flow-right-rule-2',1117,523,270,1,'border'),
          txt('flow-right-next','后续节点',1117,546,250,24,13,'text','semibold'),
          txt('flow-right-next-1','T29 采购技术条件交接 · 待前置',1117,584,272,22,12,'waiting'),
          txt('flow-right-next-2','T30 采购计划与下单 · 数据不足',1117,618,272,22,12,'insufficient'),
          txt('flow-right-link','查看 T28 判定依据  →',1117,771,260,22,13,'primary','medium')]
    finish('project-flow','项目流程图',a)


def files():
    a=shell('files','文件明细')
    a += [txt('files-title','文件明细',264,91,580,42,28,'text','semibold'),
          txt('files-sub','归一化文件与未归属记录',264,137,580,24,13,'muted'),
          txt('files-tab-all','全部文件',264,190,104,25,14,'muted'),
          txt('files-tab-unmatched','未归属文件  12',385,190,180,25,14,'primary','semibold'),
          rect('files-tab-line',385,219,122,3,'primary'), rect('files-tabs-line',264,222,1144,1,'border'),
          rect('files-search',264,251,330,38,'surface','border','md'),
          txt('files-search-text','搜索文件编码、名称',279,258,280,24,13,'muted'),
          rect('files-type',608,251,150,38,'surface','border','md'),
          txt('files-type-text','全部文件类型  ⌄',622,258,130,24,13,'text'),
          rect('files-table',264,320,1144,490,'surface','border','lg'),
          rect('files-th-bg',265,321,1142,42,'subtle'),
          txt('files-th-1','文件 / 编码',282,329,300,24,12,'muted','medium'),
          txt('files-th-2','类型 / 版本',655,329,180,24,12,'muted','medium'),
          txt('files-th-3','PLM 库路径',865,329,270,24,12,'muted','medium'),
          txt('files-th-4','归属问题',1190,329,160,24,12,'muted','medium')]
    rows=[
        ('工艺流程图 P&ID','PID-2407-021','P&ID · R3','/07.工艺图文档','编码未匹配'),
        ('结构总装三维模型','ASM-1178-04','三维模型 · B2','/05.结构设计','项目别名缺失'),
        ('电气 IO 分配表','EIO-2411-08','IO 表 · R1','/08.电气图文档','编码未匹配'),
        ('设备技术参数表','PAR-2409-15','参数表 · R2','/07.工艺图文档','字段映射缺失'),
        ('结构 BOM 明细','BOM-2397-06','BOM · A4','/04.结构物料','项目别名缺失'),
        ('工艺控制逻辑图','LOG-2407-12','逻辑图 · R2','/07.工艺图文档','编码未匹配'),
    ]
    for i,(name,code,typ,path,reason) in enumerate(rows):
        y=379+i*69
        if i: a.append(rect(f'files-row-line-{i}',282,y-9,1108,1,'border'))
        a += [txt(f'file-{i}-name',name,282,y,340,23,13,'text','medium'),
              txt(f'file-{i}-code',code,282,y+22,340,18,11,'muted'),
              txt(f'file-{i}-type',typ,655,y+7,190,25,13,'text'),
              txt(f'file-{i}-path',path,865,y+7,294,25,12,'muted'),
              txt(f'file-{i}-reason',reason,1190,y+7,170,25,12,'abnormal','medium')]
    finish('files','文件明细与未归属',a)


def template():
    a=shell('template','流程模板 / T20–T30')
    a += [txt('template-title','T20–T30 进度模板',264,88,700,42,27,'text','semibold'),
          txt('template-sub','草稿 v3 · 未试算 · 当前发布版本 v2',264,132,700,24,13,'muted')]
    a += button('template-save','保存草稿',1055,98,108)
    a += button('template-preview','试算',1175,98,90,True)
    a += button('template-publish','发布版本',1277,98,131,False,True)
    a += [rect('template-toolbar',264,183,1144,46,'surface','border','md'),
          txt('template-tool-add','＋ 添加节点',282,194,140,25,13,'text','medium'),
          txt('template-tool-undo','撤销',448,194,62,25,13,'muted'),
          txt('template-tool-redo','重做',533,194,62,25,13,'muted'),
          txt('template-tool-layout','自动布局',628,194,100,25,13,'text'),
          txt('template-tool-validate','图校验通过',1224,194,160,25,12,'done','medium'),
          rect('template-canvas',264,246,779,586,'surface','border','lg'),
          txt('template-lane-1','工艺',282,271,110,22,12,'muted','semibold'),
          txt('template-lane-2','结构',282,443,110,22,12,'muted','semibold'),
          txt('template-lane-3','电气',282,615,110,22,12,'muted','semibold'),
          rect('template-lane-line-1',282,412,742,1,'border'),
          rect('template-lane-line-2',282,584,742,1,'border')]
    nodes=[
        ('T21 · 工艺设计包 A',332,326,'selected'),('T25 · 工艺设计包 B',618,326,'surface'),
        ('T22 · 三维模型建立',332,498,'surface'),('T23–24 · 结构 BOM',618,498,'surface'),
        ('T26 · 电气及 IO 配置',332,670,'surface'),('T27 · 模拟测试',618,670,'surface')]
    for i,(label,x,y,bg) in enumerate(nodes):
        a += [rect(f'template-node-{i}',x,y,208,58,bg,'primary' if i==0 else 'border','md'),
              txt(f'template-node-{i}-text',label,x+13,y+17,184,26,12,'text','medium')]
    for i,y in enumerate([354,526,698]): a.append(rect(f'template-edge-{i}',540,y,78,2,'line'))
    a += [rect('template-inspector',1061,246,347,586,'surface','border','lg'),
          txt('inspector-title','T21 · 工艺设计包 A',1081,269,300,28,17,'text','semibold'),
          txt('inspector-sub','工艺支路 · 自动完成',1081,304,300,23,12,'muted'),
          rect('inspector-rule-1',1081,343,307,1,'border'),
          txt('inspector-rule-title','文件匹配规则',1081,365,275,25,14,'text','semibold'),
          txt('inspector-rule-logic','齐套逻辑   全部满足',1081,401,280,24,12,'text'),
          txt('inspector-rule-version','版本要求   同一受控版本',1081,431,280,24,12,'text'),
          rect('inspector-rule-2',1081,470,307,1,'border'),
          txt('inspector-items-title','所需文件项  ·  3',1081,491,280,24,13,'text','semibold'),
          txt('inspector-item-1','统一版本 P&ID      /07.工艺图文档',1081,530,300,24,12,'text'),
          txt('inspector-item-2','工艺 BOM            /04.工艺物料',1081,563,300,24,12,'text'),
          txt('inspector-item-3','设备参数表          /07.工艺图文档',1081,596,300,24,12,'text'),
          txt('inspector-add','＋ 添加文件项',1081,639,250,24,13,'primary','medium'),
          rect('inspector-rule-3',1081,682,307,1,'border'),
          txt('inspector-warning','发布前必须先对真实项目试算。',1081,707,292,24,12,'warning')]
    finish('template-editor','流程模板编辑',a)


def datasource():
    a=shell('datasource','数据源')
    a += [txt('ds-page-title','数据源',264,91,600,42,28,'text','semibold'),
          txt('ds-page-sub','PLM PostgreSQL 只读采集与同步监控',264,137,650,24,13,'muted')]
    a += button('ds-edit','编辑连接',1275,96,133)
    a += [rect('ds-status-panel',264,187,1144,124,'surface','border','lg'),
          ellipse('ds-health-dot',286,211,10,'done'),
          txt('ds-health','鼎捷 PLM · 连接正常',306,201,520,29,17,'text','semibold'),
          txt('ds-health-sub','只读副本  ·  最近健康检查 09:45  ·  增量采集每 10 分钟',286,243,765,24,13,'muted'),
          txt('ds-last-sync','最近成功同步 09:42',1110,211,270,24,13,'done','medium'),
          txt('ds-tab-connection','连接与采集',264,348,150,27,14,'primary','semibold'),
          txt('ds-tab-mapping','字段映射',437,348,120,27,14,'muted'),
          txt('ds-tab-library','库路径规则',577,348,150,27,14,'muted'),
          txt('ds-tab-log','同步日志',742,348,120,27,14,'muted'),
          rect('ds-tab-line',264,380,88,3,'primary'), rect('ds-tabs-rule',264,384,1144,1,'border'),
          txt('ds-section-title','采集配置',264,420,400,30,19,'text','semibold'),
          rect('ds-config-panel',264,465,705,236,'surface','border','lg'),
          txt('ds-config-host-label','数据库地址',286,489,150,20,12,'muted'),
          txt('ds-config-host','plm-readonly.internal:5432',286,516,420,27,14,'text','medium'),
          txt('ds-config-user-label','连接用户',286,564,150,20,12,'muted'),
          txt('ds-config-user','plviews_reader',286,590,340,27,14,'text','medium'),
          txt('ds-config-policy','全量兜底  每日 03:00',286,655,370,24,13,'muted'),
          rect('ds-actions-panel',989,465,419,236,'surface','border','lg'),
          txt('ds-actions-title','同步操作',1011,488,320,26,16,'text','semibold'),
          txt('ds-actions-copy','手动同步与定时任务使用同一把数据源锁。',1011,529,360,48,13,'muted'),
          txt('ds-actions-watermark','当前水位  2026-11-10 09:42',1011,590,350,24,12,'muted')]
    a += button('ds-run','运行增量同步',1011,640,185,True)
    a += [txt('ds-log-title','最近批次',264,740,350,28,19,'text','semibold'),
          txt('ds-log-1','09:42  增量采集成功   ·   126 条归一化文件   ·   18 个项目更新',264,785,900,24,13,'text'),
          txt('ds-log-2','09:32  增量采集成功   ·   84 条归一化文件   ·   7 个项目更新',264,819,900,24,13,'muted')]
    finish('datasource','数据源配置',a)


def admin():
    a=shell('admin','组织与权限')
    a += [txt('admin-title','组织与权限',264,91,650,42,28,'text','semibold'),
          txt('admin-sub','管理本地账号、角色与项目可见范围',264,137,680,24,13,'muted')]
    a += button('admin-add','添加用户',1286,96,122,True)
    a += [txt('admin-tab-users','用户',264,189,70,27,14,'primary','semibold'),
          txt('admin-tab-access','项目权限',366,189,120,27,14,'muted'),
          txt('admin-tab-audit','审计日志',513,189,120,27,14,'muted'),
          rect('admin-tab-line',264,219,29,3,'primary'), rect('admin-tabs-rule',264,223,1144,1,'border'),
          rect('admin-search',264,252,310,38,'surface','border','md'),
          txt('admin-search-text','搜索姓名或账号',279,259,265,24,13,'muted'),
          txt('admin-count','共 24 位用户',1275,260,130,23,12,'muted','normal','text-right'),
          rect('admin-table',264,320,1144,409,'surface','border','lg'),
          rect('admin-th-bg',265,321,1142,42,'subtle'),
          txt('admin-th-user','用户',285,329,260,24,12,'muted','medium'),
          txt('admin-th-role','角色',644,329,160,24,12,'muted','medium'),
          txt('admin-th-scope','项目范围',885,329,220,24,12,'muted','medium'),
          txt('admin-th-state','账号状态',1214,329,150,24,12,'muted','medium')]
    rows=[
        ('陈晓','chen.xiao','管理员','所有项目','启用'),
        ('林宇','lin.yu','项目经理','负责项目 · 6','启用'),
        ('周敏','zhou.min','部门查看者','结构专业 · 12','启用'),
        ('吴杰','wu.jie','部门查看者','电气专业 · 8','启用'),
        ('何涛','he.tao','只读访客','指定项目 · 3','停用')]
    for i,(name,account,role,scope,state) in enumerate(rows):
        y=383+i*68
        if i: a.append(rect(f'admin-line-{i}',285,y-10,1099,1,'border'))
        a += [txt(f'admin-user-{i}',name,285,y,240,22,13,'text','medium'),
              txt(f'admin-account-{i}',account,285,y+20,240,18,11,'muted'),
              txt(f'admin-role-{i}',role,644,y+6,180,24,13,'text'),
              txt(f'admin-scope-{i}',scope,885,y+6,290,24,13,'text'),
              txt(f'admin-state-{i}',state,1214,y+6,125,24,12,'done' if state=='启用' else 'muted','medium')]
    a += [txt('admin-note','PLM 连接凭据仅管理员可见；项目经理仅访问获授权的项目。',264,770,950,24,12,'muted')]
    finish('admin','组织与权限',a)


def login():
    a=[rect('login-bg',0,0,1440,900,'background'),
       rect('login-side',0,0,610,900,'sidebar'),
       rect('login-brand-mark',64,58,34,34,'primary',radius='md'),
       txt('login-brand-letter','P',74,62,20,26,18,'onPrimary','bold'),
       txt('login-brand','PLViews',111,56,250,38,25,'text','semibold'),
       txt('login-hero','项目进度，\n有据可查。',64,263,480,132,46,'text','semibold','whitespace-pre-line leading-[65px]'),
       txt('login-description','从 PLM 文件与版本证据出发，\n看清每个节点的真实状态。',64,438,450,70,17,'muted','normal','whitespace-pre-line leading-[29px]'),
       rect('login-side-line',64,791,480,1,'border'),
       txt('login-side-footer','PLM 数据只读 · 进度判定留痕',64,813,420,24,12,'muted'),
       rect('login-form',770,159,500,585,'surface','border','lg'),
       txt('login-title','登录 PLViews',814,211,390,45,28,'text','semibold'),
       txt('login-sub','使用组织分配的本地账号',814,264,390,23,13,'muted'),
       txt('login-account-label','账号',814,322,390,23,13,'text','medium'),
       rect('login-account',814,352,412,44,'surface','border','md'),
       txt('login-account-example','例：lin.yu',829,361,370,25,13,'muted'),
       txt('login-password-label','密码',814,422,390,23,13,'text','medium'),
       rect('login-password',814,452,412,44,'surface','border','md'),
       txt('login-password-example','输入密码',829,461,370,25,13,'muted'),
       rect('login-submit-bg',814,538,412,46,'primary',radius='md'),
       txt('login-submit','登录',814,547,412,27,15,'onPrimary','semibold','text-center'),
       txt('login-help','如需开通账号，请联系系统管理员。',814,619,412,24,12,'muted')]
    finish('login','登录',a)


def discovered_projects():
    a=shell('dashboard','项目总览 / 待确认项目')
    a += [txt('discover-title','待确认项目',264,91,600,42,28,'text','semibold'),
          txt('discover-sub','从 PLM 新发现的项目，确认后绑定进度模板。',264,137,700,24,13,'muted'),
          txt('discover-count','4 个待确认',1270,106,138,28,13,'warning','medium','text-right'),
          rect('discover-search',264,190,308,38,'surface','border','md'),
          txt('discover-search-hint','搜索项目编码或名称',280,197,275,24,13,'muted'),
          rect('discover-table',264,258,1144,468,'surface','border','lg'),
          rect('discover-table-head',265,259,1142,42,'subtle'),
          txt('discover-th-1','项目 / 编码',285,267,350,24,12,'muted','medium'),
          txt('discover-th-2','发现来源',700,267,170,24,12,'muted','medium'),
          txt('discover-th-3','候选文件',910,267,150,24,12,'muted','medium'),
          txt('discover-th-4','处理',1174,267,200,24,12,'muted','medium')]
    rows=[('精密混配装置','PX-2416','产品库 · 项目对象','18 份'),('低温反应机组','PX-2415','产品库 · 项目对象','23 份'),('分散控制系统','PX-2414','产品库 · 项目对象','11 份'),('模块化泵站','PX-2413','产品库 · 项目对象','15 份')]
    for i,(name,code,source,files) in enumerate(rows):
        y=321+i*92
        if i: a.append(rect(f'discover-row-line-{i}',285,y-15,1098,1,'border'))
        a += [txt(f'discover-{i}-name',name,285,y,345,25,14,'text','medium'),
              txt(f'discover-{i}-code',code,285,y+26,345,21,12,'muted'),
              txt(f'discover-{i}-source',source,700,y+12,200,25,13,'text'),
              txt(f'discover-{i}-files',files,910,y+12,140,25,13,'text'),
              txt(f'discover-{i}-action','确认并绑定  →',1174,y+12,190,25,13,'primary','medium')]
    a += [rect('discover-footer-line',264,763,1144,1,'border'),
          txt('discover-footer','确认项目后生成节点实例；模板新版本不会自动改变已有项目。',264,782,1110,24,12,'muted')]
    finish('project-discovery','项目发现与绑定',a)


def template_preview():
    a=shell('template','流程模板 / 试算结果')
    a += [txt('preview-title','模板试算结果',264,91,720,42,28,'text','semibold'),
          txt('preview-sub','T20–T30 进度模板 · 草稿 v3 · 试算项目 PX-2412',264,137,820,24,13,'muted')]
    a += button('preview-back','返回编辑',1064,96,114)
    a += button('preview-publish','发布版本',1190,96,138,True)
    a += [rect('preview-summary',264,190,1144,108,'surface','border','lg'),
          txt('preview-summary-title','与已发布 v2 相比',286,207,340,25,16,'text','semibold'),
          txt('preview-summary-sub','以真实文件快照预演；不会修改项目现有判定。',286,243,540,24,12,'muted'),
          txt('preview-summary-one','2',856,208,70,36,28,'text','semibold'),
          txt('preview-summary-one-label','节点状态变化',856,251,156,22,12,'muted'),
          txt('preview-summary-two','1',1120,208,70,36,28,'text','semibold'),
          txt('preview-summary-two-label','新增异常',1120,251,156,22,12,'muted'),
          txt('preview-diff-title','判定变化',264,337,400,29,19,'text','semibold'),
          rect('preview-table',264,382,1144,338,'surface','border','lg'),
          rect('preview-table-head',265,383,1142,42,'subtle'),
          txt('preview-th-1','节点',284,391,340,24,12,'muted','medium'),
          txt('preview-th-2','当前 v2',705,391,188,24,12,'muted','medium'),
          txt('preview-th-3','试算 v3',990,391,188,24,12,'muted','medium'),
          txt('preview-th-4','原因',1190,391,180,24,12,'muted','medium')]
    rows=[('T21 工艺设计包交接 A','已完成','已完成','无变化','done'),('T25 工艺设计包交接 B','文件不齐','异常','版本冲突','abnormal'),('T28 设计汇总及交底','待前置','文件不齐','新增文件项','missing'),('T30 采购计划与下单','数据不足','数据不足','无变化','insufficient')]
    for i,(node,old,new,reason,kind) in enumerate(rows):
        y=445+i*63
        if i: a.append(rect(f'preview-row-line-{i}',284,y-10,1099,1,'border'))
        a += [txt(f'preview-{i}-node',node,284,y+4,400,25,13,'text','medium'),
              txt(f'preview-{i}-old',old,705,y+4,190,25,12,'muted'),
              txt(f'preview-{i}-new',new,990,y+4,180,25,12,kind,'medium'),
              txt(f'preview-{i}-reason',reason,1190,y+4,190,25,12,'text')]
    a += [txt('preview-footer','发布后仅影响显式重新绑定模板的项目；已有项目继续使用原版本。',264,763,1080,24,12,'muted')]
    finish('template-preview','模板试算结果',a)


def field_mapping():
    a=shell('datasource','数据源 / 字段映射')
    a += [txt('mapping-title','字段映射',264,91,680,42,28,'text','semibold'),
          txt('mapping-sub','将 PLM 实际列与 PLViews 逻辑字段对应。',264,137,680,24,13,'muted')]
    a += button('mapping-save','保存映射',1277,96,131,True)
    a += [txt('mapping-tab-connection','连接与采集',264,190,150,27,14,'muted'),
          txt('mapping-tab-fields','字段映射',437,190,120,27,14,'primary','semibold'),
          txt('mapping-tab-path','库路径规则',577,190,150,27,14,'muted'),
          txt('mapping-tab-log','同步日志',742,190,120,27,14,'muted'),
          rect('mapping-tab-line',437,221,58,3,'primary'), rect('mapping-tabs-rule',264,226,1144,1,'border'),
          rect('mapping-source',264,254,248,38,'surface','border','md'),
          txt('mapping-source-text','鼎捷 PLM 只读副本  ⌄',280,261,220,24,13,'text'),
          txt('mapping-state','12 / 15 个关键字段已核对',1110,261,290,24,12,'warning','medium','text-right'),
          rect('mapping-table',264,324,1144,448,'surface','border','lg'),
          rect('mapping-table-head',265,325,1142,42,'subtle'),
          txt('mapping-th-1','PLViews 逻辑字段',285,333,265,24,12,'muted','medium'),
          txt('mapping-th-2','PLM 表 / 列',650,333,330,24,12,'muted','medium'),
          txt('mapping-th-3','核对状态',1130,333,215,24,12,'muted','medium')]
    rows=[('文件版本标识','ma_foundation.GUID','已核对','done'),('跨版本主键','ma_foundation.MASTERFK','已核对','done'),('文件名称','ma_foundation.NAME','已核对','done'),('受控状态','ma_foundation.STATUS','待核对枚举','missing'),('入库时间','ma_foundation.COMMITTIME','待核对时区','missing'),('项目归属','ma_foundation.PROJECTREFERENCE','待核对路径','missing')]
    for i,(logical,plm,state,kind) in enumerate(rows):
        y=387+i*62
        if i: a.append(rect(f'mapping-line-{i}',285,y-12,1099,1,'border'))
        a += [txt(f'mapping-{i}-logical',logical,285,y,310,26,13,'text','medium'),
              txt(f'mapping-{i}-plm',plm,650,y,430,26,13,'text'),
              txt(f'mapping-{i}-state',state,1130,y,240,26,12,kind,'medium')]
    a += [txt('mapping-footer','实际表名、枚举和时区以迭代 0 的数据库核对结果为准。',264,811,1120,24,12,'muted')]
    finish('field-mapping','字段映射',a)


for build in [design_system,dashboard,project_detail,project_flow,files,template,datasource,admin,login,discovered_projects,template_preview,field_mapping]:
    build()
