import type { Characteristic } from '@stoprocent/noble';
import {
  HANDSHAKE_START_V1,
  HANDSHAKE_START_V2,
  HANDSHAKE_INFO,
  HANDSHAKE_INIT2,
  RIDE_ON,
  SIDE_CLICK_V2_LEFT,
  SIDE_CLICK_V2_RIGHT,
} from './constants';
import { log } from '../../logger';

export type ClickVersion = 'v1' | 'v2';

export function detectVersion(manufacturerData: Buffer | undefined): ClickVersion {
  if (!manufacturerData || manufacturerData.length < 3) return 'v1';
  const side = manufacturerData[2];
  if (side === SIDE_CLICK_V2_RIGHT || side === SIDE_CLICK_V2_LEFT) return 'v2';
  return 'v1';
}

function writeChar(char: Characteristic, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    char.write(data, false, (err) => (err ? reject(err) : resolve()));
  });
}

function subscribeChar(char: Characteristic): Promise<void> {
  return new Promise((resolve, reject) => {
    char.subscribe((err) => (err ? reject(err) : resolve()));
  });
}

export async function performHandshake(
  syncRx: Characteristic,
  syncTx: Characteristic,
  version: ClickVersion,
): Promise<void> {
  const startBytes = version === 'v2' ? HANDSHAKE_START_V2 : HANDSHAKE_START_V1;

  // Subscribe to SyncTX first so we catch the echo
  await subscribeChar(syncTx);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Handshake timeout — no RideOn echo received within 5 s')),
      5000,
    );

    syncTx.once('data', (data: Buffer) => {
      clearTimeout(timeout);
      const echo = data.slice(0, 6).toString('ascii');
      if (echo === 'RideOn') {
        log.debug('Handshake: RideOn echo — device unlocked');
      } else {
        log.warn(`Handshake: unexpected echo ${data.toString('hex')}`);
      }
      resolve();
    });

    writeChar(syncRx, startBytes).catch((err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  await writeChar(syncRx, HANDSHAKE_INFO);
  await writeChar(syncRx, HANDSHAKE_INIT2);
  log.info('Handshake complete');
}

export function sendKeepalive(syncRx: Characteristic): Promise<void> {
  return writeChar(syncRx, RIDE_ON);
}
