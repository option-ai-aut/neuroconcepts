// Console Log Capture Utility
// Intercepts console.log/warn/error and stores the last N entries in a ring buffer.
// Used by the Bug Report feature to automatically attach console output.

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

const MAX_ENTRIES = 50;
const buffer: ConsoleEntry[] = [];
let initialized = false;

function stringify(args: any[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a, null, 0);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

export function initConsoleCapture() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  function push(level: ConsoleEntry['level'], args: any[]) {
    const entry: ConsoleEntry = {
      level,
      message: stringify(args),
      timestamp: new Date().toISOString(),
    };
    if (buffer.length >= MAX_ENTRIES) buffer.shift();
    buffer.push(entry);
  }

  console.log = function (...args: any[]) {
    push('log', args);
    origLog.apply(console, args);
  };

  console.warn = function (...args: any[]) {
    push('warn', args);
    origWarn.apply(console, args);
  };

  console.error = function (...args: any[]) {
    push('error', args);
    origError.apply(console, args);
  };

  // Also capture unhandled errors
  window.addEventListener('error', (e) => {
    push('error', [`[Unhandled] ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`]);
  });

  window.addEventListener('unhandledrejection', (e) => {
    push('error', [`[UnhandledPromise] ${e.reason}`]);
  });
}

export function getConsoleLogs(): ConsoleEntry[] {
  return [...buffer];
}

export function getConsoleLogsJSON(): string {
  return JSON.stringify(buffer);
}
