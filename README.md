# my-zwift-click

Use **Zwift Click** BLE gear-shift buttons with **MyWhoosh** (free cycling app) on Windows — no Zwift subscription required.

> **[Polski opis poniżej / Polish description below](#polski)**

---

## What it does

`my-zwift-click` is a small background tool that:
1. Connects to your Zwift Click controller via Bluetooth
2. Listens for button presses
3. Injects keyboard shortcuts (`k` / `i`) that MyWhoosh's built-in **MyShift** virtual gearing system understands

No Zadig driver swap, no native compilation, no paid subscription.

## Requirements

| Requirement | Version |
|---|---|
| Windows | 10 / 11 (64-bit) |
| Node.js | 18 LTS or newer |
| Bluetooth | Built-in or USB adapter |
| Zwift Click | V1 (original) or V2 (2025 pods) |
| MyWhoosh | Any recent version with MyShift enabled |

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/my-zwift-click.git
cd my-zwift-click
npm install
```

## Usage

### With hardware

1. Turn on your Zwift Click (press any button to wake it up)
2. Make sure Bluetooth is enabled in Windows
3. Open MyWhoosh and start a ride
4. Run in a separate terminal:

```bash
npm start
```

Or during development:

```bash
npm run dev
```

The tool will scan for your Click, perform the BLE handshake, and start forwarding gear shifts. Keep the terminal open while riding.

### Simulator (no hardware needed)

```bash
npm run dev:sim
```

| Key | Action |
|---|---|
| `+` or `=` | Gear up (sends `k`) |
| `-` | Gear down (sends `i`) |
| `q` | Quit |

### Debug mode

```bash
npm run dev -- --debug
```

Writes raw BLE frames to `zwift-click-debug-YYYY-MM-DD.log`.

## Configuration

Edit `config.yaml` to customise button mapping or key bindings:

```yaml
buttons:
  gear_up: PLUS      # + button → gear up
  gear_down: MIN     # − button → gear down

mywhoosh:
  gear_up_key: k     # key sent for gear up
  gear_down_key: i   # key sent for gear down

click:
  scan_timeout_ms: 15000
  keepalive_interval_ms: 3000
  reconnect_delay_ms: 2000

debug: false
```

Available button names: `PLUS`, `MIN`, `UP`, `DOWN`, `LEFT`, `RIGHT`, `A`, `B`, `Y`, `Z`

## How it works

```
Zwift Click (BLE)
      │  manufacturer data filter → company ID 0x094A
      │  GATT service 00000001-19ca-4651-86e5-fa29dcdd09d1
      │  "RideOn" handshake → button notifications
      ▼
my-zwift-click (Node.js)
      │  protobuf varint bitmap decode (inverted bits)
      │  edge-triggered: fires only on press, not hold
      ▼
Windows keybd_event (user32.dll via koffi FFI)
      │  Virtual-key codes: K = 0x4B, I = 0x49
      ▼
MyWhoosh (focused window)
      │  MyShift: 30 virtual gears
      │  k = gear up, i = gear down
      ▼
KICKR CORE (ERG / resistance control)
```

The KICKR CORE supports 3 simultaneous BLE connections — MyWhoosh takes one slot for power/cadence, our tool takes another for the Click. No conflicts.

## Development

```bash
npm test          # run unit tests (vitest)
npm run lint      # TypeScript type check
npm run build     # compile to dist/
```

## Troubleshooting

**"Bluetooth state: unauthorized"** — Run the terminal as Administrator, or check Windows Bluetooth permissions.

**"Zwift service not found"** — The Click may use a newer service UUID (post-Jan 2025). Try pressing buttons while the tool is scanning to wake it up.

**Gear shifts not registering in MyWhoosh** — Make sure MyWhoosh is the focused/active window when you press buttons.

**"Peripheral already connected"** — Restart the tool; a stale BLE connection from a previous session is blocking the new one.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

---

<a name="polski"></a>
## Polski

`my-zwift-click` to narzędzie łączące kontroler **Zwift Click** z darmową aplikacją **MyWhoosh** na Windows — bez subskrypcji Zwift.

### Jak to działa

Narzędzie łączy się z Click przez Bluetooth, dekoduje naciśnięcia przycisków z protokołu BLE i wysyła skróty klawiszowe (`k` / `i`) do MyWhoosh, które sterują wirtualnymi biegami systemu MyShift (30 biegów).

### Instalacja

```bash
git clone https://github.com/YOUR_USERNAME/my-zwift-click.git
cd my-zwift-click
npm install
```

Wymagania: **Node.js 18+**, Windows 10/11, Bluetooth.

### Uruchomienie

1. Włącz Zwift Click (naciśnij dowolny przycisk)
2. Otwórz MyWhoosh i zacznij jazdę
3. W osobnym terminalu:

```bash
npm start
```

Narzędzie skanuje Bluetooth, łączy się z Click i przekazuje zmiany biegów. Terminal musi pozostać otwarty podczas jazdy.

### Konfiguracja

Edytuj `config.yaml` — możesz zmienić przypisanie przycisków i klawiszy.

### Licencja

MIT
