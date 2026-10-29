/**
 * Creates dist/my-zwift-click-v0.1.0-windows-x64.zip containing:
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

const files = [
  'my-zwift-click.exe',
  'prebuilds/win32-x64/node.napi.node',
  'traybin/tray_windows_release.exe',
  'config.yaml',
];

for (const f of files) {
  const full = path.join(distDir, f);
  if (!fs.existsSync(full)) {
    console.error(`Missing required file: ${f}`);
    process.exit(1);
  }
}

if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Use PowerShell Compress-Archive (available on all modern Windows)
const fileArgs = files.map(f => `"${path.join(distDir, f).replace(/\//g, '\\')}"`).join(',');
const cmd = `powershell -NoProfile -Command "Compress-Archive -Path ${fileArgs} -DestinationPath '${zipPath.replace(/\//g, '\\')}'"`;
execSync(cmd, { stdio: 'inherit' });

const size = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log(`Created ${zipName} (${size} MB)`);
