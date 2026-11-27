import { log } from '../logger';

interface VkEntry { code: number; extended: boolean; }

// Virtual-key codes for keyboard injection via Windows user32.dll
const VK: Record<string, VkEntry> = {
  // Letters
  a: { code: 0x41, extended: false }, b: { code: 0x42, extended: false },
  c: { code: 0x43, extended: false }, d: { code: 0x44, extended: false },
  e: { code: 0x45, extended: false }, f: { code: 0x46, extended: false },
  g: { code: 0x47, extended: false }, h: { code: 0x48, extended: false },
  i: { code: 0x49, extended: false }, j: { code: 0x4a, extended: false },
  k: { code: 0x4b, extended: false }, l: { code: 0x4c, extended: false },
  m: { code: 0x4d, extended: false }, n: { code: 0x4e, extended: false },
  o: { code: 0x4f, extended: false }, p: { code: 0x50, extended: false },
  q: { code: 0x51, extended: false }, r: { code: 0x52, extended: false },
  s: { code: 0x53, extended: false }, t: { code: 0x54, extended: false },
  u: { code: 0x55, extended: false }, v: { code: 0x56, extended: false },
  w: { code: 0x57, extended: false }, x: { code: 0x58, extended: false },
  y: { code: 0x59, extended: false }, z: { code: 0x5a, extended: false },
  // Digits
  '0': { code: 0x30, extended: false }, '1': { code: 0x31, extended: false },
  '2': { code: 0x32, extended: false }, '3': { code: 0x33, extended: false },
  '4': { code: 0x34, extended: false }, '5': { code: 0x35, extended: false },
  '6': { code: 0x36, extended: false }, '7': { code: 0x37, extended: false },
  '8': { code: 0x38, extended: false }, '9': { code: 0x39, extended: false },
  // Arrow keys — extended keys on Windows (must set KEYEVENTF_EXTENDEDKEY)
  up:    { code: 0x26, extended: true },
  down:  { code: 0x28, extended: true },
  left:  { code: 0x25, extended: true },
  right: { code: 0x27, extended: true },
  // Action keys
  enter:     { code: 0x0d, extended: false },
  escape:    { code: 0x1b, extended: false },
  space:     { code: 0x20, extended: false },
  tab:       { code: 0x09, extended: false },
  backspace: { code: 0x08, extended: false },
};

const KEYEVENTF_KEYUP       = 0x0002;
const KEYEVENTF_EXTENDEDKEY = 0x0001;

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
  const entry = VK[k];

  if (entry === undefined) {
    log.warn(`Unknown key "${key}" — skipping injection`);
    return;
  }

  const fn = loadKeybdEvent();
  const downFlags = entry.extended ? KEYEVENTF_EXTENDEDKEY : 0;
  const upFlags   = entry.extended ? KEYEVENTF_KEYUP | KEYEVENTF_EXTENDEDKEY : KEYEVENTF_KEYUP;
  fn(entry.code, 0, downFlags, 0);
  fn(entry.code, 0, upFlags, 0);
  log.debug(`Key injected: ${key} (VK 0x${entry.code.toString(16).toUpperCase()})`);
}
