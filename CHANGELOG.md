# Changelog

## v0.1.1 — 2026-10-30

### Fixed

- **System tray icon** — replaced PNG with native Windows ICO (DIB format); icon is now visible on all taskbar colors and themes
- **First-run notifications** — app now shows a Windows toast banner on startup ("Running in system tray") and a second banner on first run ("Config file created…")
- **First-run config** — `config.yaml` opens automatically in the default editor on first launch so users can review key bindings immediately
- **Toast delivery** — fixed two silent failures: missing `ShowBanner` registry key (notifications were going to Action Center only) and `detached: true` losing the interactive desktop context

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

- ~~System tray icon may render as a small colored square~~ — fixed in v0.1.1
