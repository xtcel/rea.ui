import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Use the same ZIP implementation as @rea/storage, with editable native primitives.
const { zipSync, strToU8 } = createRequire(new URL('../packages/storage/package.json', import.meta.url))('fflate');
const root = new URL('../', import.meta.url);
const colors = { surface: '#ffffff', chrome: '#fafbfc', border: '#e5e7eb', text: '#30343b', muted: '#656d79', accent: '#356af0', selected: '#eaf0ff', canvas: '#eef0f4' };
const attr = value => JSON.stringify(String(value));
const box = (x, y, w, h) => `absolute left-[${x}px] top-[${y}px] w-[${w}px] h-[${h}px]`;
const fill = color => `bg-[${colors[color] ?? color}]`;
let sequence = 0;
function node(kind, name, classes, children = '', extra = '') {
  const id = `ui-${String(++sequence).padStart(4, '0')}`;
  const props = `designId=${attr(id)} name=${attr(name)} className=${attr(classes)}${extra ? ` ${extra}` : ''}`;
  return children ? `<${kind} ${props}>${children}</${kind}>` : `<${kind} ${props} />`;
}
const frame = (name, x, y, w, h, children, classes = '') => node('Frame', name, `${box(x,y,w,h)} ${classes}`, children.join('\n'));
const rect = (name, x, y, w, h, color = 'border', classes = '') => node('Rect', name, `${box(x,y,w,h)} ${fill(color)} ${classes}`);
const text = (name, content, x, y, w, size = 12, color = 'text', classes = '', h = Math.ceil(size * 1.6)) => node('Text', name, `${box(x,y,w,h)} text-[${size}px] leading-[${h}px] text-[${colors[color] ?? color}] whitespace-pre-wrap ${classes}`, `{${attr(content)}}`);
const line = (name,x,y,w) => rect(name,x,y,w,1);
const paths = {
  home: 'M3 10 12 3 21 10V21H15V14H9V21H3Z',
  folder: 'M3 6H9L11 8H21V20H3ZM3 6V4H9L11 6H21V8',
  file: 'M6 3H14L19 8V21H6ZM14 3V8H19M9 12H16M9 16H16',
  shapes: 'M12 3 17 11H7ZM3 15H10V22H3ZM20 15A3.5 3.5 0 1 0 20 22A3.5 3.5 0 1 0 20 15',
  template: 'M3 4H21V9H3ZM3 13H10V21H3ZM14 13H21V21H14Z',
  settings: 'M3 6H9M13 6H21M3 12H15M19 12H21M3 18H5M9 18H21M9 3V9M15 9V15M5 15V21',
  clock: 'M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3M12 7V12L16 14',
  chevron: 'M9 5 16 12 9 19', down: 'M6 9 12 15 18 9',
  plus: 'M12 5V19M5 12H19', arrow: 'M5 12H19M13 6 19 12 13 18',
  up: 'M12 19V5M6 11 12 5 18 11', diagonal: 'M6 18 18 6M6 6H18V18',
  cursor: 'M4 3 20 12 13 14 10 21Z', board: 'M7 2V22M17 2V22M2 7H22M2 17H22',
  square: 'M4 4H20V20H4Z', circle: 'M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3',
  type: 'M4 7V4H20V7M12 4V21M8 21H16', menu: 'M4 6H20M4 12H20M4 18H20',
  undo: 'M3 10 8 5M3 10H14A7 7 0 0 1 14 24M3 10V4',
  redo: 'M21 10 16 5M21 10H10A7 7 0 0 0 10 24M21 10V4',
  hand: 'M7 12V6A2 2 0 0 1 11 6V4A2 2 0 0 1 15 4V6A2 2 0 0 1 19 6V10A2 2 0 0 1 23 10V16C23 23 11 25 7 19L3 14A2 2 0 0 1 6 11L11 16V6',
  layers: 'M12 3 22 9 12 15 2 9ZM2 14 12 20 22 14M2 19 12 25 22 19',
  check: 'M4 12 9 17 20 6', search: 'M10 3A7 7 0 1 0 10 17A7 7 0 1 0 10 3M15 15 21 21',
};
const icon = (kind,x,y,size=16,color='muted') => node('Vector', `图标 · ${kind}`, `${box(x,y,size,size)} fill-none stroke-[${colors[color] ?? color}] [stroke-width:1.65] [stroke-linecap:round] [stroke-linejoin:round]`, '', `viewBox="0 0 24 24" d=${attr(paths[kind])}`);
const button = (name,label,x,y,w,kind,active=false) => frame(name,x,y,w,32,[...(kind?[icon(kind,9,8,16,active?'accent':'muted')]:[]),text(name,label,kind?32:10,6,w-(kind?38:20),12,active?'accent':'muted')], active?`${fill('selected')} rounded`:'');

