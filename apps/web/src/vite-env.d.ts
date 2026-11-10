/// <reference types="vite/client" />

/** 由 apps/web/vite.config.ts 在构建时从 package.json 注入；未走该配置的测试环境可能没有定义。 */
declare const __REAUI_EDITOR_VERSION__: string;
declare const __REAUI_CLI_VERSION__: string;
