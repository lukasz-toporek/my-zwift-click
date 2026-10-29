import type { ButtonName } from '../ble/protocol/constants.js';

export interface ClickConfig {
  scan_timeout_ms: number;
  keepalive_interval_ms: number;
  reconnect_delay_ms: number;
}

export interface ButtonsConfig {
  gear_up: ButtonName;
  gear_down: ButtonName;
}

export interface MyWhooshConfig {
  gear_up_key: string;
  gear_down_key: string;
  process: string;
}

export interface AppConfig {
  click: ClickConfig;
  buttons: ButtonsConfig;
  mywhoosh: MyWhooshConfig;
  debug: boolean;
}