function miniPreview(kind,x,y,w,h) {
  const nodes = [rect('示意封面底',0,0,w,h,kind==='starter'?'#f0f2f6':'#eef2ef','rounded-lg border border-[#e5e7eb]')];
  const px=20, py=20, pw=w-40, ph=h-40;
  if(kind==='starter') nodes.push(frame('官网封面 · 示意',px,py,pw,ph,[rect('封面底',0,0,pw,ph,'surface','rounded'),text('封面品牌','REA',12,8,50,10,'text','font-semibold'),text('封面导航','产品    资源    关于',pw-108,9,100,7,'muted'),text('封面标题','让灵感，有处可去。',15,46,pw-30,15,'text','font-semibold'),text('封面副文','从想法到界面，自由创作。',15,73,pw-30,8,'muted'),rect('封面按钮',15,100,60,20,'accent','rounded'),text('封面行动','开始设计',24,103,50,7,'surface'),rect('封面视觉',pw-86,46,64,74,'selected','rounded-lg')]));
  else nodes.push(frame('看板封面 · 示意',px,py,pw,ph,[rect('封面底',0,0,pw,ph,'surface','rounded'),rect('封面导航',0,0,42,ph,'#f5f7f5'),rect('封面标记',10,12,12,12,'#50775f','rounded'),text('看板标题','工作概览',56,12,pw-70,9,'text','font-semibold'),rect('统计块',56,37,65,35,'#eef4ef','rounded'),rect('统计块',129,37,65,35,'#f4f5f8','rounded'),text('统计数','24',65,43,45,15,'text'),rect('柱状图',60,103,12,ph-115,'#b4cbb9'),rect('柱状图',81,87,12,ph-99,'#8cac95'),rect('柱状图',102,95,12,ph-107,'#b4cbb9'),rect('柱状图',123,78,12,ph-90,'#668a70'),rect('柱状图',144,68,12,ph-80,'#50775f')]));
  nodes.push(text('示意封面标签','示意封面',w-56,6,48,8,'muted'));
  return frame('项目示意封面',x,y,w,h,nodes);
}

