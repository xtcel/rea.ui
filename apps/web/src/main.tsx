import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HomeApp, installDesktopExample } from '@rea/editor';
import appDesignUrl from '../../../ReaUI_App.reaui?url';
import './theme.css';
import './home.css';
import { initGeometry } from '@rea/geometry';

Promise.all([initGeometry(), installDesktopExample(appDesignUrl).catch(error => console.warn('内置设计示例导入失败，可手动导入 ReaUI_App.reaui。', error))]).then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode><HomeApp /></StrictMode>,
)).catch(error => { document.getElementById('root')!.textContent = `启动失败：${String(error)}`; });
