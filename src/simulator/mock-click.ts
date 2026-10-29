import { EventEmitter } from 'events';
import type { ButtonState } from '../ble/protocol/parser';
import type { ButtonName } from '../ble/protocol/constants';
import { log } from '../logger';
import * as readline from 'readline';

/**
 * MockClick emits button events from keyboard input so you can develop
 * and test the tool without physical hardware.
 *
 * Key map (while simulate mode is running):
 *   + or =  → PLUS  (gear up)
 *   -       → MIN   (gear down)
 *   u       → UP arrow
 *   d       → DOWN arrow
 *   q       → quit
 */
const KEY_MAP: Record<string, ButtonName> = {
  '+': 'PLUS',
  '=': 'PLUS',
  '-': 'MIN',
  'u': 'UP',
  'd': 'DOWN',
  'l': 'LEFT',
  'r': 'RIGHT',
  'a': 'A',
  'b': 'B',
  'y': 'Y',
  'z': 'Z',
};

export class MockClick extends EventEmitter {
  private rl: readline.Interface | null = null;

  start(): void {
    log.info('[SIM] Mock Click active. Keys: +/= gear up | - gear down | q quit');
    log.info('[SIM] (Make sure MyWhoosh is the focused window)');

    this.rl = readline.createInterface({ input: process.stdin });
    readline.emitKeypressEvents(process.stdin);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (_str: string, key: readline.Key) => {
      if (!key) return;

      if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
        log.info('[SIM] Quit');
        process.exit(0);
      }

      const char = key.sequence ?? key.name ?? '';
      const buttonName = KEY_MAP[char];

      if (buttonName) {
        // Simulate press then release
        const pressed: ButtonState = { [buttonName]: true };
        const released: ButtonState = { [buttonName]: false };

        log.debug(`[SIM] ${buttonName} pressed`);
        this.emit('buttons', pressed);

        setTimeout(() => {
          this.emit('buttons', released);
        }, 50);
      }
    });
  }

  stop(): void {
    this.rl?.close();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  }
}