function homePage() {
  const sidebar=[text('品牌','rea',24,27,52,29,'#252a32','font-bold tracking-[-1px]'),rect('品牌标记',74,51,5,5,'accent','rounded-xs'),text('品牌说明','设计工作空间',88,34,110,11,'muted')];
  const nav=[['home','首页'],['folder','全部项目'],['shapes','设计系统'],['template','模板'],['settings','设置']];
  nav.forEach(([kind,label],i)=>sidebar.push(frame(label,12,88+i*47,204,42,[icon(kind,13,12,18,i===0?'accent':'muted'),text(label,label,43,10,132,13,i===0?'accent':'muted',i===0?'font-semibold':'')],i===0?`${fill('selected')} rounded-md`:'')));
  sidebar.push(line('最近项目分隔线',12,342,204),icon('clock',25,369,15),text('最近项目标题','最近项目',50,367,125,11,'muted'),icon('down',188,370,13));
  ['ReaUI_App','欢迎使用 REA UI'].forEach((name,i)=>sidebar.push(icon('file',27,405+i*36,15),text('最近项目',name,52,402+i*36,154,12,'muted')));
  sidebar.push(line('工作区分隔线',12,897,204),rect('工作区头像',20,913,31,31,'surface','border border-[#e5e7eb] rounded-[7px]'),text('头像文字','R',30,916,20,13,'text','font-semibold'),text('工作区名称','本地工作空间',61,910,130,12),text('工作区说明','你的灵感，保存在此',61,930,145,10,'muted'),icon('down',193,924,13));
  const content=[frame('侧边导航',0,0,228,960,sidebar,`${fill('chrome')} border-r border-[#e5e7eb]`),frame('面包屑顶栏',228,0,1212,64,[text('面包屑','工作空间',36,22,65,12,'muted'),icon('chevron',106,26,12),text('当前页面','首页',133,22,70,12,'text','font-medium'),node('Ellipse','本地状态',`${box(1090,29,5,5)} bg-[#698775]`),text('本地状态标签','本地工作空间',1102,24,100,11,'muted')],'border-b border-[#e5e7eb]')];
  const idea=[rect('设计标记底',357,0,46,46,'selected','rounded-xl'),icon('shapes',367,10,26,'accent'),text('首页标题','从一个想法，开始设计。',100,67,560,30,'#252a32','font-semibold tracking-[-0.5px] text-center',45),text('首页说明','说说你想创造什么，其余的我们一起完成。',130,122,500,13,'muted','text-center'),frame('需求输入区',0,170,760,162,[text('输入提示','描述你的想法，让我们一起把它变成设计…',20,21,690,14,'#717985'),icon('plus',22,126,19),rect('工具分隔线',54,128,1,15),icon('shapes',72,128,14),text('设计系统','REA UI',92,126,48,11,'muted'),icon('down',140,131,12),icon('folder',174,128,14),text('目录选择','工作目录',194,126,60,11,'muted'),icon('down',253,131,12),text('模型选择','默认模型',635,126,60,11,'muted'),icon('down',693,131,12),rect('发送禁用底',714,116,31,31,'#f1f3f6','rounded-[7px]'),icon('up',721,123,17,'#8b939f')],`${fill('surface')} border border-[#cdd2db] rounded-xl`),text('键盘说明','Enter 发送，Shift + Enter 换行',3,341,360,10,'muted'),text('预览说明','AI 对话界面预览',610,341,147,10,'muted','text-right')];
  [['设计一个产品官网',160],['搭建数据看板',330],['创建移动端页面',478]].forEach(([label,x])=>idea.push(frame('需求建议',x,379,label.length>7?160:140,32,[icon('template',10,9,13),text('建议内容',label,29,7,110,11,'muted'),icon('diagonal',label.length>7?139:119,10,12)],'border border-[#e5e7eb] rounded-[5px]')));
  content.push(frame('灵感输入与建议',454,140,760,411,idea));
  const recent=[text('最近项目标题','最近项目',0,0,200,16,'text','font-semibold'),text('最近项目说明','继续上次的创作，或者开启新的可能。',0,31,500,11,'muted'),text('全部项目链接','全部项目',1021,12,70,11,'muted'),icon('arrow',1094,14,14)];
  const cardWidth=357;
  ['ReaUI_App','欢迎使用 REA UI'].forEach((name,i)=>recent.push(frame('最近项目 · '+name,i*379,64,cardWidth,226,[miniPreview(i===0?'starter':'dashboard',0,0,cardWidth,174),text('项目名称',name,3,186,cardWidth-20,12,'text','font-medium'),text('项目更新时间','刚刚更新',3,209,cardWidth-20,10,'muted')])));
  recent.push(frame('新建项目入口',758,64,357,174,[rect('新建图标底',159,36,38,38,'surface','border border-[#e5e7eb] rounded-[9px]'),icon('plus',167,44,23),text('新建项目','开始一个新项目',30,87,297,12,'muted','text-center font-medium'),text('新建项目说明','把下一个想法变成现实',30,113,297,10,'muted','text-center')],`${fill('chrome')} border border-dashed border-[#d3d8e0] rounded-lg`));
  content.push(frame('最近项目区域',276,619,1115,295,recent),line('页脚分隔线',276,924,1115),text('页脚','每个好设计，都始于一个想法。',276,939,500,10,'muted'),text('页脚品牌','REA UI',1331,939,60,10,'muted','font-semibold'));
  return frame('首页 · 工作空间 · 1440 × 960',0,0,1440,960,content,`${fill('surface')} overflow-hidden`);
}

