import { isDesktop } from '../platform';

export const SETTINGS_WINDOW_LABEL = 'settings';
const SETTINGS_HASH = '#settings';

/** 当前页面是独立设置窗口。 */
export function isSettingsLocation(): boolean {
  return location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] === 'settings';
}

function settingsUrl(): string {
  const url = new URL(location.href);
  url.hash = SETTINGS_HASH;
  return url.href;
}

function surfaceColor(): string {
  return document.documentElement.dataset.theme === 'dark' ? '#1b1e23' : '#ffffff';
}

/**
 * 打开独立的设置窗口：桌面端是真正的多窗口，浏览器端是弹出窗口。
 * 弹出窗口被拦截或环境不允许时返回 'in-app'，由调用方渲染应用内设置页。
 */
export async function openSettingsWindow(): Promise<'window' | 'in-app'> {
  if (isDesktop()) {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const existing = await WebviewWindow.getByLabel(SETTINGS_WINDOW_LABEL);
      if (existing) {
        await existing.unminimize();
        await existing.show();
        await existing.setFocus();
        return 'window';
      }
      const window = new WebviewWindow(SETTINGS_WINDOW_LABEL, {
        url: 'index.html#settings',
        title: '设置',
        width: 1000,
        height: 720,
        minWidth: 760,
        minHeight: 560,
        center: true,
        resizable: true,
        backgroundColor: surfaceColor(),
      });
      // 创建失败时不能让用户点了没反应：回退到应用内设置页。
      const created = await new Promise<boolean>(resolve => {
        const timer = setTimeout(() => resolve(true), 4000);
        void window.once('tauri://created', () => { clearTimeout(timer); resolve(true); });
        void window.once('tauri://error', () => { clearTimeout(timer); resolve(false); });
      });
      return created ? 'window' : 'in-app';
    } catch {
      return 'in-app';
    }
  }
  try {
    const popup = window.open(settingsUrl(), 'rea-settings', 'popup=yes,width=1000,height=720');
    return popup ? 'window' : 'in-app';
  } catch {
    return 'in-app';
  }
}
