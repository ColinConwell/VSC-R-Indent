import * as vscode from 'vscode';

export interface LogRecord {
  time: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  details: Record<string, unknown>;
}
/** Bounded structured records; never record document source, paths, or executable settings. */
export class DebugLogger implements vscode.Disposable {
  private readonly channel = vscode.window.createOutputChannel('RStudio Indent', { log: true });
  private records: LogRecord[] = [];
  private warned = new Set<string>();
  write(level: LogRecord['level'], event: string, details: Record<string, unknown> = {}): void {
    const record = { time: new Date().toISOString(), level, event, details };
    this.records.push(record);
    if (this.records.length > 200) this.records.shift();
    // Extension debug preference is controlled by the caller; do not require a second global log switch.
    const method = level === 'debug' ? 'info' : level;
    this.channel[method](JSON.stringify(record));
  }
  warnOnce(event: string, details: Record<string, unknown>): void {
    if (this.warned.has(event)) return;
    this.warned.add(event);
    this.write('warn', event, details);
  }
  show(): void {
    this.channel.show(true);
  }
  recent(): readonly LogRecord[] {
    return this.records.map((record) => ({ ...record, details: { ...record.details } }));
  }
  dispose(): void {
    this.channel.dispose();
    this.records = [];
    this.warned.clear();
  }
}
