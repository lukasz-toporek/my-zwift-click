import {
  MSG_BUTTON_V1,
  MSG_BUTTON_V2,
  MSG_IDLE_1,
  MSG_IDLE_2,
  MSG_DISCONNECT,
  BUTTON_BITS,
  ButtonName,
} from './constants';

export type ButtonState = Partial<Record<ButtonName, boolean>>;

export interface ParseResult {
  type: 'buttons' | 'idle' | 'disconnect' | 'unknown';
  buttons?: ButtonState;
  raw?: Buffer;
}

/**
 * Decode a protobuf varint starting at buf[offset].
 * Returns [value, bytesConsumed].
 */
function readVarint(buf: Buffer, offset: number): [number, number] {
  let value = 0;
  let shift = 0;
  let read = 0;

  while (offset + read < buf.length) {
    const byte = buf[offset + read];
    read++;
    value |= (byte & 0x7f) << shift;
    shift += 7;
    if (!(byte & 0x80)) break;
  }

  return [value, read];
}

/**
 * Parse the bitmap field (protobuf field 1, tag 0x08) from a button frame.
 * Returns a ButtonState map where true = pressed.
 */
function parseBitmap(payload: Buffer): ButtonState {
  const state: ButtonState = {};
  let offset = 0;

  while (offset < payload.length) {
    const tag = payload[offset++];
    const fieldNumber = tag >> 3;
    const wireType = tag & 0x07;

    if (wireType !== 0) {
      // Not a varint — skip remaining bytes (can't determine length without schema)
      break;
    }

    const [value, consumed] = readVarint(payload, offset);
    offset += consumed;

    if (fieldNumber === 1) {
      // Bitmap: bit 0 = pressed, bit 1 = released (inverted logic)
      const pressed = (~value) >>> 0; // uint32 inversion

      for (const [name, bit] of Object.entries(BUTTON_BITS) as [ButtonName, number][]) {
        if (pressed & bit) {
          state[name] = true;
        }
      }
      break; // field 1 is all we need for shifting
    }
  }

  return state;
}

export function parseNotification(data: Buffer): ParseResult {
  if (data.length === 0) {
    return { type: 'unknown', raw: data };
  }

  const msgType = data[0];

  if (msgType === MSG_BUTTON_V1 || msgType === MSG_BUTTON_V2) {
    const payload = data.slice(1);
    const buttons = parseBitmap(payload);
    return { type: 'buttons', buttons, raw: data };
  }

  if (msgType === MSG_IDLE_1 || msgType === MSG_IDLE_2) {
    return { type: 'idle', raw: data };
  }

  if (msgType === MSG_DISCONNECT) {
    return { type: 'disconnect', raw: data };
  }

  return { type: 'unknown', raw: data };
}
