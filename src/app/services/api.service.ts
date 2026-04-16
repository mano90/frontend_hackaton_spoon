import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_BASE } from '../core/api.constants';

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

/** Synthèse structurée dossier / parcours (aligné backend). */
export interface AIQueryDossierBrief {
  scenarioId?: string | null;
  libelle?: string;
  resume: string;
  etapes?: string[];
  anomalies?: string[];
  pistes?: string[];
}

export interface AIQueryHistoryTurn {
  question: string;
  answer: string;
  sources: AIQuerySourceRef[];
  at: string;
  timelineEvents?: Record<string, unknown>[];
  timelineMeta?: AIQueryTimelineMeta;
  dossierBriefs?: AIQueryDossierBrief[];
}

export type PendingListItem = {
  id: string;
  pendingKind: 'classification' | 'duplicate' | string;
  fileName?: string;
  docType?: string;
  reference?: string;
  fournisseur?: string;
  date?: string;
  montant?: number | null;
  similarity?: {
    duplicateId: string;
    confidence: number;
    reason: string;
    existingFileName?: string;
  } | null;
  pendingDocument?: Record<string, unknown>;
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Documents (all types: devis, bon_commande, bon_livraison, bon_reception, facture, email)
  getDocuments(type?: string): Observable<any[]> {
    const url = type ? `${API_BASE}/documents?type=${type}` : `${API_BASE}/documents`;
    return this.http.get<any[]>(url);
  }
  uploadDocument(file: File, docType?: string): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    if (docType) fd.append('docType', docType);
    return this.http.post(`${API_BASE}/documents/upload`, fd);
  }
  /** Plusieurs PDF : multer + extraction + classifieur + regroupement dossiers (scenarioId) côté serveur */
  uploadDocumentsBatch(
    files: File[],
    docType?: string
  ): Observable<{
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
    }>(`${API_BASE}/documents/upload-batch`, fd);
  }
  confirmDocument(pendingId: string, docType?: string): Observable<any> {
    return this.http.post(`${API_BASE}/documents/confirm/${pendingId}`, docType ? { docType } : {});
  }
  replaceDocument(pendingId: string, existingId: string): Observable<any> {
    return this.http.post(`${API_BASE}/documents/replace/${pendingId}/${existingId}`, {});
  }
  cancelPending(pendingId: string): Observable<any> { return this.http.delete(`${API_BASE}/documents/pending/${pendingId}`); }
  /** Imports provisoires (classification / doublon) — sans texte brut côté liste. */
  getPendingList(): Observable<{ items: PendingListItem[] }> {
    return this.http.get<{ items: PendingListItem[] }>(`${API_BASE}/documents/pending-list`);
  }
  getDocumentPdfUrl(id: string): string { return `${API_BASE}/documents/${id}/pdf`; }
  getPendingPdfUrl(pendingId: string): string { return `${API_BASE}/documents/pending/${pendingId}/pdf`; }

  /** Ouvre le PDF dans un nouvel onglet (Authorization via HttpClient + interceptor). */
  openDocumentPdfInNewTab(id: string): void {
    const url = this.getDocumentPdfUrl(id);
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const u = URL.createObjectURL(blob);
        window.open(u, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(u), 60_000);
      },
      error: (e) => console.error('[ApiService] PDF open failed', e),
    });
  }

  openPendingPdfInNewTab(pendingId: string): void {
    const url = this.getPendingPdfUrl(pendingId);
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const u = URL.createObjectURL(blob);
        window.open(u, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(u), 60_000);
      },
      error: (e) => console.error('[ApiService] Pending PDF open failed', e),
    });
  }

  deleteDocument(id: string): Observable<any> { return this.http.delete(`${API_BASE}/documents/${id}`); }
  getDocument(id: string): Observable<any> { return this.http.get<any>(`${API_BASE}/documents/${id}`); }

  // Mouvements
  createMouvement(data: any): Observable<any> { return this.http.post(`${API_BASE}/mouvements`, data); }
  getMouvements(): Observable<any[]> { return this.http.get<any[]>(`${API_BASE}/mouvements`); }
  deleteMouvement(id: string): Observable<any> { return this.http.delete(`${API_BASE}/mouvements/${id}`); }
  /** Import CSV relevé bancaire (champ file) — détection séparateur et colonnes. Progression : Socket.io (broadcast serveur). */
  importMouvementsCsv(file: File): Observable<{
    success: boolean;
    count: number;
    mouvements: unknown[];
    warnings?: string[];
    headersDetected?: string[];
  }> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<{
      success: boolean;
      count: number;
      mouvements: unknown[];
      warnings?: string[];
      headersDetected?: string[];
    }>(`${API_BASE}/mouvements/import-csv`, fd);
  }

  // Rapprochement
  getSortieIds(): Observable<{ ids: string[]; count: number }> { return this.http.get<{ ids: string[]; count: number }>(`${API_BASE}/rapprochement/mouvement-ids`); }
  runRapprochement(mouvementId: string): Observable<any> { return this.http.post(`${API_BASE}/rapprochement/run/${mouvementId}`, {}); }
  runAllRapprochements(): Observable<any> { return this.http.post(`${API_BASE}/rapprochement/run-all`, {}); }
  getRapprochements(): Observable<any[]> { return this.http.get<any[]>(`${API_BASE}/rapprochement`); }
  confirmRapprochement(id: string): Observable<any> { return this.http.post(`${API_BASE}/rapprochement/confirm/${id}`, {}); }
  deleteRapprochement(id: string): Observable<any> { return this.http.delete(`${API_BASE}/rapprochement/${id}`); }

  // Timeline
  getTimeline(): Observable<any[]> { return this.http.get<any[]>(`${API_BASE}/timeline`); }
  getScenarioTimeline(scenarioId: string): Observable<any[]> { return this.http.get<any[]>(`${API_BASE}/timeline/scenario/${scenarioId}`); }

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
    dossierBriefs?: AIQueryDossierBrief[];
  }> {
    return this.http.post<{
      answer: string;
      sources: AIQuerySourceRef[];
      sessionId: string;
      timelineEvents?: Record<string, unknown>[];
      timelineMeta?: AIQueryTimelineMeta;
      dossierBriefs?: AIQueryDossierBrief[];
    }>(`${API_BASE}/query`, {
      query: q,
      sessionId,
    });
  }

  getQueryHistory(sessionId: string): Observable<{ sessionId: string; turns: AIQueryHistoryTurn[] }> {
    return this.http.get<{ sessionId: string; turns: AIQueryHistoryTurn[] }>(`${API_BASE}/query/history/${sessionId}`);
  }

  resetQuerySession(sessionId: string): Observable<void> {
    return this.http
      .post(`${API_BASE}/query/reset`, { sessionId }, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  // Config rapprochement
  getConfig(): Observable<{ config: any; defaults: any }> { return this.http.get<{ config: any; defaults: any }>(`${API_BASE}/config`); }
  updateConfig(config: any): Observable<{ success: boolean; config: any }> { return this.http.put<{ success: boolean; config: any }>(`${API_BASE}/config`, config); }
  resetConfig(): Observable<{ success: boolean; config: any }> { return this.http.post<{ success: boolean; config: any }>(`${API_BASE}/config/reset`, {}); }

  // Stats
<<<<<<< HEAD
  getStats(): Observable<any> { return this.http.get(`${BASE}/stats`); }

  // M3 / ION API — exécution de transaction
  executeM3(
    program: string,
    transaction: string,
    data: Record<string, string> = {},
    options: { maxrecs?: number; returncols?: string; method?: 'GET' | 'POST' } = {}
  ): Observable<{ success: boolean; program: string; transaction: string; result: any }> {
    return this.http.post<{ success: boolean; program: string; transaction: string; result: any }>(
      `${BASE}/m3/execute`,
      { program, transaction, data, options }
    );
  }

  importM3Factures(
    records: Record<string, string>[],
    mapping?: Record<string, string>
  ): Observable<{ success: boolean; count: number; ids: string[] }> {
    return this.http.post<{ success: boolean; count: number; ids: string[] }>(
      `${BASE}/m3/import-factures`,
      { records, mapping }
    );
  }

  // ION Config — credentials de connexion
  getIonConfig(): Observable<{ config: any; configured: boolean }> {
    return this.http.get<{ config: any; configured: boolean }>(`${BASE}/ion-config`);
  }
  saveIonConfig(config: any): Observable<{ success: boolean; config: any; configured: boolean }> {
    return this.http.put<{ success: boolean; config: any; configured: boolean }>(`${BASE}/ion-config`, config);
  }
  testIonConnection(): Observable<{ success: boolean; tokenType?: string; expiresIn?: number; error?: string; detail?: any }> {
    return this.http.post<{ success: boolean; tokenType?: string; expiresIn?: number; error?: string; detail?: any }>(`${BASE}/ion-config/test`, {});
  }
=======
  getStats(): Observable<any> { return this.http.get(`${API_BASE}/stats`); }
>>>>>>> 8b9107fa6a823c197e18b010dca5cc5c43bcb7a3
}
