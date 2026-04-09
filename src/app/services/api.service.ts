import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // Factures
  uploadFacture(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${BASE}/factures/upload`, fd);
  }
  getFactures(): Observable<any[]> { return this.http.get<any[]>(`${BASE}/factures`); }
  getFacturePdfUrl(id: string): string { return `${BASE}/factures/${id}/pdf`; }
  confirmFacture(pendingId: string): Observable<any> { return this.http.post(`${BASE}/factures/confirm/${pendingId}`, {}); }
  replaceFacture(pendingId: string, existingId: string): Observable<any> { return this.http.post(`${BASE}/factures/replace/${pendingId}/${existingId}`, {}); }
  cancelPending(pendingId: string): Observable<any> { return this.http.delete(`${BASE}/factures/pending/${pendingId}`); }
  deleteFacture(id: string): Observable<any> { return this.http.delete(`${BASE}/factures/${id}`); }

  // Mouvements
  createMouvement(data: any): Observable<any> { return this.http.post(`${BASE}/mouvements`, data); }
  getMouvements(): Observable<any[]> { return this.http.get<any[]>(`${BASE}/mouvements`); }
  deleteMouvement(id: string): Observable<any> { return this.http.delete(`${BASE}/mouvements/${id}`); }

  // Generic documents (devis, bon_commande, bon_livraison, bon_reception, email)
  getDocuments(docType: string): Observable<any[]> { return this.http.get<any[]>(`${BASE}/documents/${docType}`); }
  getDocumentPdfUrl(docType: string, id: string): string { return `${BASE}/documents/${docType}/${id}/pdf`; }
  deleteDocument(docType: string, id: string): Observable<any> { return this.http.delete(`${BASE}/documents/${docType}/${id}`); }

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
