# Research: my-zwift-click

**Status**: Phase 1 complete. Open items marked ⚠️ require hardware confirmation.  
**Date**: 2026-10-29  
**Sources**: GitHub repos (zwiftboard, bikecontrol, zwiftplay), Makinolo blog, MyWhoosh official docs, DC Rainmaker, Zwift Insider.

---

## 1. Zwift Click — BLE Protocol

### 1.1 Device identification & hardware revisions

The "Zwift Click" brand covers at least two distinct hardware generations with **different BLE protocols**:

| Model | BLE name | Side byte | Msg type | Encryption | Two pods? |
|---|---|---|---|---|---|
| Click V1 (original) | "Zwift Click XXXX" | `0x09` | `0x37` | None | No (single unit) |
| Click V2 (2025, with Cog) | "Zwift Click Left/Right" | `0x0A` (R) / `0x0B` (L) | `0x23` | None | Yes (2 pods) |
| Zwift Play | varies | `0x02`/`0x03` | `0x07` | AES-256-CCM (ECDH) | Yes |

⚠️ **Open item**: User's device advertises as "Zwift Click 8D38". The "XXXX" suffix is the last 2 bytes of the BLE MAC address. A single advertised name strongly suggests **Click V1**, but must be confirmed with nRF Connect (see manufacturer data byte 3).

**Manufacturer data format** (5 bytes in BLE advertisements):
```
[company_lo 0x4A] [company_hi 0x09]  ← Company ID 0x094A
[side_byte]                           ← 0x09 = Click V1, 0x0A = Click V2 Right, 0x0B = Click V2 Left
[addr_lo] [addr_hi]                   ← last 2 bytes of BLE address
```

### 1.2 GATT service and characteristics

**Confirmed in source** (zwiftboard/protocol.go, bikecontrol/constants.dart):

| Role | UUID |
|---|---|
| Custom service | `00000001-19ca-4651-86e5-fa29dcdd09d1` |
| Async (notify) — button presses | `00000002-19ca-4651-86e5-fa29dcdd09d1` |
| SyncRX (write) — handshake/keepalive | `00000003-19ca-4651-86e5-fa29dcdd09d1` |
| SyncTX (indicate) — handshake reply | `00000004-19ca-4651-86e5-fa29dcdd09d1` |

Also standard: DIS `180A`, Battery `180F`.

⚠️ **Note**: After a January 2025 firmware update, the **Ride** pods switched to service UUID `0000fc82-0000-1000-8000-00805f9b34fb`. Whether Click V2 got the same update is **unconfirmed**. If so, we need to scan for both UUIDs.

### 1.3 Connection handshake (Click V1 and V2 — no encryption)

**Confirmed in source** (zwiftboard/protocol.go, bikecontrol/zwift_clickv2.dart):

```
1. Write to SyncRX: 52 69 64 65 4F 6E 02 03   ("RideOn" + 0x02 0x03)
2. Await indication on SyncTX: echoes "RideOn" → device unlocked
   If SyncTX returns 0xFF... → device locked (see V2 unlock below)
3. Write to SyncRX: 00 08 00   (info request)
4. Write to SyncRX: 00 08 10   (unknown; needed for stable state)
5. Keepalive: write 52 69 64 65 4F 6E every 3 s
```

**Click V2 LEFT pod unlock** ⚠️: zwiftboard source says "LEFT needs a ~24h hardware unlock done by the Zwift app". bikecontrol sets `usesZwiftUnlock = true` for Click V2. The locked response bytes are `FF 05 00 EA 05` or `FF 05 00 FA 05`. If the user previously paired the Click with Zwift, the unlock has already occurred.

For Click V1, no unlock is documented.

### 1.4 Button notification frame format

**Confirmed in source** (zwiftboard/protocol.go, bikecontrol):

Notifications arrive on the Async characteristic. Frame layout:
```
[msg_type: 1 byte] [protobuf fields...]
```

- Click V1 msg_type = `0x37`
- Click V2 / Ride msg_type = `0x23`
- Idle (no buttons) msg_type = `0x15` or `0x19`

**Protobuf field 1 = bitmap (varint, tag `0x08`): bit value 0 = PRESSED, 1 = not pressed.**

Button bit map (confirmed in zwiftboard/protocol.go):

| Bit | Click label | Physical location |
|---|---|---|
| `0x001` | LEFT / ← | Left pod, left arrow |
| `0x002` | UP / △ | Left pod, up arrow |
| `0x004` | RIGHT / → | Left pod, right arrow |
| `0x008` | DOWN / ▽ | Left pod, down arrow |
| `0x010` | A | Right pod |
| `0x020` | B | Right pod |
| `0x040` | Y | Right pod |
| `0x080` | Z | Right pod |
| `0x100` | MIN / − | Left pod |
| `0x1000` | PLUS / + | Right pod |

