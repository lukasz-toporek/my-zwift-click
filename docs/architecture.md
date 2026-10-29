# Architecture: my-zwift-click

**Decision date**: 2026-10-29  
**Status**: Awaiting user approval before implementation begins.

---

## Constraints (from Phase 1 research + user answers)

| Constraint | Value |
|---|---|
| KICKR CORE BLE slots | 3 max; MyWhoosh takes 1 → **2 slots free** |
| MyWhoosh connection to trainer | Bluetooth (not ANT+) |
| MyWhoosh window state during ride | Always focused / full-screen |
| Gear model | MyWhoosh native MyShift — 30 gears, keyboard I / K |
| Click hardware version | Unknown until scan; **must auto-detect V1 vs V2** |
| Target OS | Windows 10/11 first; macOS/Linux later |
| User profile | Novice-friendly install, CLI for dev/power users |

---

## Option A — Keyboard Emulation (Recommended ✅)

```
┌──────────────────┐  BLE (slot 1)  ┌─────────────────┐
│   KICKR CORE     │◄──────────────►│   MyWhoosh      │
└──────────────────┘                └────────┬────────┘
                                             │ keyboard I / K
                                    ┌────────▼────────┐
┌──────────────────┐  BLE (slot 2) │  my-zwift-click │
│   Zwift Click    │◄──────────────►│  (Node.js CLI)  │
└──────────────────┘                └─────────────────┘
```

**How it works:**
1. Tool scans for Zwift Click by manufacturer ID `0x094A`
2. Detects V1 / V2 from manufacturer data byte 3
3. Connects, performs "RideOn" handshake, subscribes to button notifications
4. On button press: maps button → keyboard key (configurable in YAML)
5. Injects keypress to MyWhoosh process via Windows SendInput API
6. MyWhoosh's native MyShift engine handles gear state (30 gears)
7. Keepalive "RideOn" every 3 s; auto-reconnect on drop

**Latency budget:**
- BLE notification → button detection: ~10–15 ms
- Key injection: <5 ms
- MyWhoosh gear change (hardware): ~100–200 ms (trainer physics)
- **Total perceived delay**: ~150–200 ms — indistinguishable from real shifting

**Pros:**
- Simple — ~400–600 lines of TS total
- No trainer protocol knowledge needed
- MyWhoosh manages all gear state (no drift, no sync issues)
- Stable: no BLE peripheral emulation, no FTMS complexity
- If MyWhoosh adds more gears later — tool needs zero changes
- Works whether trainer is BLE or ANT+

**Cons:**
- Depends on MyWhoosh having focus (mitigated: user confirmed it always does)
- If Zwift updated Click V2 firmware to use UUID `fc82` — need to update scanner (low risk, detectable)
- Cannot inject custom gear curves (user said not needed)

---

## Option B — BLE Proxy / FTMS Bridge (Not recommended for MVP)

```
┌──────────────────┐  BLE (slot 1)  ┌─────────────────┐
│   KICKR CORE     │◄──────────────►│  my-zwift-click │◄──── BLE (virtual FTMS) ────► MyWhoosh
└──────────────────┘                │  (Node.js)      │
┌──────────────────┐  BLE (slot 2) └─────────────────┘
│   Zwift Click    │◄──────────────►│
└──────────────────┘
```

Tool sits between MyWhoosh and KICKR CORE: connects to real trainer as central, exposes a virtual FTMS trainer as BLE peripheral for MyWhoosh, and applies gear resistance manually.

**Why not for this project:**
1. Windows BLE peripheral mode requires UWP + `@stoprocent/bleno` — poorly documented, unstable
2. Requires reimplementing the full FTMS control point protocol (write ops, error handling, resistance math)
3. MyWhoosh may reject a fake FTMS trainer (known issue with proxy apps)
4. Using 2 BLE slots on one radio for both central + peripheral stresses the Windows BLE stack
5. 3–5× more code, much harder to debug
6. Provides no user-visible benefit: the user wants native 30 gears, which Option A already delivers
7. Adds failure modes: if proxy crashes mid-ride, trainer loses connection entirely

**When Option B would make sense:** custom cassette simulation (specific watt steps per gear), use with apps that have no keyboard shortcuts, or BLE peripheral mode specifically requested by community.

---

## Option C — Android/Phone Bridge (Out of scope)

BikeControl does this: run on Android phone, connect to Click as BLE HID, inject keystrokes. Discarded — user is on Windows, wants a Windows-native tool.

---

## Decision: Option A

**Chosen architecture: keyboard emulation via BLE central + SendInput**

---

## Component Design (Option A)

