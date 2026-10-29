# Contributing

Thanks for your interest in improving `my-zwift-click`!

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/my-zwift-click.git
cd my-zwift-click
npm install
npm test          # should be 9/9 green
npm run dev:sim   # test without hardware
```

## Project structure

```
src/
  ble/
    connection.ts       — GATT connect, handshake, notifications
    scanner.ts          — BLE scan, auto-reconnect
    protocol/
      constants.ts      — UUIDs, button bits, handshake bytes
      parser.ts         — protobuf bitmap decoder
      handshake.ts      — RideOn handshake flow
  config/
    loader.ts           — YAML config loader + validation
    types.ts            — TypeScript interfaces
  gear/
    shifter.ts          — edge-triggered button → keypress
  keyboard/
    injector.ts         — Windows user32.dll keybd_event via koffi
  simulator/
    mock-click.ts       — keyboard-driven BLE mock for development
  logger.ts             — coloured console + optional debug log file
  index.ts              — CLI entry point (commander)
tests/
  parser.test.ts        — unit tests for BLE frame decoder
```

## Running tests

```bash
npm test          # vitest run (unit tests)
npm run lint      # tsc --noEmit (type check only)
```

## Adding button support

1. Find the button's bit in `src/ble/protocol/constants.ts` → `BUTTON_BITS`
2. Update `config.yaml` to use the button name
3. Add a test in `tests/parser.test.ts` if it's a new bit position

## Reporting a bug

Please open an issue and include:
- Windows version
- Node.js version (`node --version`)
- Zwift Click model (V1 / V2)
- The debug log file (`npm run dev -- --debug`, then attach `zwift-click-debug-*.log`)
- What you expected vs. what happened

## Pull requests

- Keep PRs focused — one fix or feature per PR
- Run `npm test` and `npm run lint` before opening
- Describe the problem you're solving, not just the code change

## BLE protocol notes

See `docs/research.md` for the full protocol analysis (service UUIDs, handshake bytes, protobuf bitmap format, V1 vs V2 differences).

## License

By contributing you agree your code will be released under the [MIT License](LICENSE).
