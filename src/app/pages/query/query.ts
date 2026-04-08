import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-query',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxSpinnerModule],
  template: `
    <ngx-spinner name="query" type="ball-clip-rotate" size="medium" color="#8b5cf6"></ngx-spinner>

    <div class="page">
      <h1>Assistant IA</h1>
      <p class="subtitle">Posez des questions sur vos factures et mouvements bancaires</p>

      <div class="query-box">
        <textarea [(ngModel)]="queryText" placeholder="Ex: Quelles factures correspondent à la sortie de 1500€ du 15 mars ?"
                  rows="3" (keydown.control.enter)="ask()"></textarea>
        <button class="btn-ask" (click)="ask()" [disabled]="loading() || !queryText.trim()">
          {{ loading() ? 'Réflexion en cours...' : 'Demander' }}
        </button>
      </div>

      <div class="history">
        @for (item of history(); track $index) {
          <div class="chat-item">
            <div class="question">
              <span class="avatar user">👤</span>
              <p>{{ item.question }}</p>
            </div>
            <div class="answer">
              <span class="avatar ai">🤖</span>
              <div>
                <p>{{ item.answer }}</p>
                @if (item.sources.length) {
                  <div class="sources">
                    <strong>Sources:</strong>
                    @for (s of item.sources; track s) {
                      <span class="source-tag">{{ s | slice:0:8 }}...</span>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; color: #1e293b; }
    .subtitle { color: #64748b; margin-bottom: 1.5rem; }

    .query-box { display: flex; gap: 1rem; margin-bottom: 2rem; align-items: flex-end; }
    textarea {
      flex: 1; padding: 0.75rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px;
      resize: none; font-family: inherit; font-size: 0.95rem; transition: border-color 0.2s;
    }
    textarea:focus { outline: none; border-color: #8b5cf6; }
    .btn-ask {
      background: #8b5cf6; color: white; border: none; padding: 0.75rem 1.5rem;
      border-radius: 8px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.2s;
    }
    .btn-ask:hover:not(:disabled) { background: #7c3aed; }
    .btn-ask:disabled { opacity: 0.6; cursor: not-allowed; }

    .history { display: flex; flex-direction: column; gap: 1.5rem; }
    .chat-item { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .question, .answer { display: flex; gap: 0.75rem; align-items: flex-start; }
    .question { margin-bottom: 1rem; }
    .question p { font-weight: 500; color: #1e293b; margin: 0; }
    .answer p { color: #475569; line-height: 1.6; margin: 0; }
    .avatar { font-size: 1.5rem; flex-shrink: 0; }

    .sources { margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .source-tag { background: #f3e8ff; color: #7c3aed; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
  `]
})
export class QueryComponent {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);

  queryText = '';
  loading = signal(false);
  history = signal<{ question: string; answer: string; sources: string[] }[]>([]);

  ask() {
    const q = this.queryText.trim();
    if (!q) return;

    this.loading.set(true);
    this.spinner.show('query');
    this.queryText = '';

    this.api.query(q).subscribe({
      next: (res) => {
        this.history.update(h => [{ question: q, answer: res.answer, sources: res.sources || [] }, ...h]);
        this.loading.set(false);
        this.spinner.hide('query');
      },
      error: () => {
        this.history.update(h => [{ question: q, answer: 'Erreur lors de la requête.', sources: [] }, ...h]);
        this.loading.set(false);
        this.spinner.hide('query');
      }
    });
  }
}
