// Preflight for `tauri build --bundles dmg`.
//
// create-dmg mounts a read-write copy as a volume named after the product and then drives Finder
// with `tell disk "ReaUI"`, so the layout step and the following `hdiutil detach` both address the
// volume by name. Every failed bundle leaves that volume mounted, and so does opening a built .dmg
// to try the app. Once one or two stale copies are still attached, Finder writes .DS_Store into a
// read-only stale copy, the fresh image never becomes idle, and the bundle dies with
// `hdiutil: couldn't unmount "disk8" - Resource busy`. Eject images backed by files under this
// repository's target/ before bundling so a retry starts from a clean mount table.
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { sep } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') process.exit(0);

const root = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
const canonical = path => {
    try {
        return realpathSync(path);
    } catch {
        return path;
    }
};
const owned = path => path.startsWith(root + sep) || canonical(path).startsWith(root + sep);

const stale = [];
let image = null;
for (const line of execFileSync('hdiutil', ['info'], { encoding: 'utf8' }).split('\n')) {
    const path = /^image-path\s*:\s*(.+)$/.exec(line);
    if (path) {
        image = path[1].trim();
        continue;
    }
    const device = /^(\/dev\/disk\d+)(?:s\d+)?\s+\S+\s+(\/Volumes\/.+)$/.exec(line);
    if (device && image && owned(image)) stale.push({ image, device: device[1], volume: device[2].trim() });
}

if (stale.length === 0) {
    console.log('No disk image from target/ is mounted');
    process.exit(0);
}

let failed = 0;
for (const { image, device, volume } of stale) {
    try {
        execFileSync('hdiutil', ['detach', device], { stdio: 'pipe' });
        console.log(`Ejected ${device} ${volume} (${image.slice(root.length + 1)})`);
    } catch (error) {
        failed += 1;
        const reason = error.stderr?.toString().trim() || error.message;
        console.error(`Could not eject ${device} ${volume}: ${reason}`);
    }
}

if (failed > 0) {
    console.error('Quit any app running from these volumes, then rerun the bundle command.');
    process.exit(1);
}
