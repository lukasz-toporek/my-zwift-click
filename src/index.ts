#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import { loadConfig } from './config/loader';
import { setDebugMode, log } from './logger';
import { ClickScanner } from './ble/scanner';
import { Shifter } from './gear/shifter';
import { MockClick } from './simulator/mock-click';
import type { ButtonState } from './ble/protocol/parser';

const VERSION = '0.1.0';

const program = new Command();

program
  .name('zwift-click')
  .description('Bridge Zwift Click shifters to MyWhoosh virtual gears')
  .version(VERSION)
  .option('-c, --config <path>', 'path to config.yaml', 'config.yaml')
  .option('--debug', 'enable raw BLE frame logging')
  .option('--simulate', 'run without hardware (keyboard controls mock buttons)')
  .parse(process.argv);

const opts = program.opts<{ config: string; debug: boolean; simulate: boolean }>();

async function main(): Promise<void> {
  const configPath = path.resolve(opts.config);
  const config = loadConfig(configPath);

  if (opts.debug || config.debug) {
    setDebugMode(true);
  }

  log.info(`my-zwift-click v${VERSION}`);
  log.info(`Config: ${configPath}`);
  log.info(`Gear up:   ${config.buttons.gear_up} → key '${config.mywhoosh.gear_up_key}'`);
  log.info(`Gear down: ${config.buttons.gear_down} → key '${config.mywhoosh.gear_down_key}'`);

  const shifter = new Shifter(config);

  const handleButtons = (state: ButtonState) => shifter.handleButtonState(state);

  if (opts.simulate) {
    const mock = new MockClick();
    mock.on('buttons', handleButtons);
    mock.start();
    return; // mock keeps process alive via stdin
  }

  // Real BLE mode
  const scanner = new ClickScanner({
    scanTimeoutMs: config.click.scan_timeout_ms,
    reconnectDelayMs: config.click.reconnect_delay_ms,
    keepaliveMs: config.click.keepalive_interval_ms,
  });

  scanner.on('buttons', handleButtons);

  scanner.on('deviceConnected', (id: string) => {
    shifter.reset();
    log.info(`Device connected: ${id.slice(-4).toUpperCase()}`);
  });

  scanner.on('deviceDisconnected', (id: string) => {
    shifter.reset();
    log.warn(`Device disconnected: ${id.slice(-4).toUpperCase()}`);
  });

  scanner.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    log.info('Shutting down…');
    scanner.stop();
    process.exit(0);
  });
}

main().catch((err: unknown) => {
  log.error(`Fatal: ${(err as Error).message}`);
  process.exit(1);
});
