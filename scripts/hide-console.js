/**
 * Patches the PE subsystem field in a Windows exe from CONSOLE (3) to WINDOWS (2).
 * This hides the terminal window when the exe is double-clicked.
 *
 * PE layout:
 *   0x3C: e_lfanew (UInt32LE) → PE signature offset
 *   +4:   "PE\0\0"
 *   +24:  Optional Header (20 bytes COFF header skipped)
 *   Optional Header +68: Subsystem (UInt16LE) — 2=WINDOWS, 3=CONSOLE
 */
const fs = require('fs');
const path = require('path');

const exePath = path.join(__dirname, '..', 'dist', 'my-zwift-click.exe');

// Retry loop: Windows Defender may hold the file briefly after pkg writes it
let buf;
for (let attempt = 1; attempt <= 10; attempt++) {
  try { buf = fs.readFileSync(exePath); break; }
  catch (e) {
    if (attempt === 10) throw e;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
}

const e_lfanew = buf.readUInt32LE(0x3C);
const peOffset = e_lfanew;

const signature = buf.toString('ascii', peOffset, peOffset + 4);
if (signature !== 'PE\0\0') {
  console.error('Not a valid PE file');
  process.exit(1);
}

const optHeaderOffset = peOffset + 4 + 20; // skip PE sig + COFF header
const magic = buf.readUInt16LE(optHeaderOffset);
if (magic !== 0x20B && magic !== 0x10B) {
  console.error(`Unknown Optional Header magic: 0x${magic.toString(16)}`);
  process.exit(1);
}

const subsystemOffset = optHeaderOffset + 68;
const current = buf.readUInt16LE(subsystemOffset);
if (current === 2) {
  console.log('Subsystem already WINDOWS (2), nothing to do');
  process.exit(0);
}
buf.writeUInt16LE(2, subsystemOffset);
for (let attempt = 1; attempt <= 10; attempt++) {
  try { fs.writeFileSync(exePath, buf); break; }
  catch (e) {
    if (attempt === 10) throw e;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
}
console.log(`Patched subsystem ${current} → 2 (WINDOWS) at offset 0x${subsystemOffset.toString(16)}`);
