import { Frame, Instance, Line, Page, Polygon, SlotContent, Star, Text, Vector } from '@rea/design';
export default <Page id="main" designId="page-main" name="矢量与组件">
<Frame designId="frame-showcase" name="矢量与组件 · 功能示例" className="absolute left-0 top-0 w-[1280px] h-[820px] bg-[#F7F8FC]">
<Text designId="showcase-title" className="absolute left-12 top-10 w-[1150px] h-14 text-4xl font-semibold text-[#252938]">从形状，到可复用的设计。</Text>
<Text designId="showcase-description" className="absolute left-12 top-[108px] w-[1150px] h-8 text-base text-[#697082]">形状参数 · 贝塞尔路径 · 组件属性 · 变体 · 插槽 · 本地组件库</Text>
<Text designId="section-shapes" className="absolute left-12 top-[180px] w-[550px] h-8 text-lg font-semibold text-[#252938]">01 / 形状与箭头</Text>
<Line designId="line-main" name="线条" className="absolute left-12 top-[264px] w-[160px] h-[1px] stroke-[#5862EE] stroke-2 fill-none" x1={0} y1={0} x2={100} y2={0}/>
<Line designId="arrow-main" name="箭头" className="absolute left-12 top-[318px] w-[160px] h-[1px] stroke-[#252938] stroke-2 fill-none" x1={0} y1={0} x2={100} y2={0} endArrow={true}/>
<Polygon designId="triangle-main" name="三角形" className="absolute left-[252px] top-[236px] w-20 h-20 fill-[#ADB6FF]" count={3}/>
<Star designId="star-main" name="星形" className="absolute left-[372px] top-[236px] w-20 h-20 fill-[#5862EE]" count={5} innerRatio={0.45}/>
<Polygon designId="polygon-main" name="多边形" className="absolute left-[492px] top-[236px] w-20 h-20 fill-[#A6CFBC]" count={6}/>
<Text designId="section-paths" className="absolute left-12 top-[414px] w-[550px] h-8 text-lg font-semibold text-[#252938]">02 / 双击路径，编辑锚点与控制柄</Text>
<Vector designId="bezier-main" name="贝塞尔曲线" className="absolute left-12 top-[482px] w-[520px] h-[120px] fill-none stroke-[#5862EE] stroke-2" viewBox="0 0 520 120" path={{closed:false,anchors:[{id:'a-one',x:0,y:100,out:[100,-160],mode:'smooth'},{id:'a-two',x:260,y:60,in:[-100,160],out:[100,-160],mode:'mirror'},{id:'a-three',x:520,y:30,in:[-100,160],mode:'smooth'}]}}/>
<Text designId="path-instructions" className="absolute left-12 top-[660px] w-[560px] h-20 text-sm text-[#697082]">P 钢笔 · Shift+P 铅笔
在工具栏选择形状。按 Shift 约束方向或比例，按 Alt 从中心绘制。
放大画布，文字与形状会按当前比例重新绘制。</Text>
<Text designId="section-components" className="absolute left-[720px] top-[180px] w-[440px] h-8 text-lg font-semibold text-[#252938]">03 / 一个定义，多个关联实例</Text>
<Instance designId="card-first" name="常规卡片实例" component="card-main" className="absolute left-[720px] top-[236px]" values={{title:'主组件，统一维护'}} variant={{size:'default',state:'normal'}}/>
<Instance designId="card-second" name="自定义卡片实例" component="card-main" className="absolute left-[720px] top-[508px]" values={{title:'实例，保留自己的内容',icon:'icon-triangle'}} variant={{size:'default',state:'muted'}}><SlotContent designId="owned-body" slotId="body-main"><Text designId="owned-description" className="absolute left-0 top-0 w-[392px] h-20 text-base text-[#51586E]">这是实例独有的插槽正文。
切换变体、更新主组件或升级本地库，兼容的内容会保留。</Text></SlotContent></Instance>
</Frame>
</Page>;
