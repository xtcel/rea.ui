import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from '@rea/editor';
import './theme.css';
import { initGeometry } from '@rea/geometry';

initGeometry().then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode><EditorApp /></StrictMode>,
)).catch(error => { document.getElementById('root')!.textContent = `启动失败：${String(error)}`; });
