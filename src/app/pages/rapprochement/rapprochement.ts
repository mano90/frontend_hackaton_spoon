import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-rapprochement',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  template: `
    <ngx-spinner name="rapprochement" type="ball-clip-rotate" size="medium" color="#6366f1"></ngx-spinner>

    <div class="page">
      <h1>Rapprochement Bancaire</h1>

      <div class="actions">
        <button class="btn-primary" (click)="runAll()" [disabled]="running()">
          {{ running() ? 'Analyse IA en cours...' : 'Lancer le rapprochement automatique' }}
        </button>
      </div>

      @if (error()) {
        <div class="error-msg">{{ error() }}</div>
      }

      <div class="results">
        @for (r of rapprochements(); track r.id) {
          <div class="result-card" [class.exact]="r.status === 'exact'"
               [class.partial]="r.status === 'partial'" [class.no-match]="r.status === 'no_match'">
            <div class="result-header">
              <span class="status-badge" [class]="r.status">
                {{ r.status === 'exact' ? 'Correspondance exacte' : r.status === 'partial' ? 'Correspondance partielle' : 'Aucune correspondance' }}
              </span>
              <span class="ecart" *ngIf="r.ecart !== 0">Écart: {{ r.ecart | number:'1.2-2' }} €</span>
            </div>

            <div class="result-body">
              <div class="amounts">
                <div class="amount-item">
                  <span class="label">Mouvement:</span>
                  <span class="value sortie">{{ r.montantMouvement | number:'1.2-2' }} €</span>
                </div>
                <div class="amount-item">
                  <span class="label">Factures:</span>
                  <span class="value">{{ r.montantFactures | number:'1.2-2' }} €</span>
                </div>
              </div>

              <div class="ai-explanation">
                <strong>Analyse IA:</strong>
                <p>{{ r.aiExplanation }}</p>
              </div>

              @if (r.factureIds?.length) {
                <div class="matched-factures">
                  <strong>Factures associées:</strong>
                  <span class="facture-id" *ngFor="let fid of r.factureIds">{{ fid | slice:0:8 }}...</span>
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <p>Aucun rapprochement effectué.</p>
            <p>Importez des factures et des mouvements bancaires, puis lancez le rapprochement.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; color: #1e293b; }

    .actions { margin-bottom: 2rem; }
    .btn-primary {
      background: #6366f1; color: white; border: none; padding: 0.75rem 1.5rem;
      border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
    }
    .btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { background: #fef2f2; color: #dc2626; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }

    .results { display: flex; flex-direction: column; gap: 1rem; }
    .result-card {
      background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-left: 4px solid #94a3b8;
    }
    .result-card.exact { border-left-color: #22c55e; }
    .result-card.partial { border-left-color: #f59e0b; }
    .result-card.no-match { border-left-color: #ef4444; }

    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .status-badge {
      padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500;
    }
    .status-badge.exact { background: #dcfce7; color: #16a34a; }
    .status-badge.partial { background: #fef3c7; color: #d97706; }
    .status-badge.no_match { background: #fee2e2; color: #dc2626; }
    .ecart { font-weight: 600; color: #ef4444; }

    .amounts { display: flex; gap: 2rem; margin-bottom: 1rem; }
    .amount-item { display: flex; gap: 0.5rem; }
    .label { color: #64748b; } .value { font-weight: 600; }
    .sortie { color: #ef4444; }

    .ai-explanation { background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
    .ai-explanation p { margin: 0.5rem 0 0; color: #475569; line-height: 1.5; }

    .matched-factures { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .facture-id { background: #eef2ff; color: #6366f1; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }

    .empty-state { text-align: center; padding: 3rem; color: #94a3b8; background: white; border-radius: 12px; }
  `]
})
export class RapprochementComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);

  rapprochements = signal<any[]>([]);
  running = signal(false);
  error = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.spinner.show('rapprochement');
    this.api.getRapprochements().subscribe({
      next: (data) => { this.rapprochements.set(data); this.spinner.hide('rapprochement'); },
      error: () => this.spinner.hide('rapprochement')
    });
  }

  runAll() {
    this.running.set(true);
    this.error.set('');
    this.api.runAllRapprochements().subscribe({
      next: () => { this.running.set(false); this.load(); },
      error: (err) => { this.running.set(false); this.error.set(err.error?.error || 'Rapprochement failed'); }
    });
  }
}
