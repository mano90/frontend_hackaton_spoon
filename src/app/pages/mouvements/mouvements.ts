import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-mouvements',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  template: `
    <ngx-spinner name="mouvements" type="ball-clip-rotate" size="medium" color="#6366f1"></ngx-spinner>

    <div class="page">
      <h1>Mouvements Bancaires</h1>

      <div class="upload-zone" (drop)="onDrop($event)" (dragover)="$event.preventDefault()"
           (click)="fileInput.click()">
        <input #fileInput type="file" accept=".pdf" (change)="onFileSelect($event)" hidden>
        <div class="upload-icon">🏦</div>
        <p>Glissez votre relevé bancaire PDF ici ou cliquez pour sélectionner</p>
        @if (uploading()) {
          <div class="upload-progress">Extraction des mouvements par l'IA...</div>
        }
      </div>

      @if (error()) {
        <div class="error-msg">{{ error() }}</div>
      }

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Libellé</th>
              <th>Référence</th>
              <th>Type</th>
              <th>Montant</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (m of mouvements(); track m.id) {
              <tr>
                <td>{{ m.date }}</td>
                <td>{{ m.libelle }}</td>
                <td>{{ m.reference }}</td>
                <td>
                  <span class="badge" [class.entree]="m.type_mouvement === 'entree'"
                        [class.sortie]="m.type_mouvement === 'sortie'">
                    {{ m.type_mouvement === 'entree' ? '↑ Entrée' : '↓ Sortie' }}
                  </span>
                </td>
                <td class="montant" [class.entree-text]="m.type_mouvement === 'entree'"
                    [class.sortie-text]="m.type_mouvement === 'sortie'">
                  {{ m.montant | number:'1.2-2' }} €
                </td>
                <td>
                  <button class="btn-delete" (click)="delete(m.id)">Supprimer</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Aucun mouvement importé</td></tr>
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
    .montant { font-weight: 600; }
    .entree-text { color: #22c55e; } .sortie-text { color: #ef4444; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
    .badge.entree { background: #dcfce7; color: #16a34a; }
    .badge.sortie { background: #fee2e2; color: #dc2626; }
    .empty { text-align: center; color: #94a3b8; padding: 2rem !important; }
    .btn-delete { background: #fee2e2; color: #dc2626; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; }
    .btn-delete:hover { background: #fecaca; }
  `]
})
export class MouvementsComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);

  mouvements = signal<any[]>([]);
  uploading = signal(false);
  error = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.spinner.show('mouvements');
    this.api.getMouvements().subscribe({
      next: (data) => { this.mouvements.set(data); this.spinner.hide('mouvements'); },
      error: () => this.spinner.hide('mouvements')
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.upload(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files?.[0]) this.upload(event.dataTransfer.files[0]);
  }

  upload(file: File) {
    this.uploading.set(true);
    this.error.set('');
    this.api.uploadMouvement(file).subscribe({
      next: () => { this.uploading.set(false); this.load(); },
      error: (err) => { this.uploading.set(false); this.error.set(err.error?.error || 'Upload failed'); }
    });
  }

  delete(id: string) {
    this.api.deleteMouvement(id).subscribe(() => this.load());
  }
}
