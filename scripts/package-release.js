/**
 * Creates dist/my-zwift-click-v0.1.1-windows-x64.zip containing:
 *   my-zwift-click.exe
 *   prebuilds/win32-x64/node.napi.node
 *   traybin/tray_windows_release.exe
 *   config.yaml
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const version = require(path.join(root, 'package.json')).version;
const zipName = `my-zwift-click-v${version}-windows-x64.zip`;
const zipPath = path.join(distDir, zipName);

// Pass directories (not individual files) so Compress-Archive preserves structure.
// prebuilds\ and traybin\ end up as subdirectories inside the zip.
const items = [
  'my-zwift-click.exe',
  'prebuilds',
  'traybin',
  'config.yaml',
];

for (const item of items) {
  if (!fs.existsSync(path.join(distDir, item))) {
    console.error(`Missing required item: ${item}`);
    process.exit(1);
  }
}

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Use PowerShell Compress-Archive (available on all modern Windows)
const itemArgs = items.map(f => `"${path.join(distDir, f).replace(/\//g, '\\')}"`).join(',');
const cmd = `powershell -NoProfile -Command "Compress-Archive -Path ${itemArgs} -DestinationPath '${zipPath.replace(/\//g, '\\')}'"`;
execSync(cmd, { stdio: 'inherit' });

const size = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log(`Created ${zipName} (${size} MB)`);

