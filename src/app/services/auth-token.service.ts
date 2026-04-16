import { Injectable, computed, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';

import { API_BASE } from '../core/api.constants';

/**
 * Dev JWT from GET /api/auth/token. Uses fetch (not HttpClient) to avoid a circular DI
 * dependency with the auth HTTP interceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private token = signal<string | null>(null);

  /** For ngx-extended-pdf-viewer [httpHeaders] — PDF loads bypass HttpClient. */
  readonly pdfHttpHeaders = computed(() => {
    const t = this.token();
    const h: Record<string, string> = {};
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  });

  preload(): Promise<void> {
    return fetch(`${API_BASE}/auth/token`)
      .then((r) => {
        if (!r.ok) throw new Error(`Auth token: HTTP ${r.status}`);
        return r.json() as Promise<{ token: string }>;
      })
      .then((body) => this.token.set(body.token))
      .catch((e) => {
        console.error('[Auth] Failed to preload API token', e);
      });
  }

  /** Used by the auth HTTP interceptor. */
  ensureToken$(): Observable<string> {
    const t = this.token();
    if (t) return of(t);
    return from(
      fetch(`${API_BASE}/auth/token`).then(async (r) => {
        if (!r.ok) throw new Error(`Auth token: HTTP ${r.status}`);
        const body = (await r.json()) as { token: string };
        this.token.set(body.token);
        return body.token;
      })
    );
  }
}