function editorPage() {
  const top=[icon('home',11,14,17),icon('menu',47,14,18),rect('工具分隔线',82,12,1,20)];
  ['cursor','hand','board','square','circle','type'].forEach((kind,i)=>top.push(frame('工具 · '+kind,92+i*38,6,32,32,[icon(kind,8,8,16,i===0?'accent':'muted')],i===0?`${fill('selected')} rounded`:'')));
  top.push(icon('undo',338,14,16),icon('redo',374,14,16),text('文档名称','欢迎使用 REA UI',592,11,250,13,'text','text-center font-medium'),icon('down',826,17,12),icon('check',1209,16,14,'#698775'),text('保存状态','已保存',1229,12,60,11,'muted'),button('缩放','100%',1319,6,84,'down'));
  const left=[text('图层标签','图层',16,15,100,12,'text','font-semibold'),line('标题分隔线',0,44,240),text('页面标题','页面',16,60,140,12,'text','font-semibold'),icon('plus',209,64,14),frame('当前页面',8,89,224,32,[text('页面名称','画板',24,6,180,12,'accent'),node('Ellipse','页面状态',`${box(11,13,5,5)} ${fill('accent')}`)],`${fill('selected')} rounded`),line('页面分隔线',0,160,240),text('图层分区','图层',16,177,150,12,'text','font-semibold')];
  const rows=[['board','桌面端 (960×640)',0],['type','标题',1],['type','说明',1],['square','卡片矩形',1],['circle','圆形头像',1],['board','移动端 (375×667)',0],['type','移动标题',1],['square','横幅',1]];
  rows.forEach(([kind,label,depth],i)=>left.push(frame('图层 · '+label,0,208+i*32,240,32,[...(depth===0?[icon('down',10,10,12)]:[]),icon(kind,depth?38:28,9,14,i===3?'accent':'muted'),text('图层名称',label,depth?60:50,6,174,12,i===3?'accent':'text')],i===3?`${fill('selected')} border-y border-[#c9d8fd]`:'')));
  const right=[text('设计标签','设计',16,15,70,12,'accent','font-semibold'),text('检查标签','检查',88,15,70,12,'muted'),rect('活动标签线',16,42,28,2,'accent'),line('面板分隔线',0,44,280),text('所选对象','卡片矩形',16,61,230,12,'text','font-semibold'),text('位置标题','位置',16,105,220,12,'text','font-semibold')];
  function field(label,value,x,y,w=116) { return frame('属性 · '+label,x,y,w,30,[text('属性标签',label,9,6,24,11,'muted'),text('属性数值',value,34,5,w-40,12,'text','font-mono')],`${fill('chrome')} border border-[#e5e7eb] rounded`); }
  right.push(field('X','64',16,136),field('Y','176',144,136),field('W','288',16,177),field('H','192',144,177),field('°','0',16,218),line('布局分隔线',0,270,280),text('外观标题','外观',16,287,230,12,'text','font-semibold'),field('α','100%',16,319),field('R','12',144,319),line('填充分隔线',0,373,280),text('填充标题','填充',16,389,210,12,'text','font-semibold'),icon('plus',244,392,14),rect('填充色块',17,427,24,24,'#2b7fff','rounded border border-[#e5e7eb]'),text('填充值','#2B7FFF',51,429,125,12,'text','font-mono'),text('填充透明度','100%',215,429,50,11,'muted'),line('描边分隔线',0,472,280),text('描边标题','描边',16,489,210,12,'text','font-semibold'),icon('plus',244,492,14),line('效果分隔线',0,533,280),text('效果标题','效果',16,550,210,12,'text','font-semibold'),icon('plus',244,553,14),line('导出分隔线',0,594,280),text('导出标题','导出',16,611,210,12,'text','font-semibold'),text('导出说明','从主菜单导出 .reaui 或页面代码',16,643,244,11,'muted'));
  // The central design matches the project's existing welcome document at 62.5% zoom.
  const canvas=[text('桌面画框标签','桌面端 (960×640)',44,181,300,11,'muted'),frame('桌面端示例',44,204,600,400,[text('设计标题','REA UI 设计系统',40,40,510,19,'#0f172b','font-bold'),text('设计副文','基于 React + Tailwind CSS 的单源设计编辑器。',40,70,520,10,'#62748e'),rect('示例卡片',40,110,180,120,'#2b7fff','rounded-[8px]'),node('Ellipse','示例头像',`${box(240,110,80,80)} bg-[#00d5be]`)],`${fill('surface')} rounded-[5px] shadow-sm`),text('移动画框标签','移动端 (375×667)',684,181,220,11,'muted'),frame('移动端示例',684,204,234,417,[text('移动标题','移动端预览',15,30,210,13,'#1d293d','font-bold'),rect('移动横幅',15,60,204,90,'#615fff','rounded-[5px]')],`${fill('surface')} rounded-[5px] shadow-sm`),frame('选区覆盖层',84,314,180,120,[],'border border-[#356af0]')];
  [[81,311],[171,311],[261,311],[81,371],[261,371],[81,431],[171,431],[261,431]].forEach(([x,y])=>canvas.push(rect('缩放手柄',x,y,6,6,'surface','border border-[#356af0]')));
  canvas.push(rect('选区尺寸底',137,443,74,20,'accent','rounded-xs'),text('选区尺寸','288 × 192',142,445,70,10,'surface','font-mono'));
  return frame('编辑器 · 1440 × 960',0,0,1440,960,[frame('画布区域',240,44,920,916,canvas,fill('canvas')),frame('顶部工具栏',0,0,1440,44,top,`${fill('surface')} border-b border-[#e5e7eb]`),frame('页面与图层',0,44,240,916,left,`${fill('surface')} border-r border-[#e5e7eb]`),frame('属性检查器',1160,44,280,916,right,`${fill('surface')} border-l border-[#e5e7eb]`)],`${fill('surface')} overflow-hidden`);
}

