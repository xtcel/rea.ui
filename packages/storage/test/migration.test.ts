import { describe, expect, it } from 'vitest';
import { indexedDB as fakeIndexedDB } from 'fake-indexeddb';
import { parseManifest, parsePage } from '@rea/document';
import {
  StorageService,
  bootstrapStorage,
  createDefaultV2Document,
  migrateV1ToV2,
  styleToTailwindClasses,
} from '../src/index';

const V1_SAMPLE = `import { DesignDocument, Page, Frame, Text, Vector } from '@rea/design';

export default (
  <DesignDocument version={1} name="我的应用">
    <Page designId="page-main" id="main" name="首页"
      viewports={[
        { id: 'desktop', name: '桌面端', width: 960, height: 640 },
        { id: 'mobile', name: '移动端', width: 375, height: 667 },
      ]}>
      <Frame designId="board-root" name="画板容器" layout="free" width="100%" height="100%" style={{ background: '#ffffff' }}>
        <Text designId="title-main" name="标题" position="absolute" x={72} y={64} width={700} height={80}
          style={{ fontSize: 36, fontWeight: 600, color: '#242b3a', letterSpacing: '0.02em' }}>
          从这里开始设计
        </Text>
        <Frame designId="shape-card" name="矩形卡片" data-shape="rectangle" layout="free" position="absolute"
          x={72} y={240} width={300} height={220} style={{ background: '#dce8ff', borderRadius: 16 }} />
        <Vector designId="shape-ellipse" name="椭圆头像" data-shape="ellipse" position="absolute"
          x={460} y={240} width={220} height={220} viewBox="0 0 100 100"
          d="M50 0 A50 50 0 1 1 50 100 A50 50 0 1 1 50 0 Z" fill="#d9eee3" />
      </Frame>
    </Page>
  </DesignDocument>
);`;

describe('packages/storage - Migration & Bootstrap', () => {
  describe('7.1 & 7.5 v1 到 v2 迁移', () => {
    it('converts style objects into Tailwind classes and arbitrary property classes', () => {
      const classes = styleToTailwindClasses({
        background: '#dce8ff',
        borderRadius: 16,
        letterSpacing: '0.02em',
        fontWeight: 600,
      });

      expect(classes).toContain('bg-[#DCE8FF]');
      expect(classes).toContain('rounded-2xl');
      expect(classes).toContain('[letter-spacing:0.02em]');
      expect(classes).toContain('font-semibold');
    });

    it('migrates multiple viewports with horizontal arrangement and regenerated designIds', () => {
      const v2Doc = migrateV1ToV2(V1_SAMPLE);
      expect(v2Doc.name).toBe('我的应用');
      expect(v2Doc.manifest.pages.length).toBe(1);

      const pageCode = v2Doc.files['pages/main.page.tsx'];
      expect(pageCode).toBeDefined();

      // Viewport 1 at left-[0px], Viewport 2 at left-[1024px] (960 + 64)
      expect(pageCode).toContain('left-[0px]');
      expect(pageCode).toContain('left-[1024px]');

      // Rect and Ellipse converted
      expect(pageCode).toContain('<Rect');
      expect(pageCode).toContain('<Ellipse');

      // Second viewport's designIds are regenerated
      expect(pageCode).toContain('shape-card-v2');
      expect(pageCode).toContain('shape-ellipse-v2');

      // Validates that page passes v2 parser
      const parsed = parsePage(pageCode, 'pages/main.page.tsx');
      expect(parsed.page.id).toBe('main');
    });
  });

  describe('7.4 内置示例文档', () => {
    it('creates a valid v2 welcome document with two artboards and primitives', () => {
      const doc = createDefaultV2Document();
      expect(doc.manifest.pages.length).toBe(1);

      const parsedManifest = parseManifest(doc.files['rea.json']);
      expect(parsedManifest.version).toBe(2);

      const parsedPage = parsePage(doc.files['pages/main.page.tsx'], 'pages/main.page.tsx');
      expect(parsedPage.page.id).toBe('main');

      // Contains Rect, Ellipse, Text
      const kinds = Array.from(parsedPage.page.nodes.values()).map((n) => n.kind);
      expect(kinds).toContain('Frame');
      expect(kinds).toContain('Rect');
      expect(kinds).toContain('Ellipse');
      expect(kinds).toContain('Text');
    });
  });

  describe('7.2 启动与自举流程', () => {
    it('creates welcome document when IndexedDB is empty and no localStorage exists', async () => {
      const storage = new StorageService(fakeIndexedDB);
      const doc = await bootstrapStorage(storage);
      expect(doc.name).toBe('欢迎使用 REA UI');

      const docsInStorage = await storage.listDocuments();
      expect(docsInStorage.length).toBe(1);
    });
  });
});

describe('migration edge cases', () => {
  it('migrates a single viewport, retains root styles, flags and special text safely', () => {
    const one = V1_SAMPLE.replace(",\n        { id: 'mobile', name: '移动端', width: 375, height: 667 }", '').replace('从这里开始设计', '{"special < & \\" text"}').replace('style={{ background: \'#ffffff\' }}', 'locked style={{ background: \'#dce8ff\' }}');
    const doc = migrateV1ToV2(one);
    const page = parsePage(doc.files['pages/main.page.tsx']).page;
    expect([...page.nodes.values()].filter(n => n.kind === 'Frame' && n.parentId === page.source.props.designId)).toHaveLength(1);
    expect(page.nodes.get('artboard-1')!.element.props.className).toContain('bg-[#DCE8FF]');
    expect(page.nodes.get('shape-card')!.locked).toBe(true);
  });
  it('rejects dynamic legacy modules and corrupted versions', () => {
    expect(() => migrateV1ToV2(V1_SAMPLE + '\nconsole.log("run");')).toThrow();
    expect(() => migrateV1ToV2(V1_SAMPLE.replace('version={1}', 'version={2}'))).toThrow('version');
    expect(() => migrateV1ToV2(V1_SAMPLE.replace('x={72}', 'x={getX()}'))).toThrow('动态表达式');
  });
  it('keeps legacy data and never migrates it twice', async () => {
    const { IDBFactory } = await import('fake-indexeddb');
    const storage = new StorageService(new IDBFactory());
    const legacy = { getItem: () => V1_SAMPLE };
    const doc = await bootstrapStorage(storage, legacy);
    expect(doc.name).toBe('我的应用'); expect(await storage.getMeta('migrated:v1')).toBe(true);
    expect(legacy.getItem()).toBe(V1_SAMPLE);
    const again = await bootstrapStorage(storage, legacy); expect(again.id).toBe(doc.id);
    expect(await storage.listDocuments()).toHaveLength(1); await storage.close();
  });
  it('falls back to the sample for damaged localStorage without deleting it', async () => {
    const { IDBFactory } = await import('fake-indexeddb');
    const storage = new StorageService(new IDBFactory());
    const legacy = { getItem: () => 'broken data' };
    expect((await bootstrapStorage(storage, legacy)).name).toBe('欢迎使用 REA UI');
    expect(legacy.getItem()).toBe('broken data'); await storage.close();
  });
});
