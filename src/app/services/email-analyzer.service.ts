import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  // Ensure this matches your backend's port (e.g., 3000)
  private apiUrl = 'http://localhost:3000/api/emails/analyze';

  constructor(private http: HttpClient) { }

  analyze(emailId: string, content: string, threadId?: string): Observable<ProcessedEmail> {
    const payload = { emailId, content, threadId };
    return this.http.post<ProcessedEmail>(this.apiUrl, payload);
  }
}
