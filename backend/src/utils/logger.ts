// ────────────────────────────────────────────────────────────
// Minimal structured logger. Swap the implementation for pino/winston
// in production if you want log shipping — the call sites won't change.
// ────────────────────────────────────────────────────────────
type LogMeta = Record<string, unknown>;

const stamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, meta?: LogMeta) =>
    console.log(JSON.stringify({ level: "info", time: stamp(), message, ...meta })),
  warn: (message: string, meta?: LogMeta) =>
    console.warn(JSON.stringify({ level: "warn", time: stamp(), message, ...meta })),
  error: (message: string, meta?: LogMeta) =>
    console.error(JSON.stringify({ level: "error", time: stamp(), message, ...meta })),
};