const page = (id,name,content) => `import { Page, Frame, Rect, Ellipse, Text, Vector } from '@rea/design';\n\nexport default (\n<Page id=${attr(id)} designId="page-root" name=${attr(name)} className="bg-[#e2e5eb]">\n${content}\n</Page>\n);\n`;
const files = {
  'pages/home.page.tsx': page('home','首页 · 工作空间',homePage()),
  'pages/editor.page.tsx': page('editor','编辑器 · 画布与属性',editorPage()),
};
const manifest = { format:'reaui', version:2, id:'doc_reaui_app', name:'ReaUI_App', pages:Object.keys(files).map(file=>({id:file.split('/')[1].split('.')[0],file})), createdAt:'2026-11-03T00:00:00.000Z' };
files['rea.json'] = JSON.stringify(manifest,null,2);
const output = new URL('../examples/ReaUI_App/',import.meta.url);
mkdirSync(new URL('pages/',output),{recursive:true});
const entries = Object.fromEntries(Object.keys(files).sort().map(path=> {
  writeFileSync(new URL(path,output),files[path]);
  return [path,[strToU8(files[path]),{mtime:new Date(1980,0,1),level:6}]];
}));
writeFileSync(new URL('ReaUI_App.reaui',root),zipSync(entries,{level:6}));
console.log(`Created ${fileURLToPath(new URL('ReaUI_App.reaui',root))}: 2 pages, ${sequence} editable layers.`);
