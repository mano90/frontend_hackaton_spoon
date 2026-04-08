import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  template: `
    <ngx-spinner name="factures" type="ball-clip-rotate" size="medium" color="#6366f1"></ngx-spinner>

    <div class="page">
      <h1>Factures</h1>

      <div class="upload-zone" (drop)="onDrop($event)" (dragover)="$event.preventDefault()"
           (click)="fileInput.click()">
        <input #fileInput type="file" accept=".pdf" (change)="onFileSelect($event)" hidden multiple>
        <div class="upload-icon">📄</div>
        <p>Glissez vos factures PDF ici ou cliquez pour sélectionner</p>
        @if (uploading()) {
          <div class="upload-progress">Analyse en cours par l'IA...</div>
        }
      </div>

      @if (error()) {
        <div class="error-msg">{{ error() }}</div>
      }

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Fichier</th>
              <th>Fournisseur</th>
              <th>Référence</th>
              <th>Date</th>
              <th>Montant</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (f of factures(); track f.id) {
              <tr>
                <td>{{ f.fileName }}</td>
                <td>{{ f.fournisseur }}</td>
                <td>{{ f.reference }}</td>
                <td>{{ f.date }}</td>
                <td class="montant">{{ f.montant | number:'1.2-2' }} €</td>
                <td>
                  <button class="btn-delete" (click)="delete(f.id)">Supprimer</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Aucune facture importée</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; color: #1e293b; }

    .upload-zone {
      border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center;
      cursor: pointer; transition: all 0.2s; margin-bottom: 2rem; background: #f8fafc;
    }
    .upload-zone:hover { border-color: #6366f1; background: #eef2ff; }
    .upload-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .upload-progress { color: #6366f1; font-weight: 500; margin-top: 0.5rem; }
    .error-msg { background: #fef2f2; color: #dc2626; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }

    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #475569; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #f1f5f9; }
    .montant { font-weight: 600; color: #6366f1; }
    .empty { text-align: center; color: #94a3b8; padding: 2rem !important; }
    .btn-delete { background: #fee2e2; color: #dc2626; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; }
    .btn-delete:hover { background: #fecaca; }
  `]
})
export class FacturesComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);

  factures = signal<any[]>([]);
  uploading = signal(false);
  error = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.spinner.show('factures');
    this.api.getFactures().subscribe({
      next: (data) => { this.factures.set(data); this.spinner.hide('factures'); },
      error: () => this.spinner.hide('factures')
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(f => this.upload(f));
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      Array.from(event.dataTransfer.files).forEach(f => this.upload(f));
    }
  }

  upload(file: File) {
    this.uploading.set(true);
    this.error.set('');
    this.api.uploadFacture(file).subscribe({
      next: () => { this.uploading.set(false); this.load(); },
      error: (err) => { this.uploading.set(false); this.error.set(err.error?.error || 'Upload failed'); }
    });
  }

  delete(id: string) {
    this.api.deleteFacture(id).subscribe(() => this.load());
  }
}
