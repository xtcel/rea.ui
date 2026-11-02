import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from '@rea/editor';
import '@rea/editor/styles.css';
import { initGeometry } from '@rea/geometry';
import sourceCode from './documents/workspace.design.tsx?raw';

initGeometry().then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode><EditorApp sourceCode={sourceCode} filename="workspace.design.tsx" /></StrictMode>,
)).catch(error => { document.getElementById('root')!.textContent = `启动失败：${String(error)}`; });
