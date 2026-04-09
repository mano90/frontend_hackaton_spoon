import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule } from 'ngx-spinner';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-rapprochement',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  template: `
    <div class="page">
      <h1>Rapprochement Bancaire</h1>

      <div class="actions">
        <button class="btn-primary" (click)="runAll()" [disabled]="running()">
          @if (running()) {
            <i class="fas fa-spinner fa-spin"></i> Analyse en cours...
          } @else {
            <i class="fas fa-play"></i> Lancer le rapprochement
          }
        </button>
      </div>

      <!-- Progress overlay -->
      @if (running()) {
        <div class="progress-overlay">
          <div class="progress-card">
            <div class="progress-header">
              <div class="progress-icon">
                <div class="pulse-ring"></div>
                <div class="pulse-dot"></div>
              </div>
              <h3>Rapprochement en cours</h3>
            </div>

            <div class="progress-info">
              <span class="progress-label">{{ progressCurrent() }} / {{ progressTotal() }} mouvements traites</span>
              <span class="progress-percent">{{ progressPercent() }}%</span>
            </div>

            <div class="progress-bar-track">
              <div class="progress-bar-fill" [style.width.%]="progressPercent()"></div>
            </div>

            @if (progressCurrentLabel()) {
              <p class="progress-detail">{{ progressCurrentLabel() }}</p>
            }

            <div class="progress-stats">
              <div class="stat exact">
                <span class="stat-count">{{ statsExact() }}</span>
                <span class="stat-label">Exact</span>
              </div>
              <div class="stat partial">
                <span class="stat-count">{{ statsPartial() }}</span>
                <span class="stat-label">Partiel</span>
              </div>
              <div class="stat no-match">
                <span class="stat-count">{{ statsNoMatch() }}</span>
                <span class="stat-label">Sans correspondance</span>
              </div>
            </div>
          </div>
        </div>
      }

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
              <span class="ecart" *ngIf="r.ecart !== 0">Ecart: {{ r.ecart | number:'1.2-2' }} EUR</span>
            </div>

            <div class="result-body">
              <div class="amounts">
                <div class="amount-item">
                  <span class="label">Mouvement:</span>
                  <span class="value sortie">{{ r.montantMouvement | number:'1.2-2' }} EUR</span>
                </div>
                <div class="amount-item">
                  <span class="label">Factures:</span>
                  <span class="value">{{ r.montantFactures | number:'1.2-2' }} EUR</span>
                </div>
              </div>

              <div class="ai-explanation">
                <strong>Analyse IA:</strong>
                <p>{{ r.aiExplanation }}</p>
              </div>

              @if (r.factureIds?.length) {
                <div class="matched-factures">
                  <strong>Factures associees:</strong>
                  <span class="facture-id" *ngFor="let fid of r.factureIds">{{ fid | slice:0:8 }}...</span>
                </div>
              }

              <div class="confirm-actions">
                @if (r.confirmed) {
                  <span class="confirmed-badge">Confirme</span>
                } @else {
                  <button class="btn-confirm" (click)="confirm(r.id)"><i class="fas fa-check"></i> Confirmer</button>
                  <button class="btn-reject" (click)="reject(r.id)"><i class="fas fa-times"></i> Rejeter</button>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <p>Aucun rapprochement effectue.</p>
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

    /* Progress overlay */
    .progress-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.75); z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    .progress-card {
      background: white; border-radius: 16px; padding: 2rem 2.5rem; width: 480px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3);
    }
    .progress-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .progress-header h3 { margin: 0; font-size: 1.15rem; color: #1e293b; }

    /* Pulse animation */
    .progress-icon { position: relative; width: 36px; height: 36px; }
    .pulse-dot {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 12px; height: 12px; border-radius: 50%; background: #6366f1;
    }
    .pulse-ring {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 36px; height: 36px; border-radius: 50%; border: 3px solid #6366f1;
      animation: pulseRing 1.5s ease-out infinite;
    }
    @keyframes pulseRing {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
    }

    .progress-info { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .progress-label { font-size: 0.9rem; color: #64748b; }
    .progress-percent { font-size: 0.9rem; font-weight: 700; color: #6366f1; }

    .progress-bar-track {
      width: 100%; height: 10px; background: #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8);
      border-radius: 10px; transition: width 0.4s ease;
    }

    .progress-detail {
      margin: 0.75rem 0 0; font-size: 0.85rem; color: #94a3b8; text-align: center;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .progress-stats {
      display: flex; gap: 1rem; margin-top: 1.25rem; justify-content: center;
    }
    .stat {
      text-align: center; padding: 0.5rem 1rem; border-radius: 8px; min-width: 80px;
    }
    .stat.exact { background: #dcfce7; }
    .stat.partial { background: #fef3c7; }
    .stat.no-match { background: #fee2e2; }
    .stat-count { display: block; font-size: 1.25rem; font-weight: 700; }
    .stat.exact .stat-count { color: #16a34a; }
    .stat.partial .stat-count { color: #d97706; }
    .stat.no-match .stat-count { color: #dc2626; }
    .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: 600; }

    /* Results */
    .results { display: flex; flex-direction: column; gap: 1rem; }
    .result-card {
      background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-left: 4px solid #94a3b8;
    }
    .result-card.exact { border-left-color: #22c55e; }
    .result-card.partial { border-left-color: #f59e0b; }
    .result-card.no-match { border-left-color: #ef4444; }

    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .status-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500; }
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

    .confirm-actions { display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center; }
    .btn-confirm { background: #dcfce7; color: #16a34a; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .btn-confirm:hover { background: #bbf7d0; }
    .btn-reject { background: #fee2e2; color: #dc2626; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .btn-reject:hover { background: #fecaca; }
    .confirmed-badge { background: #dcfce7; color: #16a34a; padding: 0.4rem 0.75rem; border-radius: 6px; font-weight: 600; font-size: 0.85rem; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class RapprochementComponent implements OnInit {
  private api = inject(ApiService);

  rapprochements = signal<any[]>([]);
  running = signal(false);
  error = signal('');

  progressTotal = signal(0);
  progressCurrent = signal(0);
  progressCurrentLabel = signal('');
  statsExact = signal(0);
  statsPartial = signal(0);
  statsNoMatch = signal(0);

  progressPercent = computed(() => {
    const total = this.progressTotal();
    if (total === 0) return 0;
    return Math.round((this.progressCurrent() / total) * 100);
  });

  ngOnInit() { this.load(); }

  load() {
    this.api.getRapprochements().subscribe({
      next: (data) => this.rapprochements.set(data),
    });
  }

  confirm(id: string) {
    this.api.confirmRapprochement(id).subscribe(() => this.load());
  }

  reject(id: string) {
    this.api.deleteRapprochement(id).subscribe(() => this.load());
  }

  async runAll() {
    this.running.set(true);
    this.error.set('');
    this.progressCurrent.set(0);
    this.statsExact.set(0);
    this.statsPartial.set(0);
    this.statsNoMatch.set(0);
    this.progressCurrentLabel.set('Recuperation des mouvements...');

    try {
      // Get all sortie mouvement IDs
      const { ids } = await firstValueFrom(this.api.getSortieIds());
      this.progressTotal.set(ids.length);

      if (ids.length === 0) {
        this.running.set(false);
        this.error.set('Aucun mouvement de type sortie a traiter.');
        return;
      }

      // Process one by one
      for (let i = 0; i < ids.length; i++) {
        this.progressCurrentLabel.set(`Analyse du mouvement ${i + 1} / ${ids.length}...`);
        try {
          const res = await firstValueFrom(this.api.runRapprochement(ids[i]));
          if (res?.rapprochement) {
            const status = res.rapprochement.status;
            if (status === 'exact') this.statsExact.update(v => v + 1);
            else if (status === 'partial') this.statsPartial.update(v => v + 1);
            else this.statsNoMatch.update(v => v + 1);
          }
        } catch {
          this.statsNoMatch.update(v => v + 1);
        }
        this.progressCurrent.set(i + 1);
      }

      this.progressCurrentLabel.set('Termine !');
      // Brief pause so user sees 100%
      await new Promise(r => setTimeout(r, 800));
      this.running.set(false);
      this.load();
    } catch (err: any) {
      this.running.set(false);
      this.error.set(err?.error?.error || 'Erreur lors du rapprochement');
    }
  }
}
