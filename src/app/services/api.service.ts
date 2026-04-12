import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const BASE = 'http://localhost:3000/api';

export type AIQuerySourceKind =
  | 'document'
  | 'mouvement'
  | 'rapprochement'
  | 'timeline_global'
  | 'timeline_scenario'
  | 'unknown';

export interface AIQuerySourceRef {
  id: string;
  kind: AIQuerySourceKind;
  label: string;
  hasPdf?: boolean;
  scenarioId?: string;
}

export interface AIQueryTimelineMeta {
  scope: 'global' | 'scenario';
  scenarioId?: string;
  /** Libellé métier (fournisseur), pas S01 */
  purchaseLabel?: string;
}

export interface AIQueryHistoryTurn {
  question: string;
  answer: string;
  sources: AIQuerySourceRef[];
  at: string;
  timelineEvents?: Record<string, unknown>[];
  timelineMeta?: AIQueryTimelineMeta;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Documents (all types: devis, bon_commande, bon_livraison, bon_reception, facture, email)
  getDocuments(type?: string): Observable<any[]> {
    const url = type ? `${BASE}/documents?type=${type}` : `${BASE}/documents`;
    return this.http.get<any[]>(url);
  }
  uploadDocument(file: File, docType?: string): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    if (docType) fd.append('docType', docType);
    return this.http.post(`${BASE}/documents/upload`, fd);
  }
  /** Plusieurs PDF : multer + extraction + classifieur + regroupement dossiers (scenarioId) côté serveur */
  uploadDocumentsBatch(files: File[], docType?: string): Observable<{
    success: boolean;
    fileCount: number;
    results: unknown[];
    dossiers?: { scenarioId: string; documentIds: string[] }[];
  }> {
    const fd = new FormData();
    for (const f of files) {
      fd.append('files', f, f.name);
    }
    if (docType) fd.append('docType', docType);
    return this.http.post<{
      success: boolean;
      fileCount: number;
      results: unknown[];
      dossiers?: { scenarioId: string; documentIds: string[] }[];
    }>(`${BASE}/documents/upload-batch`, fd);
  }
  confirmDocument(pendingId: string, docType?: string): Observable<any> {
    return this.http.post(`${BASE}/documents/confirm/${pendingId}`, docType ? { docType } : {});
  }
  replaceDocument(pendingId: string, existingId: string): Observable<any> {
    return this.http.post(`${BASE}/documents/replace/${pendingId}/${existingId}`, {});
  }
  cancelPending(pendingId: string): Observable<any> { return this.http.delete(`${BASE}/documents/pending/${pendingId}`); }
  getDocumentPdfUrl(id: string): string { return `${BASE}/documents/${id}/pdf`; }
  getPendingPdfUrl(pendingId: string): string { return `${BASE}/documents/pending/${pendingId}/pdf`; }
  deleteDocument(id: string): Observable<any> { return this.http.delete(`${BASE}/documents/${id}`); }

  // Mouvements
  createMouvement(data: any): Observable<any> { return this.http.post(`${BASE}/mouvements`, data); }
  getMouvements(): Observable<any[]> { return this.http.get<any[]>(`${BASE}/mouvements`); }
  deleteMouvement(id: string): Observable<any> { return this.http.delete(`${BASE}/mouvements/${id}`); }
  /** Import CSV relevé bancaire (champ file) — détection séparateur et colonnes. `socketId` : progression temps réel (Socket.io). */
  importMouvementsCsv(
    file: File,
    socketId?: string
  ): Observable<{
    success: boolean;
    count: number;
    mouvements: unknown[];
    warnings?: string[];
    headersDetected?: string[];
  }> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    if (socketId) fd.append('socketId', socketId);
    const headers = socketId
      ? new HttpHeaders({ 'x-import-socket-id': socketId })
      : undefined;
    return this.http.post<{
      success: boolean;
      count: number;
      mouvements: unknown[];
      warnings?: string[];
      headersDetected?: string[];
    }>(`${BASE}/mouvements/import-csv`, fd, { headers });
  }

  // Rapprochement
  getSortieIds(): Observable<{ ids: string[]; count: number }> { return this.http.get<{ ids: string[]; count: number }>(`${BASE}/rapprochement/sortie-ids`); }
  runRapprochement(mouvementId: string): Observable<any> { return this.http.post(`${BASE}/rapprochement/run/${mouvementId}`, {}); }
  runAllRapprochements(): Observable<any> { return this.http.post(`${BASE}/rapprochement/run-all`, {}); }
  getRapprochements(): Observable<any[]> { return this.http.get<any[]>(`${BASE}/rapprochement`); }
  confirmRapprochement(id: string): Observable<any> { return this.http.post(`${BASE}/rapprochement/confirm/${id}`, {}); }
  deleteRapprochement(id: string): Observable<any> { return this.http.delete(`${BASE}/rapprochement/${id}`); }

  // Timeline
  getTimeline(): Observable<any[]> { return this.http.get<any[]>(`${BASE}/timeline`); }
  getScenarioTimeline(scenarioId: string): Observable<any[]> { return this.http.get<any[]>(`${BASE}/timeline/scenario/${scenarioId}`); }

  // AI Query (historique + sources enrichies côté serveur)
  query(
    q: string,
    sessionId: string
  ): Observable<{
    answer: string;
    sources: AIQuerySourceRef[];
    sessionId: string;
    timelineEvents?: Record<string, unknown>[];
    timelineMeta?: AIQueryTimelineMeta;
  }> {
    return this.http.post<{
      answer: string;
      sources: AIQuerySourceRef[];
      sessionId: string;
      timelineEvents?: Record<string, unknown>[];
      timelineMeta?: AIQueryTimelineMeta;
    }>(`${BASE}/query`, {
      query: q,
      sessionId,
    });
  }

  getQueryHistory(sessionId: string): Observable<{ sessionId: string; turns: AIQueryHistoryTurn[] }> {
    return this.http.get<{ sessionId: string; turns: AIQueryHistoryTurn[] }>(`${BASE}/query/history/${sessionId}`);
  }

  resetQuerySession(sessionId: string): Observable<void> {
    return this.http
      .post(`${BASE}/query/reset`, { sessionId }, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  // Stats
  getStats(): Observable<any> { return this.http.get(`${BASE}/stats`); }
}
