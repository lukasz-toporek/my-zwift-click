# Changelog

## v0.1.0 — 2026-10-29

First public release.

### Features

- **BLE scanning** — auto-discovers Zwift Click over Bluetooth LE; reconnects on drop
- **Gear shifting** — maps Plus/Min buttons to configurable keystrokes (default: `k` up, `i` down for MyWhoosh)
- **System tray** — runs silently in the Windows notification area with connect status and Exit option
- **No-console exe** — PE subsystem patched to WINDOWS (2); no terminal window on launch
- **Zero dependencies** — single `.exe` + two side-car files; no Node.js required on target machine
- **Log file** — writes `my-zwift-click.log` next to the exe when running as a bundled exe
- **`config.yaml`** — auto-created on first run; lets users remap buttons and keys

### Technical

- TypeScript / Node.js source bundled with `@yao-pkg/pkg` v6.24.0 targeting node22-win-x64
- BLE via `@stoprocent/noble` with `node-gyp-build` nearby-fallback for the native `.node` addon
- System tray via `systray2` Go binary (`tray_windows_release.exe`)
- Keyboard injection via `robotjs`

### Known issues

- System tray icon may render as a small colored square on some Windows builds (cosmetic only)
