import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync('cargo', ['build', '-p', 'rea-geometry', '--release', '--target', 'wasm32-unknown-unknown'], { cwd: root, stdio: 'inherit' });
const output = new URL('../packages/geometry/generated/', import.meta.url);
mkdirSync(output, { recursive: true });
copyFileSync(new URL('../target/wasm32-unknown-unknown/release/rea_geometry.wasm', import.meta.url), new URL('rea_geometry.wasm', output));
