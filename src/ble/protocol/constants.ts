// BLE UUIDs confirmed in: zwiftboard/protocol.go, bikecontrol/constants.dart
// Noble uses lowercase UUID strings without dashes.

export const COMPANY_ID = 0x094a;

export const SERVICE_UUID        = '0000000119ca465186e5fa29dcdd09d1';
export const ASYNC_UUID          = '0000000219ca465186e5fa29dcdd09d1'; // notify — button frames
export const SYNC_RX_UUID        = '0000000319ca465186e5fa29dcdd09d1'; // write  — handshake / keepalive
export const SYNC_TX_UUID        = '0000000419ca465186e5fa29dcdd09d1'; // indicate — handshake reply

// Fallback service UUID used by Zwift Ride after Jan 2025 firmware.
// Whether Click V2 adopted this is unconfirmed — scan both to be safe.
export const SERVICE_UUID_FC82 = '0000fc8200001000800000805f9b34fb';

// Manufacturer data side-bytes (byte index 2 of manufacturer data)
export const SIDE_CLICK_V1       = 0x09;
export const SIDE_CLICK_V2_RIGHT = 0x0a;
export const SIDE_CLICK_V2_LEFT  = 0x0b;

// Message types (first byte of notification payload)
export const MSG_BUTTON_V1  = 0x37; // Click V1
export const MSG_BUTTON_V2  = 0x23; // Click V2 / Ride
export const MSG_IDLE_1     = 0x15;
export const MSG_IDLE_2     = 0x19;
export const MSG_DISCONNECT = 0xfe;

// Button bitmap: bit value 0 = PRESSED, 1 = not pressed
export const BUTTON_BITS = {
  LEFT:  0x0001,
  UP:    0x0002,
  RIGHT: 0x0004,
  DOWN:  0x0008,
  A:     0x0010,
  B:     0x0020,
  Y:     0x0040,
  Z:     0x0080,
  MIN:   0x0100,
  PLUS:  0x1000,
} as const;

export type ButtonName = keyof typeof BUTTON_BITS;

// Handshake write sequences (to SYNC_RX_UUID)
export const RIDE_ON = Buffer.from([0x52, 0x69, 0x64, 0x65, 0x4f, 0x6e]);

export const HANDSHAKE_START_V1 = Buffer.concat([RIDE_ON, Buffer.from([0x01, 0x03])]);
export const HANDSHAKE_START_V2 = Buffer.concat([RIDE_ON, Buffer.from([0x02, 0x03])]);
export const HANDSHAKE_INFO     = Buffer.from([0x00, 0x08, 0x00]);
export const HANDSHAKE_INIT2    = Buffer.from([0x00, 0x08, 0x10]);
export const KEEPALIVE          = RIDE_ON;