For Click V1 (single pod), the mapping ⚠️ needs hardware verification — it likely uses a subset of the above bits. V1 message type `0x37` is separately defined in bikecontrol (`CLICK_NOTIFICATION_MESSAGE_TYPE = 55`).

**Example decode** (V2, field1 = `0xFFFFFFFE`): bit 0 = 0 → LEFT pressed, all others not pressed.

---

## 2. MyWhoosh — Virtual Gears (MyShift)

### 2.1 MyShift native feature

MyWhoosh 4.0 introduced **MyShift** — built-in virtual shifting requiring no hardware shifters:
- **30 virtual gears**, starts at gear 15 on ride start
- Works with any trainer (single-cog trainers compatible; Zwift Cog not required)
- Trainer automatically adjusts resistance when gear changes
- Can be disabled per ride

### 2.2 Control methods

| Method | Details | Notes |
|---|---|---|
| Keyboard | **I** = gear up, **K** = gear down | ✅ Confirmed in official MyWhoosh docs |
| Link App (MyWhoosh Link) | Tap arrows in companion app | Mobile phone companion |
| In-game touch | On-screen arrows | Touch screen only |

**Keyboard is the cleanest programmatic interface**: no API, no FTMS commands needed. Just inject `I` / `K` keystrokes into the MyWhoosh process.

**Confirmed by user (hardware test)**: **I = gear down, K = gear up**. Community sources had it backwards. zwiftboard's mapping (PLUS→"k", B→"i") is correct: PLUS (harder) → K (gear up).

### 2.3 Implications for architecture

Since MyWhoosh has native 30-gear shifting via keyboard:
- **No need to implement gear math** in this tool
- **No need for BLE proxy** (unless the keyboard approach fails in practice)
- Tool simply: Connect Click → detect button → inject I or K → MyWhoosh shifts

---

## 3. Wahoo KICKR CORE — BLE Connection Behavior

### 3.1 Simultaneous connections

**Confirmed in reviews** (DC Rainmaker, Zwift Insider):
- KICKR CORE supports **up to 3 simultaneous BLE connections**
- Feature added in a firmware update (pre-2019)
- ANT+ connections are unlimited and don't count against BLE slots

### 3.2 FTMS support

The KICKR CORE exposes:
- **FTMS** (Fitness Machine Service) — standard BLE cycling profile
- **Wahoo proprietary** protocol (used by Wahoo app for advanced features)
- Power, cadence, resistance/ERG control all available via FTMS

### 3.3 Impact on architecture

Because the KICKR CORE allows 3 BLE connections, MyWhoosh can connect directly to the trainer **and** this tool connects to the Click simultaneously with no conflicts. **No BLE proxy needed** for the MVP.

Connection topology:
```
KICKR CORE ←── BLE (slot 1) ──→ MyWhoosh
KICKR CORE ←── BLE (slot 2) ──→ (optional: Wahoo app, power meter app)
Zwift Click ←── BLE ──────────→ this tool (separate BLE session)
this tool ─────────────────────→ keyboard I/K injection → MyWhoosh window
```

---

## 4. Existing Solutions Analysis

### 4.1 BikeControl (OpenBikeControl/bikecontrol)

- **Language**: Flutter/Dart — cross-platform but requires Dart runtime (~200 MB), or ships as bundled app
- **License**: GPL-3.0 ⚠️ (code not copyable into an MIT/Apache project without GPL compliance)
- **Windows approach**: Keyboard/mouse simulation for non-BLE-HID apps (MyWhoosh falls into this category)
- **Zwift Click V2 status**: "mostly" supported, issue #68 open — BLE unlock for LEFT pod is unreliable
- **Key BLE logic**: closed-source (`prop` submodule is private); only stub is public. This means we cannot learn from their implementation details
- **Known issues from sources**: LEFT pod unlock reliability, V2 support incomplete
- **Strength**: Mature, multi-platform, works on Android natively as BLE HID

### 4.2 zwiftboard (climbingtornado/zwiftboard)

- **Language**: Go — Windows-native binary, small footprint
- **Scope**: Click V2 only, Windows only, keyboard injection to MyWhoosh
- **License**: check repo (not confirmed in research)
- **Status**: Active as of 2025 (Go code available)
- **Limitation**: RIGHT pod only (LEFT pod reconnect/unlock not fully solved); no gear model — just maps buttons to keys

### 4.3 zwiftplay (ajchellew/zwiftplay)

- **Language**: C# / .NET — Windows-focused
- **Scope**: Zwift Play (encrypted) — NOT relevant for Click (unencrypted)

