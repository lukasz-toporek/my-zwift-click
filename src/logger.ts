import * as fs from 'fs';

type Level = 'debug' | 'info' | 'warn' | 'error';

const COLORS: Record<Level, string> = {
  debug: '\x1b[90m', // gray
  info:  '\x1b[36m', // cyan
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

let debugMode = false;
let logFile: fs.WriteStream | null = null;

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
  if (enabled) {
    const date = new Date().toISOString().slice(0, 10);
    logFile = fs.createWriteStream(`zwift-click-debug-${date}.log`, { flags: 'a' });
    log.info(`Debug mode on — writing to zwift-click-debug-${date}.log`);
  }
}

function write(level: Level, msg: string): void {
  if (level === 'debug' && !debugMode) return;
  const ts = new Date().toISOString().slice(11, 23);
  const line = `[${ts}] ${level.toUpperCase().padEnd(5)} ${msg}`;
  console.log(`${COLORS[level]}${line}${RESET}`);
  logFile?.write(line + '\n');
}

export function writeRawFrame(direction: 'NOTIFY' | 'WRITE', uuid: string, data: Buffer): void {
  if (!debugMode) return;
  const hex = data.toString('hex').match(/.{1,2}/g)?.join(' ') ?? '';
  write('debug', `${direction} ${uuid.slice(6, 10)} raw=${hex}`);
}

export const log = {
  debug: (msg: string) => write('debug', msg),
  info:  (msg: string) => write('info', msg),
  warn:  (msg: string) => write('warn', msg),
  error: (msg: string) => write('error', msg),
};
