import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';

export type ImportProgressEvent = {
  phase: 'reading' | 'parsing' | 'saving' | 'done' | 'error';
  message: string;
  percent: number;
  current?: number;
  total?: number;
};

export type SalesforceSyncProgressEvent = {
  phase: 'started' | 'fetching' | 'saving' | 'downloading_pdf' | 'done' | 'error';
  message: string;
  percent: number;
  objectName?: string;
  current?: number;
  total?: number;
};

export type DocumentsBatchProgressEvent = {
  phase: 'started' | 'processing' | 'linking' | 'done' | 'error';
  message: string;
  percent: number;
  fileName?: string;
  index?: number;
  total?: number;
  outcome?: string;
  stage?: string;
  step?: number;
  stepCount?: number;
};

export type M3FacturesImportProgressEvent = {
  phase: 'started' | 'processing' | 'done' | 'error';
  message: string;
  percent: number;
  index?: number;
  total?: number;
  reference?: string;
  outcome?: 'saved' | 'pending_duplicate';
};

@Injectable({ providedIn: 'root' })
export class ImportSocketService {
  private socket: Socket | null = null;
  private pendingConnect: Promise<string | null> | null = null;

  readonly progress = signal<ImportProgressEvent | null>(null);
  readonly documentsBatchProgress = signal<DocumentsBatchProgressEvent | null>(null);
  readonly documentsBatchLog = signal<string[]>([]);
  readonly salesforceSyncProgress = signal<SalesforceSyncProgressEvent | null>(null);
  readonly salesforceSyncLog = signal<string[]>([]);
  /** Import factures M3 / INFOR (doublons + enregistrement). */
  readonly m3FacturesProgress = signal<M3FacturesImportProgressEvent | null>(null);
  readonly socketId = signal<string | null>(null);

  /** Connexion Socket.io ; retourne l’id à envoyer au backend pour les événements `import:progress`. */
  ensureSocket(): Promise<string | null> {
    if (this.socket?.connected && this.socketId()) {
      return Promise.resolve(this.socketId());
    }
    if (this.pendingConnect) return this.pendingConnect;

    this.pendingConnect = new Promise<string | null>((resolve, reject) => {
      if (this.socket && !this.socket.connected) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
        this.socketId.set(null);
      }

      const s = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        timeout: 12_000,
      });

      const timer = setTimeout(() => {
        s.removeAllListeners();
        s.disconnect();
        reject(new Error('Connexion Socket.io expirée'));
      }, 12_000);

      const wireEvents = () => {
        s.on('import:progress', (ev: ImportProgressEvent) => this.progress.set(ev));
        s.on('documents-batch:progress', (ev: DocumentsBatchProgressEvent) => {
          this.documentsBatchProgress.set(ev);
          const line = ev.fileName
            ? `[${ev.index ?? '?'}/${ev.total ?? '?'}] ${ev.fileName} — ${ev.outcome || ev.message}`
            : ev.message;
          this.documentsBatchLog.update((log) => [...log, line].slice(-100));
        });
        s.on('salesforce-sync:progress', (ev: SalesforceSyncProgressEvent) => {
          this.salesforceSyncProgress.set(ev);
          const line = ev.objectName
            ? `[${ev.objectName}] ${ev.message}`
            : ev.message;
          this.salesforceSyncLog.update((log) => [...log, line].slice(-100));
        });
        s.on('m3-factures:progress', (ev: M3FacturesImportProgressEvent) => this.m3FacturesProgress.set(ev));
      };

      const onConnected = () => {
        clearTimeout(timer);
        this.socket = s;
        const id = s.id ?? null;
        this.socketId.set(id);
        wireEvents();
        resolve(id);
      };

      // Ne pas compter sur l’événement serveur `ready` (course possible) : l’id officiel est `socket.id` au `connect`.
      s.once('connect', onConnected);

      s.on('connect', () => {
        this.socketId.set(s.id ?? null);
      });

      s.once('connect_error', (err) => {
        clearTimeout(timer);
        s.removeAllListeners();
        s.disconnect();
        reject(err);
      });
    }).finally(() => {
      this.pendingConnect = null;
    });

    return this.pendingConnect;
  }

  clearProgress(): void {
    this.progress.set(null);
  }

  clearDocumentsBatch(): void {
    this.documentsBatchProgress.set(null);
    this.documentsBatchLog.set([]);
  }

  clearSalesforceSync(): void {
    this.salesforceSyncProgress.set(null);
    this.salesforceSyncLog.set([]);
  }
  
  clearM3FacturesProgress(): void {
    this.m3FacturesProgress.set(null);
  }
}
