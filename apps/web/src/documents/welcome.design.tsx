import { DesignDocument, Page, Frame, Text, Vector } from '@rea/design';

export default (
  <DesignDocument version={1} name="起始文档">
    <Page designId="page-welcome" id="welcome" name="欢迎"
      viewports={[
        { id: 'desktop', name: '桌面', width: 760, height: 560 },
        { id: 'mobile', name: '手机', width: 390, height: 680 },
      ]}>
      <Frame designId="welcome-root" name="欢迎页面" layout="flex" gap={44} padding={40}
        style={{ background: '#ffffff', minHeight: '100%', fontFamily: 'inherit', color: '#202426' }}>
        <Frame designId="welcome-header" name="页眉" direction="row" gap={10}
          style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Text designId="welcome-brand" name="品牌" style={{ fontSize: 18, fontWeight: 700 }}>Forma.</Text>
          <Text designId="welcome-issue" name="期号" style={{ fontSize: 12, color: '#67716d' }}>设计笔记 / 001</Text>
        </Frame>
        <Frame designId="welcome-intro" name="标题区域" gap={16}>
          <Text designId="welcome-title" name="主标题" as="h1"
            style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.035em', maxWidth: 480 }}>
            {'好想法，\n从一张画布开始。'}
          </Text>
          <Text designId="welcome-description" name="说明"
            style={{ fontSize: 14, color: '#67716d', lineHeight: 1.8, maxWidth: 460 }}>
            在这里整理灵感，探索排版，让每一个细节都有自己的位置。
          </Text>
        </Frame>
        <Frame designId="welcome-cards" name="内容区域" layout="grid" gap={16}
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Frame designId="note-card" name="灵感卡片" gap={14} padding={24}
            style={{ background: '#edf3ef', borderRadius: 12 }}>
            <Vector designId="note-icon" name="线条图形" width={28} height={28} viewBox="0 0 28 28"
              d="M5 20L14 4L23 20H5ZM9 24H19" stroke="#456e57" strokeWidth={1.5} />
            <Text designId="note-title" name="卡片标题" as="h2"
              style={{ fontSize: 16, fontWeight: 600 }}>留一点空间给灵感</Text>
            <Text designId="note-copy" name="卡片说明"
              style={{ fontSize: 12, color: '#506859', lineHeight: 1.7 }}>从简单的形状与文字，开始下一次探索。</Text>
          </Frame>
          <Frame designId="detail-card" name="细节卡片" gap={14} padding={24}
            style={{ background: '#f5f3ee', borderRadius: 12 }}>
            <Vector designId="detail-icon" name="曲线图形" width={28} height={28} viewBox="0 0 28 28"
              d="M4 22C4 8 24 20 24 6M4 6H10M18 22H24" stroke="#8a7350" strokeWidth={1.5} />
            <Text designId="detail-title" name="细节标题" as="h2"
              style={{ fontSize: 16, fontWeight: 600 }}>让细节慢慢成形</Text>
            <Text designId="detail-copy" name="细节说明"
              style={{ fontSize: 12, color: '#786b57', lineHeight: 1.7 }}>调整节奏，发现结构，找到恰好的表达。</Text>
          </Frame>
        </Frame>
      </Frame>
    </Page>
  </DesignDocument>
);
