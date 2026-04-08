import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgxSpinnerModule],
  template: `
    <ngx-spinner type="ball-clip-rotate" size="medium" color="#6366f1"></ngx-spinner>

    <div class="dashboard">
      <h1>Tableau de bord</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📄</div>
          <div class="stat-value">{{ stats()?.factures?.count ?? 0 }}</div>
          <div class="stat-label">Factures</div>
          <div class="stat-total">Total: {{ stats()?.factures?.total | number:'1.2-2' }} €</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🏦</div>
          <div class="stat-value">{{ stats()?.mouvements?.count ?? 0 }}</div>
          <div class="stat-label">Mouvements</div>
          <div class="stat-sub">
            <span class="entree">↑ {{ stats()?.mouvements?.totalEntrees | number:'1.2-2' }} €</span>
            <span class="sortie">↓ {{ stats()?.mouvements?.totalSorties | number:'1.2-2' }} €</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🔗</div>
          <div class="stat-value">{{ stats()?.rapprochements?.count ?? 0 }}</div>
          <div class="stat-label">Rapprochements</div>
          <div class="stat-sub">
            <span class="exact">✓ {{ stats()?.rapprochements?.exact ?? 0 }}</span>
            <span class="partial">~ {{ stats()?.rapprochements?.partial ?? 0 }}</span>
            <span class="no-match">✗ {{ stats()?.rapprochements?.noMatch ?? 0 }}</span>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h2>Actions rapides</h2>
        <div class="actions-grid">
          <a routerLink="/factures" class="action-btn">Gérer les factures</a>
          <a routerLink="/mouvements" class="action-btn">Gérer les mouvements</a>
          <a routerLink="/rapprochement" class="action-btn primary">Lancer le rapprochement</a>
          <a routerLink="/query" class="action-btn ai">Poser une question IA</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 2rem; color: #1e293b; }
    h2 { font-size: 1.3rem; margin-bottom: 1rem; color: #334155; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card {
      background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center; transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .stat-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2.5rem; font-weight: 700; color: #6366f1; }
    .stat-label { font-size: 1rem; color: #64748b; margin-top: 0.25rem; }
    .stat-total { font-size: 0.9rem; color: #94a3b8; margin-top: 0.5rem; }
    .stat-sub { display: flex; gap: 0.75rem; justify-content: center; margin-top: 0.5rem; font-size: 0.85rem; }
    .entree { color: #22c55e; } .sortie { color: #ef4444; }
    .exact { color: #22c55e; } .partial { color: #f59e0b; } .no-match { color: #ef4444; }

    .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .action-btn {
      display: block; padding: 1rem; text-align: center; border-radius: 8px;
      background: #f1f5f9; color: #334155; text-decoration: none; font-weight: 500;
      transition: all 0.2s;
    }
    .action-btn:hover { background: #e2e8f0; }
    .action-btn.primary { background: #6366f1; color: white; }
    .action-btn.primary:hover { background: #4f46e5; }
    .action-btn.ai { background: #8b5cf6; color: white; }
    .action-btn.ai:hover { background: #7c3aed; }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);

  stats = signal<any>(null);

  ngOnInit() {
    this.spinner.show();
    this.api.getStats().subscribe({
      next: (data) => { this.stats.set(data); this.spinner.hide(); },
      error: () => this.spinner.hide()
    });
  }
}