```
src/
├── ble/
│   ├── scanner.ts          # Scan for Zwift Click by manufacturer ID 0x094A
│   ├── connection.ts       # Connect, handshake, subscribe, keepalive, reconnect
│   ├── protocol/
│   │   ├── constants.ts    # UUIDs, company ID, side bytes, msg types
│   │   ├── handshake.ts    # "RideOn" write sequence
│   │   └── parser.ts       # Parse protobuf bitmap from notification bytes
├── gear/
│   ├── shifter.ts          # Maps button press → gear direction (up/down)
│   └── config.ts           # Load gear/button mapping from YAML
├── keyboard/
│   └── injector.ts         # Windows SendInput (robotjs or keysender)
├── cli/
│   └── index.ts            # Commander CLI: --debug, --simulate, --config
├── simulator/
│   ├── mock-click.ts       # Emits fake button press events (for dev without hardware)
│   └── mock-trainer.ts     # Stub (not needed for Option A, kept for future)
└── config/
    └── default.yaml        # Default button mapping and settings
```

### Auto-detection of Click V1 vs V2

During scan, inspect manufacturer data:
```
byte[2] (0-indexed) = side_byte
  0x09 → Click V1  (single device)
  0x0A → Click V2 Right pod
  0x0B → Click V2 Left pod
```

For V2: connect to BOTH pods. LEFT pod may need the Zwift unlock (handled with retry/warning).

For V1: connect to single device, use message type `0x37`.
For V2: use message type `0x23`.

### Button mapping (configurable)

Default in `config.yaml`:
```yaml
buttons:
  gear_up: PLUS      # 0x1000 — the "+" button (right pod / right shifter)
  gear_down: B       # 0x020  — the "-" equivalent
mywhoosh:
  gear_up_key: k     # confirmed: K = gear up in MyWhoosh
  gear_down_key: i   # confirmed: I = gear down in MyWhoosh
  process_name: MyWhoosh   # window title match for keysender
```

The bit→name mapping is fully configurable, so if the user finds PLUS sends gears down (possible — needs hardware test), they just swap in the config.

### Auto-reconnect strategy

```
Disconnect detected
  → wait 1 s
  → re-scan (10 s scan burst)
  → reconnect + re-handshake
  → if 3 consecutive failures: log warning, keep retrying every 30 s
  → never crash the process
```

### Debug mode (`--debug`)

Logs every raw BLE frame as hex to `zwift-click-debug-YYYY-MM-DD.log`:
```
[14:23:01.442] NOTIFY 0002 raw=23 08 FE FF FF FF ...  parsed={PLUS:pressed}
[14:23:04.442] WRITE  0003 raw=52 69 64 65 4F 6E  (keepalive)
```

---

## Technology Stack

| Concern | Library | Why |
|---|---|---|
| BLE (Windows native) | `@stoprocent/noble` v2.x | WinRT bindings, no Zadig driver swap, active maintenance |
| Keyboard injection | `keysender` | Injects to window by process name; works if focus slips |
| Config parsing | `js-yaml` | Simple, zero deps |
| CLI | `commander` | Standard Node.js CLI |
| Packaging (standalone .exe) | `pkg` or `@yao-pkg/pkg` | Single binary, no Node.js install needed for end users |
| Testing | `vitest` | Fast, TypeScript-native |
| BLE mocking in tests | custom EventEmitter stubs | No real hardware needed for unit tests |

---

## Development Phases (post-approval)

### Phase 3a — Core BLE + Keyboard (MVP)
- [ ] `@stoprocent/noble` scanner + V1/V2 auto-detect
- [ ] Handshake + subscribe + keepalive
- [ ] Protobuf parser (field1 bitmap decode)
- [ ] Button → key mapping with configurable YAML
- [ ] keysender injection to MyWhoosh
- [ ] Auto-reconnect loop
- [ ] `--debug` logging

### Phase 3b — Simulator + Polish
- [ ] `--simulate` mode: mock Click emitting fake events
- [ ] Graceful shutdown (SIGINT → disconnect BLE cleanly)
- [ ] `--list-devices` to show all discovered Click adapters
- [ ] Tray icon (systray) wrapper for non-CLI use

### Phase 4 — Quality + Publish
- [ ] Unit tests: parser, button mapper, reconnect logic
- [ ] GitHub Actions: lint + test + build .exe
- [ ] README (EN + PL), CONTRIBUTING.md, issue templates
- [ ] MIT license

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Click V2 LEFT pod locked (needs Zwift) | Medium (V2 only) | Auto-detect; warn with instructions if locked |
| `@stoprocent/noble` WinRT issues on specific BT adapters | Low–Medium | Test on hardware; dongle fallback documented in README |
| MyWhoosh removes I/K shortcuts | Very low | Config lets user remap; documented |
| Click V2 firmware changed service UUID to FC82 | Low | Scan both UUIDs |
| Key injection blocked by Windows UAC / game overlay | Low (MyWhoosh not a game in that sense) | `keysender` bypasses most blockers; SendInput fallback |

---

## What is NOT in scope (MVP)

- BLE peripheral / FTMS proxy
- ANT+ support
- macOS / Linux (designed for, but not tested — platform-specific BLE bindings needed)
- Custom resistance curves / watt-per-gear math
- Zwift Play support (encrypted protocol, different use case)
- Companion mobile app
