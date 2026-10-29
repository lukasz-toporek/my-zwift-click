import { describe, it, expect } from 'vitest';
import { parseNotification } from '../src/ble/protocol/parser';

// MSG_BUTTON_V1 = 0x37, MSG_BUTTON_V2 = 0x23
// Protobuf: tag 0x08 (field 1, varint), then varint-encoded bitmap
// Bitmap bit 0 = pressed (inverted: ~bitmap & bit)

function makeButtonFrame(msgType: number, bitmap: number): Buffer {
  // Encode bitmap as a protobuf varint
  const bytes: number[] = [msgType, 0x08]; // msg type + field 1 tag
  let v = bitmap >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

describe('parseNotification', () => {
  it('returns idle for 0x15', () => {
    const result = parseNotification(Buffer.from([0x15]));
    expect(result.type).toBe('idle');
  });

  it('returns idle for 0x19', () => {
    const result = parseNotification(Buffer.from([0x19]));
    expect(result.type).toBe('idle');
  });

  it('returns disconnect for 0xFE', () => {
    const result = parseNotification(Buffer.from([0xfe]));
    expect(result.type).toBe('disconnect');
  });

  it('detects PLUS pressed in V2 frame (bit 0x1000 = 0)', () => {
    // All bits 1 except PLUS (0x1000) = 0
    const bitmap = 0xffffffff ^ 0x1000;
    const buf = makeButtonFrame(0x23, bitmap);
    const result = parseNotification(buf);
    expect(result.type).toBe('buttons');
    expect(result.buttons?.PLUS).toBe(true);
    expect(result.buttons?.MIN).toBeUndefined();
  });

  it('detects MIN pressed in V1 frame (bit 0x0100 = 0)', () => {
    const bitmap = 0xffffffff ^ 0x0100;
    const buf = makeButtonFrame(0x37, bitmap);
    const result = parseNotification(buf);
    expect(result.type).toBe('buttons');
    expect(result.buttons?.MIN).toBe(true);
    expect(result.buttons?.PLUS).toBeUndefined();
  });

  it('detects no buttons when all bits are 1 (nothing pressed)', () => {
    const bitmap = 0xffffffff;
    const buf = makeButtonFrame(0x23, bitmap);
    const result = parseNotification(buf);
    expect(result.type).toBe('buttons');
    expect(Object.keys(result.buttons ?? {}).length).toBe(0);
  });

  it('detects multiple buttons pressed simultaneously', () => {
    // Both PLUS (0x1000) and B (0x0020) pressed
    const bitmap = 0xffffffff ^ (0x1000 | 0x0020);
    const buf = makeButtonFrame(0x23, bitmap);
    const result = parseNotification(buf);
    expect(result.buttons?.PLUS).toBe(true);
    expect(result.buttons?.B).toBe(true);
    expect(result.buttons?.MIN).toBeUndefined();
  });

  it('returns unknown for unrecognised message type', () => {
    const result = parseNotification(Buffer.from([0xaa, 0x01, 0x02]));
    expect(result.type).toBe('unknown');
  });

  it('handles empty buffer gracefully', () => {
    const result = parseNotification(Buffer.alloc(0));
    expect(result.type).toBe('unknown');
  });
});
