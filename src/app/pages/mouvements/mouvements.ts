import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-mouvements',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxSpinnerModule],
  template: `
    <ngx-spinner name="mouvements" type="ball-clip-rotate" size="medium" color="#6366f1"></ngx-spinner>

    <div class="page">
      <h1>Mouvements Bancaires</h1>

      <div class="add-form">
        <h3>Ajouter un mouvement</h3>
        <div class="form-row">
          <div class="field">
            <label>Libelle</label>
            <input type="text" [(ngModel)]="form.libelle" placeholder="VIR Fournisseur - Description">
          </div>
          <div class="field">
            <label>Reference</label>
            <input type="text" [(ngModel)]="form.reference" placeholder="VIR-2026-XXX">
          </div>
        </div>
        <div class="form-row">
          <div class="field">
            <label>Montant (EUR)</label>
            <input type="number" [(ngModel)]="form.montant" placeholder="0.00" step="0.01">
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" [(ngModel)]="form.date">
          </div>
          <div class="field">
            <label>Type</label>
            <select [(ngModel)]="form.type_mouvement">
              <option value="sortie">Sortie</option>
              <option value="entree">Entree</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-add" (click)="addMouvement()" [disabled]="!form.libelle || !form.montant || !form.date">
            <i class="fas fa-plus"></i> Ajouter
          </button>
        </div>
        @if (error()) {
          <div class="error-msg">{{ error() }}</div>
        }
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libelle</th>
              <th>Reference</th>
              <th>Type</th>
              <th>Montant</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (m of paged(); track m.id) {
              <tr>
                <td>{{ m.date }}</td>
                <td>{{ m.libelle }}</td>
                <td>{{ m.reference }}</td>
                <td>
                  <span class="badge" [class.entree]="m.type_mouvement === 'entree'"
                        [class.sortie]="m.type_mouvement === 'sortie'">
                    {{ m.type_mouvement === 'entree' ? 'Entree' : 'Sortie' }}
                  </span>
                </td>
                <td class="montant" [class.entree-text]="m.type_mouvement === 'entree'"
                    [class.sortie-text]="m.type_mouvement === 'sortie'">
                  {{ m.montant | number:'1.2-2' }} EUR
                </td>
                <td>
                  <button class="btn-delete" (click)="delete(m.id)" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Aucun mouvement enregistre</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="pagination">
          <button (click)="setPage(page() - 1)" [disabled]="page() === 1"><i class="fas fa-chevron-left"></i></button>
          @for (p of pageNumbers(); track p) {
            <button [class.active]="p === page()" (click)="setPage(p)">{{ p }}</button>
          }
          <button (click)="setPage(page() + 1)" [disabled]="page() === totalPages()"><i class="fas fa-chevron-right"></i></button>
          <span class="page-info">{{ mouvements().length }} elements</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; color: #1e293b; }

    .add-form {
      background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .add-form h3 { margin: 0 0 1rem 0; font-size: 1.1rem; color: #334155; }
    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .field { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; }
    .field label { font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
    .field input, .field select {
      padding: 0.6rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 0.95rem; outline: none; transition: border-color 0.2s;
    }
    .field input:focus, .field select:focus { border-color: #6366f1; }
    .form-actions { display: flex; justify-content: flex-end; }
    .btn-add {
      background: #6366f1; color: white; border: none; padding: 0.6rem 1.5rem;
      border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;
    }
    .btn-add:hover { background: #4f46e5; }
    .btn-add:disabled { background: #cbd5e1; cursor: not-allowed; }
    .error-msg { background: #fef2f2; color: #dc2626; padding: 0.75rem 1rem; border-radius: 8px; margin-top: 1rem; }

    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #475569; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #f1f5f9; }
    .montant { font-weight: 600; }
    .entree-text { color: #22c55e; } .sortie-text { color: #ef4444; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
    .badge.entree { background: #dcfce7; color: #16a34a; }
    .badge.sortie { background: #fee2e2; color: #dc2626; }
    .empty { text-align: center; color: #94a3b8; padding: 2rem !important; }
    .btn-delete { background: #fee2e2; color: #dc2626; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; }
    .btn-delete:hover { background: #fecaca; }

    .pagination { display: flex; align-items: center; gap: 0.3rem; margin-top: 1rem; justify-content: center; }
    .pagination button { padding: 0.4rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-size: 0.85rem; color: #475569; transition: all 0.15s; }
    .pagination button:hover:not(:disabled) { border-color: #6366f1; color: #6366f1; }
    .pagination button.active { background: #6366f1; color: white; border-color: #6366f1; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { margin-left: 0.75rem; font-size: 0.8rem; color: #94a3b8; }
  `]
})
export class MouvementsComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);

  mouvements = signal<any[]>([]);
  error = signal('');

  page = signal(1);
  pageSize = 10;
  totalPages = computed(() => Math.max(1, Math.ceil(this.mouvements().length / this.pageSize)));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.mouvements().slice(start, start + this.pageSize);
  });
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  setPage(p: number) { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }

  form = {
    libelle: '',
    reference: '',
    montant: null as number | null,
    date: '',
    type_mouvement: 'sortie',
  };

  ngOnInit() { this.load(); }

  load() {
    this.spinner.show('mouvements');
    this.api.getMouvements().subscribe({
      next: (data) => { this.mouvements.set(data); this.page.set(1); this.spinner.hide('mouvements'); },
      error: () => this.spinner.hide('mouvements')
    });
  }

  addMouvement() {
    this.error.set('');
    this.api.createMouvement(this.form).subscribe({
      next: () => {
        this.form = { libelle: '', reference: '', montant: null, date: '', type_mouvement: 'sortie' };
        this.load();
      },
      error: (err) => this.error.set(err.error?.error || 'Erreur lors de la creation')
    });
  }

  delete(id: string) {
    this.api.deleteMouvement(id).subscribe(() => this.load());
  }
}
