import type { DocumentRecord } from './idb';
import { RevisionConflictError, recordFromFiles } from './idb';

export type SaveStatus = 'saving' | 'saved' | 'error' | 'conflict';
export class AutoSaver {
  private timer?: ReturnType<typeof setTimeout>;
  private pending?: Record<string, string>;
  private running?: Promise<void>;
  private disposed = false;
  constructor(private record: DocumentRecord, private save: (doc: DocumentRecord) => Promise<DocumentRecord>, private status: (status: SaveStatus, message?: string) => void, private delay = 500) {}
  get isDirty() { return Boolean(this.pending || this.running); }
  schedule(files: Readonly<Record<string, string>>) {
    if (this.disposed) return;
    this.pending = { ...files };
    clearTimeout(this.timer);
    this.status('saving');
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, this.delay);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) { await this.running; if (this.pending) return this.flush(); return; }
    if (!this.pending || this.disposed) return;
    const files = this.pending; this.pending = undefined;
    const run = async () => {
      try {
        this.record = await this.save(recordFromFiles(files, this.record.revision));
        if (!this.disposed) this.status(this.pending ? 'saving' : 'saved');
      } catch (error) {
        this.pending ??= files;
        if (!this.disposed) this.status(error instanceof RevisionConflictError ? 'conflict' : 'error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    };
    this.running = run();
    try { await this.running; } finally { this.running = undefined; }
    if (this.pending) return this.flush();
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}
