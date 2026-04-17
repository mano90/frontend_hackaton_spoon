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

/** Réponse POST /api/m3/import-factures */
export interface M3ImportFacturesResponse {
  success: boolean;
  count: number;
  ids: string[];
  pendingDuplicateCount?: number;
  pendingDuplicates?: Array<{
    pendingId: string;
    reference: string;
    pendingDocument: Record<string, unknown>;
    similarity: {
      duplicateId: string;
      confidence: number;
      reason: string;
      existingDocument: Record<string, unknown> | null;
    };
  }>;
}

export interface SalesforceSyncPayload {
  dateFrom?: string;
  dateTo?: string;
  includeEmails?: boolean;
}

export interface SalesforceSyncResult {
  mouvements: number;
  documents: number;
  purchaseOrders: number;
  supplierInvoices: number;
  reconciliations: number;
  pdfs: number;
  errors: string[];
}

export interface SalesforceSObject {
  name: string;
  label: string;
  labelPlural?: string;
  custom: boolean;
  queryable: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  keyPrefix?: string | null;
}

export interface SalesforceStatus {
  connected: boolean;
  hasCredentials: boolean;
  username?: string;
  env?: 'sandbox' | 'production';
  instanceUrl?: string;
  issuedAt?: string;
  envDefaults: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    loginUrl: string;
    env: 'sandbox' | 'production';
  };
}

export interface SalesforceConnectPayload {
  env?: 'sandbox' | 'production';
  loginUrl?: string;
}

