import { EventEmitter } from 'events';
import noble from '@stoprocent/noble';
import type { Peripheral } from '@stoprocent/noble';
import { COMPANY_ID } from './protocol/constants';
import { ClickConnection } from './connection';
import type { ButtonState } from './protocol/parser';
import { log } from '../logger';

export interface ScannerOptions {
  scanTimeoutMs: number;
  reconnectDelayMs: number;
  keepaliveMs: number;
}

export class ClickScanner extends EventEmitter {
  private opts: ScannerOptions;
  private connections = new Map<string, ClickConnection>();
  private connecting = new Set<string>(); // peripherals currently mid-handshake
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private scanTimeout: NodeJS.Timeout | null = null;
  private running = false;

  constructor(opts: ScannerOptions) {
    super();
    this.opts = opts;
  }

  start(): void {
    this.running = true;

    noble.on('stateChange', (state: string) => {
      if (state === 'poweredOn') {
        log.info('Bluetooth ready — scanning for Zwift Click…');
        this.startScan();
      } else {
        log.warn(`Bluetooth state: ${state}`);
        if (state === 'poweredOff') {
          log.error('Bluetooth is off. Turn it on and restart.');
        }
      }
    });

    noble.on('discover', (peripheral: Peripheral) => {
      if (!this.isZwiftClick(peripheral)) return;
      if (this.connections.has(peripheral.uuid)) return;
      if (this.connecting.has(peripheral.uuid)) return;

      log.info(`Found: ${peripheral.advertisement.localName ?? 'Zwift Click'} [${peripheral.uuid.slice(-4).toUpperCase()}]`);
      this.connectDevice(peripheral);
    });

    // If noble is already powered on (e.g. re-start after disconnect)
    if (noble.state === 'poweredOn') {
      this.startScan();
    }
  }

  stop(): void {
    this.running = false;
    noble.stopScanning();
    for (const conn of this.connections.values()) conn.disconnect();
    for (const t of this.reconnectTimers.values()) clearTimeout(t);
    this.connections.clear();
    this.connecting.clear();
    this.reconnectTimers.clear();
  }

  private startScan(): void {
    if (!this.running) return;
    noble.startScanning([], true); // allowDuplicates = true so we find both pods

    if (this.scanTimeout) clearTimeout(this.scanTimeout);
    this.scanTimeout = setTimeout(() => {
      if (this.connections.size === 0) {
        log.warn('Scan timeout — no Zwift Click found. Retrying…');
        noble.stopScanning();
        this.startScan();
      } else {
        noble.stopScanning();
      }
    }, this.opts.scanTimeoutMs);
  }

  private async connectDevice(peripheral: Peripheral): Promise<void> {
    this.connecting.add(peripheral.uuid);
    const conn = new ClickConnection(peripheral, this.opts.keepaliveMs);

    conn.on('buttons', (state: ButtonState) => this.emit('buttons', state));

    conn.on('connected', () => {
      this.connecting.delete(peripheral.uuid);
      this.connections.set(peripheral.uuid, conn);
      this.emit('deviceConnected', peripheral.uuid);
      // Stop scanning briefly after first connection (gives second pod time to be found)
      setTimeout(() => {
        if (!this.running) return;
        noble.stopScanning();
        if (this.scanTimeout) { clearTimeout(this.scanTimeout); this.scanTimeout = null; }
      }, 3000);
    });

    conn.on('disconnected', () => {
      this.connecting.delete(peripheral.uuid);
      this.connections.delete(peripheral.uuid);
      this.emit('deviceDisconnected', peripheral.uuid);
      this.scheduleReconnect(peripheral);
    });

    try {
      await conn.connect();
    } catch (err) {
      log.error(`Connect failed: ${(err as Error).message}`);
      this.connecting.delete(peripheral.uuid);
      this.connections.delete(peripheral.uuid);
      this.scheduleReconnect(peripheral);
    }
  }

  private scheduleReconnect(peripheral: Peripheral): void {
    if (!this.running) return;
    if (this.connections.has(peripheral.uuid)) return; // already connected by a parallel attempt
    if (this.connecting.has(peripheral.uuid)) return;  // already reconnecting
    const existing = this.reconnectTimers.get(peripheral.uuid);
    if (existing) clearTimeout(existing);

    const delay = this.opts.reconnectDelayMs;
    log.info(`Reconnecting in ${delay / 1000} s…`);

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(peripheral.uuid);
      if (!this.running) return;
      log.info('Attempting reconnect…');
      this.connectDevice(peripheral);
    }, delay);

    this.reconnectTimers.set(peripheral.uuid, timer);
  }

  private isZwiftClick(peripheral: Peripheral): boolean {
    const mfg = peripheral.advertisement.manufacturerData as Buffer | undefined;
    if (mfg && mfg.length >= 2) {
      const companyId = mfg.readUInt16LE(0);
      if (companyId === COMPANY_ID) return true;
    }
    // Fallback: match local name
    const name = peripheral.advertisement.localName ?? '';
    return name.toLowerCase().startsWith('zwift click') ||
           name.toLowerCase().startsWith('zwift sf2');
  }
}
