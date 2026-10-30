'use strict';

const W = 32, H = 32;
const pixels = new Uint8Array(W * H * 4);

function sp(x, y, b, g, r, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  pixels[i] = b; pixels[i + 1] = g; pixels[i + 2] = r; pixels[i + 3] = a;
}

function fillCircle(cx, cy, r, col) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) sp(x, y, col[0], col[1], col[2], col[3]);
    }
  }
}

function drawCircleThick(cx, cy, r, thick, col) {
  const ro = r + thick, ri = r - thick;
  for (let y = cy - ro; y <= cy + ro; y++) {
    for (let x = cx - ro; x <= cx + ro; x++) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 <= ro * ro && d2 >= ri * ri) sp(x, y, col[0], col[1], col[2], col[3]);
    }
  }
}

function line(x0, y0, x1, y1, col) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy;
  while (true) {
    sp(x0, y0, col[0], col[1], col[2], col[3]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx)  { err += dx; y0 += sy; }
  }
}

function tline(x0, y0, x1, y1, thick, col) {
  line(x0, y0, x1, y1, col);
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const px = -dy / len, py = dx / len;
  for (let t = 1; t < thick; t++) {
    line(Math.round(x0 + px * t), Math.round(y0 + py * t),
         Math.round(x1 + px * t), Math.round(y1 + py * t), col);
    line(Math.round(x0 - px * t), Math.round(y0 - py * t),
         Math.round(x1 - px * t), Math.round(y1 - py * t), col);
  }
}

// Colors: BGRA
const BG     = [0x0d, 0x18, 0x0d, 0xff];
const GREEN  = [0x4a, 0xa3, 0x16, 0xff];
const WHITE  = [0xff, 0xff, 0xff, 0xff];
const YELLOW = [0x00, 0xd4, 0xff, 0xff];

// Background fill
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    sp(x, y, BG[0], BG[1], BG[2], BG[3]);

// Green badge circle
fillCircle(15, 15, 15, GREEN);

// Bicycle wheels (2px thick outline)
drawCircleThick(8,  21, 5, 1, WHITE);
drawCircleThick(23, 21, 5, 1, WHITE);

// Frame
tline(8, 21, 14, 13, 2, WHITE);
tline(14, 13, 23, 21, 2, WHITE);
tline(14, 13, 14, 21, 2, WHITE);
tline(14, 21, 23, 21, 2, WHITE);
tline(8,  21, 14, 21, 2, WHITE);

// Saddle
tline(11, 11, 17, 11, 2, WHITE);

// Lightning bolt
tline(27, 3,  22, 9,  2, YELLOW);
tline(22, 9,  26, 9,  2, YELLOW);
tline(25, 9,  20, 14, 2, YELLOW);

// --- Build ICO ---
const ICONDIR_SZ   = 6;
const ENTRY_SZ     = 16;
const BMPIH_SZ     = 40;
const XOR_SZ       = W * H * 4; // 4096
const AND_SZ       = H * 4;     // 128  (32 rows × 4 bytes, 1 bit/px → 4 bytes/row for 32px)
const BYTES_IN_RES = BMPIH_SZ + XOR_SZ + AND_SZ; // 4264
const IMG_OFFSET   = ICONDIR_SZ + ENTRY_SZ;       // 22
const TOTAL        = IMG_OFFSET + BYTES_IN_RES;   // 4286

const buf = Buffer.alloc(TOTAL, 0);
let p = 0;

// ICONDIR
buf.writeUInt16LE(0, p); p += 2;
buf.writeUInt16LE(1, p); p += 2;
buf.writeUInt16LE(1, p); p += 2;

// ICONDIRENTRY
buf.writeUInt8(32, p++);
buf.writeUInt8(32, p++);
buf.writeUInt8(0,  p++);
buf.writeUInt8(0,  p++);
buf.writeUInt16LE(1,            p); p += 2;
buf.writeUInt16LE(32,           p); p += 2;
buf.writeUInt32LE(BYTES_IN_RES, p); p += 4;
buf.writeUInt32LE(IMG_OFFSET,   p); p += 4;

// BITMAPINFOHEADER
buf.writeUInt32LE(40,       p); p += 4;
buf.writeInt32LE(32,        p); p += 4;
buf.writeInt32LE(64,        p); p += 4; // biHeight doubled
buf.writeUInt16LE(1,        p); p += 2;
buf.writeUInt16LE(32,       p); p += 2;
buf.writeUInt32LE(0,        p); p += 4;
buf.writeUInt32LE(XOR_SZ,   p); p += 4;
buf.writeInt32LE(0,         p); p += 4;
buf.writeInt32LE(0,         p); p += 4;
buf.writeUInt32LE(0,        p); p += 4;
buf.writeUInt32LE(0,        p); p += 4;

// XOR mask — bottom-up
for (let row = 0; row < H; row++) {
  const srcRow = H - 1 - row;
  const src = srcRow * W * 4;
  const dst = p + row * W * 4;
  pixels.subarray(src, src + W * 4).forEach((v, i) => { buf[dst + i] = v; });
}
p += XOR_SZ;

// AND mask — already zero (fully opaque)
p += AND_SZ;

process.stdout.write(buf.toString('base64') + '\n');
