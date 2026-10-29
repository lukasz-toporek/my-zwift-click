import type { ButtonState } from '../ble/protocol/parser';
import type { ButtonName } from '../ble/protocol/constants';
import type { AppConfig } from '../config/types';
import { pressKey } from '../keyboard/injector';
import { log } from '../logger';

export type GearAction = 'gear_up' | 'gear_down';

export class Shifter {
  private gearUpButton: ButtonName;
  private gearDownButton: ButtonName;
  private gearUpKey: string;
  private gearDownKey: string;

  // Track previous state to fire on press (edge) only, not on hold
  private prevState: ButtonState = {};

  constructor(config: AppConfig) {
    this.gearUpButton   = config.buttons.gear_up;
    this.gearDownButton = config.buttons.gear_down;
    this.gearUpKey      = config.mywhoosh.gear_up_key;
    this.gearDownKey    = config.mywhoosh.gear_down_key;
  }

  handleButtonState(current: ButtonState): void {
    const prev = this.prevState;

    // Detect rising edge: button was not pressed before, is pressed now
    if (current[this.gearUpButton] && !prev[this.gearUpButton]) {
      log.info(`[SHIFT] ${this.gearUpButton} → gear UP → key '${this.gearUpKey}'`);
      pressKey(this.gearUpKey);
    }

    if (current[this.gearDownButton] && !prev[this.gearDownButton]) {
      log.info(`[SHIFT] ${this.gearDownButton} → gear DOWN → key '${this.gearDownKey}'`);
      pressKey(this.gearDownKey);
    }

    this.prevState = current;
  }

  reset(): void {
    this.prevState = {};
  }
}
