import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { AppConfig } from './types';
import { BUTTON_BITS } from '../ble/protocol/constants';

const DEFAULTS: AppConfig = {
  click: {
    scan_timeout_ms: 15000,
    keepalive_interval_ms: 3000,
    reconnect_delay_ms: 2000,
  },
  buttons: {
    gear_up: 'PLUS',
    gear_down: 'MIN',
  },
  mywhoosh: {
    gear_up_key: 'k',
    gear_down_key: 'i',
    process: 'MyWhoosh',
  },
  debug: false,
};

export function loadConfig(configPath: string): AppConfig {
  if (!fs.existsSync(configPath)) {
    return DEFAULTS;
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = yaml.load(raw) as Partial<AppConfig>;

  const config: AppConfig = {
    click: { ...DEFAULTS.click, ...(parsed.click ?? {}) },
    buttons: { ...DEFAULTS.buttons, ...(parsed.buttons ?? {}) },
    mywhoosh: { ...DEFAULTS.mywhoosh, ...(parsed.mywhoosh ?? {}) },
    debug: parsed.debug ?? DEFAULTS.debug,
  };

  validateConfig(config, configPath);
  return config;
}

function validateConfig(config: AppConfig, filePath: string): void {
  const knownButtons = Object.keys(BUTTON_BITS);

  for (const field of ['gear_up', 'gear_down'] as const) {
    const val = config.buttons[field];
    if (!knownButtons.includes(val)) {
      throw new Error(
        `Invalid button name "${val}" in ${path.basename(filePath)} buttons.${field}.\n` +
        `Valid names: ${knownButtons.join(', ')}`,
      );
    }
  }

  for (const field of ['gear_up_key', 'gear_down_key'] as const) {
    const val = config.mywhoosh[field];
    if (!val || val.length === 0) {
      throw new Error(`mywhoosh.${field} must not be empty`);
    }
  }
}
