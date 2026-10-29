import { log } from '../logger';

// Virtual-key codes for keyboard injection via Windows user32.dll
const VK: Record<string, number> = {
  a: 0x41, b: 0x42, c: 0x43, d: 0x44, e: 0x45, f: 0x46, g: 0x47,
  h: 0x48, i: 0x49, j: 0x4a, k: 0x4b, l: 0x4c, m: 0x4d, n: 0x4e,
  o: 0x4f, p: 0x50, q: 0x51, r: 0x52, s: 0x53, t: 0x54, u: 0x55,
  v: 0x56, w: 0x57, x: 0x58, y: 0x59, z: 0x5a,
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
};

const KEYEVENTF_KEYUP = 0x0002;

type KeybdEvent = (bVk: number, bScan: number, dwFlags: number, dwExtraInfo: number) => void;

let keybdEvent: KeybdEvent | null = null;

function loadKeybdEvent(): KeybdEvent {
  if (keybdEvent) return keybdEvent;

  if (process.platform !== 'win32') {
    log.warn('Non-Windows platform — keyboard injection disabled (simulate mode recommended)');
    return () => {};
  }

  try {
    // koffi: fast FFI for calling native Windows APIs without native compilation
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    keybdEvent = user32.func('void keybd_event(uint8 bVk, uint8 bScan, uint32 dwFlags, uintptr dwExtraInfo)');
    return keybdEvent!;
  } catch (err) {
    log.error(`Failed to load user32.dll via koffi: ${(err as Error).message}`);
    log.error('Keyboard injection unavailable. Run with --simulate for testing.');
    return () => {};
  }
}

export function pressKey(key: string): void {
  const k = key.toLowerCase();
  const vk = VK[k];

  if (vk === undefined) {
    log.warn(`Unknown key "${key}" — skipping injection`);
    return;
  }

  const fn = loadKeybdEvent();
  fn(vk, 0, 0, 0);            // key down
  fn(vk, 0, KEYEVENTF_KEYUP, 0); // key up
  log.debug(`Key injected: ${key} (VK 0x${vk.toString(16).toUpperCase()})`);
}