export interface SalesforceConnectResponse {
  success: boolean;
  error?: string;
  session?: {
    username: string;
    instanceUrl: string;
    env: 'sandbox' | 'production';
    issuedAt: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Documents
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
  uploadDocumentsBatch(files: File[], docType?: string): Observable<{
    success: boolean; fileCount: number; results: unknown[];
    dossiers?: { scenarioId: string; documentIds: string[] }[];
  }> {
    const fd = new FormData();
    for (const f of files) fd.append('files', f, f.name);
    if (docType) fd.append('docType', docType);
    return this.http.post<{
      success: boolean; fileCount: number; results: unknown[];
      dossiers?: { scenarioId: string; documentIds: string[] }[];
    }>(`${API_BASE}/documents/upload-batch`, fd);
  }
  confirmDocument(pendingId: string, docType?: string): Observable<any> {
    return this.http.post(`${API_BASE}/documents/confirm/${pendingId}`, docType ? { docType } : {});
  }
  replaceDocument(pendingId: string, existingId: string): Observable<any> {
    return this.http.post(`${API_BASE}/documents/replace/${pendingId}/${existingId}`, {});
  }
  cancelPending(pendingId: string): Observable<any> {
    return this.http.delete(`${API_BASE}/documents/pending/${pendingId}`);
  }
  getPendingList(): Observable<{ items: PendingListItem[] }> {
    return this.http.get<{ items: PendingListItem[] }>(`${API_BASE}/documents/pending-list`);
  }
  getDocumentPdfUrl(id: string): string { return `${API_BASE}/documents/${id}/pdf`; }
  getPendingPdfUrl(pendingId: string): string { return `${API_BASE}/documents/pending/${pendingId}/pdf`; }
  openDocumentPdfInNewTab(id: string): void {
    this.http.get(this.getDocumentPdfUrl(id), { responseType: 'blob' }).subscribe({
      next: (blob) => { const u = URL.createObjectURL(blob); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60_000); },
      error: (e) => console.error('[ApiService] PDF open failed', e),
    });
  }
  openPendingPdfInNewTab(pendingId: string): void {
    this.http.get(this.getPendingPdfUrl(pendingId), { responseType: 'blob' }).subscribe({
      next: (blob) => { const u = URL.createObjectURL(blob); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60_000); },
      error: (e) => console.error('[ApiService] Pending PDF open failed', e),
    });
  }
  deleteDocument(id: string): Observable<any> { return this.http.delete(`${API_BASE}/documents/${id}`); }
  getDocument(id: string): Observable<any> { return this.http.get<any>(`${API_BASE}/documents/${id}`); }

  // Mouvements
  createMouvement(data: any): Observable<any> { return this.http.post(`${API_BASE}/mouvements`, data); }
  getMouvements(): Observable<any[]> { return this.http.get<any[]>(`${API_BASE}/mouvements`); }
  deleteMouvement(id: string): Observable<any> { return this.http.delete(`${API_BASE}/mouvements/${id}`); }
  importMouvementsCsv(file: File): Observable<{
    success: boolean; count: number; mouvements: unknown[]; warnings?: string[]; headersDetected?: string[];
  }> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<{
      success: boolean; count: number; mouvements: unknown[]; warnings?: string[]; headersDetected?: string[];
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

  // AI Query
  query(q: string, sessionId: string): Observable<{
    answer: string; sources: AIQuerySourceRef[]; sessionId: string;
    timelineEvents?: Record<string, unknown>[]; timelineMeta?: AIQueryTimelineMeta; dossierBriefs?: AIQueryDossierBrief[];
  }> {
    return this.http.post<{
      answer: string; sources: AIQuerySourceRef[]; sessionId: string;
      timelineEvents?: Record<string, unknown>[]; timelineMeta?: AIQueryTimelineMeta; dossierBriefs?: AIQueryDossierBrief[];
    }>(`${API_BASE}/query`, { query: q, sessionId });
  }
  getQueryHistory(sessionId: string): Observable<{ sessionId: string; turns: AIQueryHistoryTurn[] }> {
    return this.http.get<{ sessionId: string; turns: AIQueryHistoryTurn[] }>(`${API_BASE}/query/history/${sessionId}`);
  }
  resetQuerySession(sessionId: string): Observable<void> {
    return this.http.post(`${API_BASE}/query/reset`, { sessionId }, { responseType: 'text' }).pipe(map(() => undefined));
  }

  // Config rapprochement
  getConfig(): Observable<{ config: any; defaults: any }> { return this.http.get<{ config: any; defaults: any }>(`${API_BASE}/config`); }
  updateConfig(config: any): Observable<{ success: boolean; config: any }> { return this.http.put<{ success: boolean; config: any }>(`${API_BASE}/config`, config); }
  resetConfig(): Observable<{ success: boolean; config: any }> { return this.http.post<{ success: boolean; config: any }>(`${API_BASE}/config/reset`, {}); }

  // Admin
  clearAllData(): Observable<{ success: boolean; deleted: number }> {
    return this.http.delete<{ success: boolean; deleted: number }>(`${API_BASE}/admin/clear-all`);
  }
  reloadSeeds(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${API_BASE}/admin/seed`, {});
  }

  // Stats
  getStats(): Observable<any> { return this.http.get(`${API_BASE}/stats`); }

  // Salesforce
  getSalesforceStatus(): Observable<SalesforceStatus> {
    return this.http.get<SalesforceStatus>(`${API_BASE}/integrations/salesforce/status`);
  }
  connectSalesforce(payload: SalesforceConnectPayload): Observable<SalesforceConnectResponse> {
    return this.http.post<SalesforceConnectResponse>(`${API_BASE}/integrations/salesforce/connect`, payload);
  }
  disconnectSalesforce(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${API_BASE}/integrations/salesforce/disconnect`, {});
  }
  listSalesforceSObjects(): Observable<{ total: number; objects: SalesforceSObject[] }> {
    return this.http.get<{ total: number; objects: SalesforceSObject[] }>(`${API_BASE}/integrations/salesforce/sobjects`);
  }
  syncSalesforceData(payload: SalesforceSyncPayload): Observable<SalesforceSyncResult> {
    return this.http.post<SalesforceSyncResult>(`${API_BASE}/integrations/salesforce/sync`, payload);
  }

  // M3 / ION API
  executeM3(
    program: string,
    transaction: string,
    data: Record<string, string> = {},
    options: { maxrecs?: number; returncols?: string; method?: 'GET' | 'POST' } = {}
  ): Observable<{ success: boolean; program: string; transaction: string; result: any }> {
    return this.http.post<{ success: boolean; program: string; transaction: string; result: any }>(
      `${API_BASE}/m3/execute`,
      { program, transaction, data, options }
    );
  }
  importM3Factures(
    records: Record<string, string>[],
    mapping?: Record<string, string>
  ): Observable<M3ImportFacturesResponse> {
    return this.http.post<M3ImportFacturesResponse>(`${API_BASE}/m3/import-factures`, { records, mapping });
  }

  // ION Config
  getIonConfig(): Observable<{ config: any; configured: boolean }> {
    return this.http.get<{ config: any; configured: boolean }>(`${API_BASE}/ion-config`);
  }
  saveIonConfig(config: any): Observable<{ success: boolean; config: any; configured: boolean }> {
    return this.http.put<{ success: boolean; config: any; configured: boolean }>(`${API_BASE}/ion-config`, config);
  }
  testIonConnection(): Observable<{ success: boolean; tokenType?: string; expiresIn?: number; error?: string; detail?: any }> {
    return this.http.post<{ success: boolean; tokenType?: string; expiresIn?: number; error?: string; detail?: any }>(
      `${API_BASE}/ion-config/test`, {}
    );
  }
}
