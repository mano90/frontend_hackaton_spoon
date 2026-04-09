import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = 'http://localhost:3000/api';

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

  // AI Query
  query(q: string): Observable<{ answer: string; sources: string[] }> { return this.http.post<{ answer: string; sources: string[] }>(`${BASE}/query`, { query: q }); }

  // Stats
  getStats(): Observable<any> { return this.http.get(`${BASE}/stats`); }
}
