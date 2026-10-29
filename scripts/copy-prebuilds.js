/**
 * Copies native side-car files next to dist/my-zwift-click.exe after pkg bundling.
 *
 * pkg.assets in package.json is not read when pkg is called with a JS entry point,
 * so we copy everything manually here.
 *
 * Files placed next to the exe:
 *   prebuilds/win32-x64/node.napi.node  — noble BLE addon (found via node-gyp-build "nearby" fallback)
 *   traybin/tray_windows_release.exe    — systray2 Go binary (found via path.join('.', 'traybin', ...))
 */
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');

const copies = [
  {
    src: path.join(root, 'node_modules', '@stoprocent', 'noble', 'prebuilds', 'win32-x64', 'node.napi.node'),
    dest: path.join(distDir, 'prebuilds', 'win32-x64', 'node.napi.node'),
  },
  {
    src: path.join(root, 'node_modules', 'systray2', 'traybin', 'tray_windows_release.exe'),
    dest: path.join(distDir, 'traybin', 'tray_windows_release.exe'),
  },
];

for (const { src, dest } of copies) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  const rel = (p) => path.relative(root, p);
  console.log(`Copied ${rel(src)} → ${rel(dest)}`);
}
