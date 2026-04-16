import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE } from '../core/api.constants';

export interface ProcessedEmail {
  email_id: string;
  type: string[];
  sentiment: string;
  urgency: string;
  action_required: string[];
  entities: any;
  risk_flags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EmailAnalyzerService {
  private apiUrl = `${API_BASE}/emails/analyze`;

  constructor(private http: HttpClient) { }

  analyze(emailId: string, content: string, threadId?: string): Observable<ProcessedEmail> {
    const payload = { emailId, content, threadId };
    return this.http.post<ProcessedEmail>(this.apiUrl, payload);
  }
}
