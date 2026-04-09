import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  template: `
    <ngx-spinner name="factures" type="ball-scale-multiple" size="medium" color="#6366f1"
      [fullScreen]="true" bdColor="rgba(15,23,42,0.75)"
    >
      <p class="spinner-msg">{{ spinnerMessage() }}</p>
    </ngx-spinner>

    <div class="page">
      <h1>Factures</h1>

      <div class="upload-zone" (drop)="onDrop($event)" (dragover)="$event.preventDefault()"
           (click)="fileInput.click()">
        <input #fileInput type="file" accept=".pdf" (change)="onFileSelect($event)" hidden multiple>
        <div class="upload-icon">📄</div>
        <p>Glissez vos factures PDF ici ou cliquez pour selectionner</p>
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
              <th>Reference</th>
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
                <td class="montant">{{ f.montant | number:'1.2-2' }} EUR</td>
                <td class="actions">
                  <button class="btn-view" (click)="viewPdf(f.id, f.fileName)">Voir PDF</button>
                  <button class="btn-delete" (click)="delete(f.id)">Supprimer</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty">Aucune facture importee</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- PDF Viewer Modal -->
    @if (pdfUrl()) {
      <div class="modal-overlay" (click)="closePdf()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">{{ pdfName() }}</span>
            <button class="modal-close" (click)="closePdf()">✕</button>
          </div>
          <iframe [src]="pdfUrl()" class="pdf-frame"></iframe>
        </div>
      </div>
    }

    <!-- Duplicate Detection Modal -->
    @if (duplicateInfo()) {
      <div class="modal-overlay">
        <div class="modal-content duplicate-modal" (click)="$event.stopPropagation()">
          <div class="modal-header warning-header">
            <span class="modal-title">Doublon detecte</span>
          </div>
          <div class="duplicate-body">
            <div class="duplicate-alert">
              <div class="alert-icon">⚠️</div>
              <p>{{ duplicateInfo()!.similarity.reason }}</p>
              <p class="confidence">Confiance : <strong>{{ duplicateInfo()!.similarity.confidence }}%</strong></p>
            </div>

            <div class="comparison">
              <div class="compare-card incoming">
                <h4>Nouvelle facture</h4>
                <div class="compare-row"><span>Fichier</span><strong>{{ duplicateInfo()!.pendingFacture.fileName }}</strong></div>
                <div class="compare-row"><span>Fournisseur</span><strong>{{ duplicateInfo()!.pendingFacture.fournisseur }}</strong></div>
                <div class="compare-row"><span>Reference</span><strong>{{ duplicateInfo()!.pendingFacture.reference }}</strong></div>
                <div class="compare-row"><span>Date</span><strong>{{ duplicateInfo()!.pendingFacture.date }}</strong></div>
                <div class="compare-row"><span>Montant</span><strong class="montant">{{ duplicateInfo()!.pendingFacture.montant | number:'1.2-2' }} EUR</strong></div>
              </div>
              @if (duplicateInfo()!.similarity.existingFacture) {
                <div class="compare-card existing">
                  <h4>Facture existante</h4>
                  <div class="compare-row"><span>Fichier</span><strong>{{ duplicateInfo()!.similarity.existingFacture.fileName }}</strong></div>
                  <div class="compare-row"><span>Fournisseur</span><strong>{{ duplicateInfo()!.similarity.existingFacture.fournisseur }}</strong></div>
                  <div class="compare-row"><span>Reference</span><strong>{{ duplicateInfo()!.similarity.existingFacture.reference }}</strong></div>
                  <div class="compare-row"><span>Date</span><strong>{{ duplicateInfo()!.similarity.existingFacture.date }}</strong></div>
                  <div class="compare-row"><span>Montant</span><strong class="montant">{{ duplicateInfo()!.similarity.existingFacture.montant | number:'1.2-2' }} EUR</strong></div>
                </div>
              }
            </div>

            <div class="duplicate-actions">
              <button class="btn-skip" (click)="skipDuplicate()">Annuler l'import</button>
              <button class="btn-keep" (click)="keepBoth()">Garder les deux</button>
              <button class="btn-replace" (click)="replaceExisting()">Remplacer l'existante</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; color: #1e293b; }

    .spinner-msg { color: white; font-size: 1.1rem; margin-top: 1rem; font-weight: 500; }

    .upload-zone {
      border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; text-align: center;
      cursor: pointer; transition: all 0.2s; margin-bottom: 2rem; background: #f8fafc;
    }
    .upload-zone:hover { border-color: #6366f1; background: #eef2ff; }
    .upload-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .error-msg { background: #fef2f2; color: #dc2626; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }

    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #475569; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #f1f5f9; }
    .montant { font-weight: 600; color: #6366f1; }
    .empty { text-align: center; color: #94a3b8; padding: 2rem !important; }

    .actions { display: flex; gap: 0.5rem; }
    .btn-view { background: #eef2ff; color: #6366f1; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .btn-view:hover { background: #e0e7ff; }
    .btn-delete { background: #fee2e2; color: #dc2626; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; }
    .btn-delete:hover { background: #fecaca; }

    /* Modals */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease;
    }
    .modal-content {
      background: white; border-radius: 12px; width: 90vw; height: 90vh;
      max-width: 900px; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
    }
    .modal-title { font-weight: 600; color: #1e293b; font-size: 0.95rem; }
    .modal-close {
      background: none; border: none; font-size: 1.25rem; cursor: pointer;
      color: #64748b; width: 32px; height: 32px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
    }
    .modal-close:hover { background: #f1f5f9; color: #1e293b; }
    .pdf-frame { flex: 1; border: none; width: 100%; }

    /* Duplicate modal */
    .duplicate-modal { height: auto; max-height: 90vh; max-width: 700px; }
    .warning-header { background: #fffbeb; border-bottom-color: #fde68a; }
    .warning-header .modal-title { color: #92400e; }
    .duplicate-body { padding: 1.5rem; overflow-y: auto; }
    .duplicate-alert {
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
      padding: 1rem 1.25rem; margin-bottom: 1.5rem; text-align: center;
    }
    .alert-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .duplicate-alert p { margin: 0.25rem 0; color: #92400e; }
    .confidence { margin-top: 0.5rem !important; }
    .comparison { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    .compare-card { flex: 1; border-radius: 10px; padding: 1rem; border: 2px solid #e2e8f0; }
    .compare-card.incoming { border-color: #6366f1; background: #eef2ff; }
    .compare-card.existing { border-color: #f59e0b; background: #fffbeb; }
    .compare-card h4 { margin: 0 0 0.75rem 0; font-size: 0.9rem; color: #475569; }
    .compare-row { display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.85rem; }
    .compare-row span { color: #94a3b8; }
    .duplicate-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .duplicate-actions button {
      padding: 0.6rem 1.25rem; border: none; border-radius: 8px;
      cursor: pointer; font-weight: 600; font-size: 0.9rem;
    }
    .btn-skip { background: #f1f5f9; color: #64748b; }
    .btn-skip:hover { background: #e2e8f0; }
    .btn-keep { background: #eef2ff; color: #6366f1; }
    .btn-keep:hover { background: #e0e7ff; }
    .btn-replace { background: #6366f1; color: white; }
    .btn-replace:hover { background: #4f46e5; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class FacturesComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);
  private sanitizer = inject(DomSanitizer);

  factures = signal<any[]>([]);
  error = signal('');
  spinnerMessage = signal('Chargement...');
  pdfUrl = signal<SafeResourceUrl | null>(null);
  pdfName = signal('');
  duplicateInfo = signal<any>(null);

  ngOnInit() { this.load(); }

  load() {
    this.spinnerMessage.set('Chargement des factures...');
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
      input.value = '';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      Array.from(event.dataTransfer.files).forEach(f => this.upload(f));
    }
  }

  upload(file: File) {
    this.error.set('');
    this.spinnerMessage.set('Extraction du texte et analyse par l\'IA...');
    this.spinner.show('factures');

    this.api.uploadFacture(file).subscribe({
      next: (res) => {
        this.spinner.hide('factures');
        if (res.needsConfirmation) {
          this.duplicateInfo.set(res);
        } else {
          this.load();
        }
      },
      error: (err) => {
        this.spinner.hide('factures');
        this.error.set(err.error?.error || 'Echec de l\'upload');
      }
    });
  }

  skipDuplicate() {
    const info = this.duplicateInfo();
    if (!info) return;
    this.api.cancelPending(info.pendingFacture.id).subscribe(() => {
      this.duplicateInfo.set(null);
    });
  }

  keepBoth() {
    const info = this.duplicateInfo();
    if (!info) return;
    this.spinnerMessage.set('Enregistrement de la facture...');
    this.spinner.show('factures');
    this.api.confirmFacture(info.pendingFacture.id).subscribe({
      next: () => { this.duplicateInfo.set(null); this.spinner.hide('factures'); this.load(); },
      error: () => this.spinner.hide('factures')
    });
  }

  replaceExisting() {
    const info = this.duplicateInfo();
    if (!info || !info.similarity.duplicateId) return;
    this.spinnerMessage.set('Remplacement de la facture...');
    this.spinner.show('factures');
    this.api.replaceFacture(info.pendingFacture.id, info.similarity.duplicateId).subscribe({
      next: () => { this.duplicateInfo.set(null); this.spinner.hide('factures'); this.load(); },
      error: () => this.spinner.hide('factures')
    });
  }

  viewPdf(id: string, fileName: string) {
    this.pdfName.set(fileName);
    const url = this.api.getFacturePdfUrl(id);
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  closePdf() {
    this.pdfUrl.set(null);
    this.pdfName.set('');
  }

  delete(id: string) {
    this.api.deleteFacture(id).subscribe(() => this.load());
  }
}
