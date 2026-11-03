import { Component, Components, Frame, Instance, Polygon, Slot, Star, Text } from '@rea/design';
export default <Components>
<Component id="icon-star" designId="definition-star" name="星形图标"><Star designId="icon-star-root" className="relative w-10 h-10 fill-[#5862EE]" count={5} innerRatio={0.45}/></Component>
<Component id="icon-triangle" designId="definition-triangle" name="三角形图标"><Polygon designId="icon-triangle-root" className="relative w-10 h-10 fill-[#5862EE]" count={3}/></Component>
<Component id="card-main" designId="definition-card" name="内容卡片" parameters={{title:{type:'string',default:'把想法变成组件'},icon:{type:'instance',default:'icon-star'},'show-meta':{type:'boolean',default:true},width:{type:'number',default:440}}} variants={[{name:'常规',axes:{size:'default',state:'normal'},overrides:{'card-root':{styles:{bg:'#FFFFFF'}}}},{name:'柔和',axes:{size:'default',state:'muted'},overrides:{'card-root':{styles:{bg:'#EEF0FF'}}}}]}>
  <Frame designId="card-root" className="relative w-[440px] h-[240px] bg-white rounded-2xl border border-[#E0E3ED]" bindings={{'style:width':'width'}}>
    <Instance designId="card-icon" component="icon-star" bindings={{component:'icon'}} className="absolute left-6 top-6"/>
    <Text designId="card-title" className="absolute left-20 top-7 w-[320px] h-8 text-xl font-semibold text-[#252938]" binding="title"/>
    <Slot designId="card-body" name="正文插槽" slotId="body-main" accepts={['Text','Instance']} className="absolute left-6 top-24 w-[392px] h-[88px]"><Text designId="card-default" className="absolute left-0 top-0 w-[392px] h-16 text-base text-[#697082]">在实例里填充正文；修改主组件，关联实例会同步。</Text></Slot>
    <Text designId="card-meta" className="absolute left-6 top-[204px] w-[392px] h-5 text-xs text-[#697082]" bindings={{visible:'show-meta'}}>关联实例 · 支持属性与插槽</Text>
  </Frame>
</Component>
</Components>;
