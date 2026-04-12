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

@Injectable({ providedIn: 'root' })
export class ImportSocketService {
  private socket: Socket | null = null;
  private pendingConnect: Promise<string | null> | null = null;

  readonly progress = signal<ImportProgressEvent | null>(null);
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

      s.once('ready', (data: { socketId: string }) => {
        clearTimeout(timer);
        this.socket = s;
        this.socketId.set(data.socketId);
        s.on('import:progress', (ev: ImportProgressEvent) => this.progress.set(ev));
        resolve(data.socketId);
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
}
