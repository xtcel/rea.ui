import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HomeApp, SettingsApp, installDesktopExample, isSettingsLocation } from '@rea/editor';
import appDesignUrl from '../../../ReaUI_App.reaui?url';
import './theme.css';
import './home.css';
import './settings.css';
import { initGeometry } from '@rea/geometry';

const root = createRoot(document.getElementById('root')!);

// 设置窗口复用同一份构建产物，用 hash 区分入口，避免为它单独打包。
if (isSettingsLocation()) {
  root.render(<StrictMode><SettingsApp /></StrictMode>);
} else {
  Promise.all([initGeometry(), installDesktopExample(appDesignUrl).catch(error => console.warn('内置设计示例导入失败，可手动导入 ReaUI_App.reaui。', error))]).then(() => root.render(
    <StrictMode><HomeApp /></StrictMode>,
  )).catch(error => { root.render(<div style={{ padding: 24, fontFamily: 'system-ui', fontSize: 13 }}>启动失败：{String(error)}</div>); });
}