### 4.4 Gaps this project fills

1. TypeScript/Node.js — familiar language for JS developers, easy npm distribution
2. Explicit Click V1 AND V2 support with proper detection
3. Configurable gear mapping (not just fixed key → key)
4. Simulator/mock mode for development without hardware
5. Debug BLE frame logging
6. Proper auto-reconnect with exponential backoff
7. Open-source under permissive license (MIT/Apache-2.0, not GPL)

---

## 5. Technology Stack Recommendation

### 5.1 BLE on Windows with Node.js

| Library | Windows approach | Requires driver swap | Status |
|---|---|---|---|
| `@abandonware/noble` | WinUSB via Zadig | **Yes** — breaks system BT | Maintained fork, widely used |
| `@stoprocent/noble` | WinRT/UWP native | No | Most actively maintained, 57K weekly downloads |
| `noble-winrt` | WinRT bindings | No | Older, less active |

**Recommendation**: `@stoprocent/noble` — uses Windows 10 native BLE stack (WinRT), no driver swapping, no Zadig, supports simultaneous connections, actively maintained.

### 5.2 Keyboard injection on Windows

| Library | Injects to unfocused? | TypeScript | Notes |
|---|---|---|---|
| `robotjs` | No (focused only) | Yes (types) | Build issues on newer Node |
| `@nut-tree/nut-js` | No (focused only) | Yes (native TS) | Well-maintained, good Windows support |
| `keysender` | **Yes** (by HWND) | Yes (types) | Windows-only, sends to specific window |
| `node-global-key-listener` | No (listener only) | Yes | For listening, not sending |

**Recommendation**: `keysender` as primary (injects to MyWhoosh window by process name even if not in focus), with `@nut-tree/nut-js` as fallback.

### 5.3 Language choice: TypeScript rationale

- Node.js BLE ecosystem (`@stoprocent/noble`) is mature and well-documented
- `@types/` available for all key libraries
- User's own expertise is TypeScript/Node.js (no learning curve)
- Smaller install footprint than Flutter/Dart (BikeControl) if distributed as bundled pkg executable
- Alternative: **Python + bleak** would be simpler BLE code and bleak is excellent on Windows, but less familiar to user; would require Python runtime or PyInstaller bundle
- Alternative: **Go** (used by zwiftboard) gives small binaries and good WinRT BLE support, but less familiar

**Decision**: TypeScript/Node.js, packaged with `pkg` or `nexe` for standalone .exe distribution.

---

## 6. Open Items Requiring Hardware Confirmation

| # | Question | Impact |
|---|---|---|
| 1 | Click hardware version (V1 or V2)? | Different msg_type (0x37 vs 0x23), unlock flow |
| 2 | Do I/K keyboard shortcuts work in MyWhoosh while riding? | Confirms keyboard approach |
| 3 | MyWhoosh trainer connection: BLE or ANT+? | BLE slot budget |
| 4 | BikeControl failure mode (crash, connect fail, no response)? | Avoids repeating failures |
| 5 | MyWhoosh window focus required or can Click work with minimized MyWhoosh? | Key injection strategy |
| 6 | Click LEFT pod: previously used with Zwift app? | V2 unlock status |

---

## Sources

- [ajchellew/zwiftplay — GitHub](https://github.com/ajchellew/zwiftplay)
- [climbingtornado/zwiftboard — GitHub](https://github.com/climbingtornado/zwiftboard)
- [OpenBikeControl/bikecontrol — GitHub](https://github.com/OpenBikeControl/bikecontrol) (was jonasbark/swiftcontrol)
- [Makinolo: Connecting to Zwift Play controllers](https://www.makinolo.com/blog/2023/10/08/connecting-to-zwift-play-controllers/)
- [Makinolo: Zwift Ride protocol](https://www.makinolo.com/blog/2024/07/26/zwift-ride-protocol/)
- [MyWhoosh: MyShift explained](https://mywhoosh.com/myshift-mywhooshs-virtual-shifting-explained/)
- [mywhooshinfo.com: MyWhoosh keyboard shortcuts](https://mywhooshinfo.com/blog/mywhoosh-keyboard-shortcuts)
- [DC Rainmaker: Multi-channel Bluetooth trainers](https://dcrainmaker.com/2019/09/multichannel-bluetooth-trainers.html)
- [Zwift Insider: KICKR firmware cadence update](https://zwiftinsider.com/kickr-firmware-update)
- [@stoprocent/noble — npm](https://socket.dev/npm/package/@stoprocent/noble)
- [cernyfr1/trainer-cli issue #2 — Zwift Click protocol](https://github.com/cernyfr1/trainer-cli/issues/2)
