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

  getFactures(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/factures`);
  }

  deleteFacture(id: string): Observable<any> {
    return this.http.delete(`${BASE}/factures/${id}`);
  }

  // Mouvements
  uploadMouvement(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${BASE}/mouvements/upload`, fd);
  }

  getMouvements(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/mouvements`);
  }

  deleteMouvement(id: string): Observable<any> {
    return this.http.delete(`${BASE}/mouvements/${id}`);
  }

  // Rapprochement
  runRapprochement(mouvementId: string): Observable<any> {
    return this.http.post(`${BASE}/rapprochement/run/${mouvementId}`, {});
  }

  runAllRapprochements(): Observable<any> {
    return this.http.post(`${BASE}/rapprochement/run-all`, {});
  }

  getRapprochements(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE}/rapprochement`);
  }

  // AI Query
  query(q: string): Observable<{ answer: string; sources: string[] }> {
    return this.http.post<{ answer: string; sources: string[] }>(`${BASE}/query`, { query: q });
  }

  // Stats
  getStats(): Observable<any> {
    return this.http.get(`${BASE}/stats`);
  }
}
