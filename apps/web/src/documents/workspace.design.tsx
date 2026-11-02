import { DesignDocument, Page, Frame, Text, Vector } from '@rea/design';

export default (
  <DesignDocument version={1} name="我的设计">
    <Page designId="page-main" id="main" name="画板 1"
      viewports={[{ id: 'desktop', name: '画板 1', width: 960, height: 640 }]}>
      <Frame designId="board-root" name="画板容器" layout="free" width="100%" height="100%" style={{ background: '#ffffff' }}>
        <Text designId="title-main" name="标题" position="absolute" x={72} y={64} width={700} height={80}
          style={{ fontSize: 36, fontWeight: 600, color: '#242b3a' }}>从这里开始设计</Text>
        <Text designId="subtitle-main" name="说明" position="absolute" x={72} y={142} width={700} height={40}
          style={{ fontSize: 16, color: '#6b7484' }}>选择工具栏中的形状，在画板上拖动绘制。</Text>
        <Frame designId="shape-card" name="矩形" data-shape="rectangle" layout="free" position="absolute"
          x={72} y={240} width={300} height={220} style={{ background: '#dce8ff', borderRadius: 16 }} />
        <Vector designId="shape-ellipse" name="椭圆" data-shape="ellipse" position="absolute"
          x={460} y={240} width={220} height={220} viewBox="0 0 100 100"
          d="M50 0 A50 50 0 1 1 50 100 A50 50 0 1 1 50 0 Z" fill="#d9eee3" />
      </Frame>
    </Page>
  </DesignDocument>
);
