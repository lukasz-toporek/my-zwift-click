import { EventEmitter } from 'events';
import type { Peripheral, Characteristic } from '@stoprocent/noble';
import {
  SERVICE_UUID,
  SERVICE_UUID_FC82,
  ASYNC_UUID,
  SYNC_RX_UUID,
  SYNC_TX_UUID,
} from './protocol/constants';
import { parseNotification } from './protocol/parser';
import type { ButtonState } from './protocol/parser';
import {
  performHandshake,
  sendKeepalive,
  detectVersion,
} from './protocol/handshake';
import type { ClickVersion } from './protocol/handshake';
import { log, writeRawFrame } from '../logger';

export interface ConnectionEvents {
  buttons: [ButtonState];
  connected: [];
  disconnected: [];
}

export class ClickConnection extends EventEmitter {
  readonly id: string;
  readonly version: ClickVersion;

  private peripheral: Peripheral;
  private syncRx: Characteristic | null = null;
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private keepaliveMs: number;

  constructor(peripheral: Peripheral, keepaliveMs = 3000) {
    super();
    this.peripheral = peripheral;
    this.id = peripheral.uuid;
    this.version = detectVersion(peripheral.advertisement.manufacturerData as Buffer | undefined);
    this.keepaliveMs = keepaliveMs;
    log.debug(`[${this.shortId}] Detected ${this.version}`);
  }

  private get shortId(): string {
    return this.id.slice(-4).toUpperCase();
  }

  async connect(): Promise<void> {
    log.info(`[${this.shortId}] Connecting…`);
    await new Promise<void>((resolve, reject) => {
      this.peripheral.connect((err) => (err ? reject(err) : resolve()));
    });

    this.peripheral.once('disconnect', () => {
      this.stopKeepalive();
      log.warn(`[${this.shortId}] Disconnected`);
      this.emit('disconnected');
    });

    const chars = await this.discoverCharacteristics();
    const syncRx = chars[SYNC_RX_UUID];
    const syncTx = chars[SYNC_TX_UUID];
    const async_ = chars[ASYNC_UUID];

    if (!syncRx || !syncTx || !async_) {
      throw new Error(`[${this.shortId}] Required characteristics not found`);
    }

    this.syncRx = syncRx;

    await performHandshake(syncRx, syncTx, this.version);

    // Subscribe to button notifications
    await new Promise<void>((resolve, reject) => {
      async_.subscribe((err) => (err ? reject(err) : resolve()));
    });

    async_.on('data', (data: Buffer) => {
      writeRawFrame('NOTIFY', ASYNC_UUID, data);
      const result = parseNotification(data);
      if (result.type === 'buttons' && result.buttons) {
        this.emit('buttons', result.buttons);
      }
    });

    this.startKeepalive();
    log.info(`[${this.shortId}] Ready`);
    this.emit('connected');
  }

  disconnect(): void {
    this.stopKeepalive();
    this.peripheral.disconnect();
  }

  private async discoverCharacteristics(): Promise<Record<string, Characteristic>> {
    const serviceUuids = [SERVICE_UUID, SERVICE_UUID_FC82.replace(/\s/g, '')];

    const services = await new Promise<any[]>((resolve, reject) => {
      this.peripheral.discoverServices(serviceUuids, (err, svcs) => {
        if (err) return reject(err);
        if (!svcs || svcs.length === 0) return reject(new Error('Zwift service not found'));
        resolve(svcs);
      });
    });

    const service = services[0];
    const charList = await new Promise<Characteristic[]>((resolve, reject) => {
      service.discoverCharacteristics([], (err: Error | null, chars: Characteristic[]) => {
        err ? reject(err) : resolve(chars);
      });
    });

    return Object.fromEntries(charList.map((c) => [c.uuid, c]));
  }

  private startKeepalive(): void {
    this.keepaliveTimer = setInterval(async () => {
      if (!this.syncRx) return;
      try {
        await sendKeepalive(this.syncRx);
        writeRawFrame('WRITE', SYNC_RX_UUID, Buffer.from('RideOn'));
      } catch {
        // keepalive failure is non-fatal; disconnect event handles reconnect
      }
    }, this.keepaliveMs);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
}
