import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

const TABS = [
  { key: '', label: 'Tous', icon: 'fa-layer-group' },
  { key: 'devis', label: 'Devis', icon: 'fa-file-invoice' },
  { key: 'bon_commande', label: 'Bons de commande', icon: 'fa-box' },
  { key: 'bon_livraison', label: 'Bons de livraison', icon: 'fa-truck' },
  { key: 'bon_reception', label: 'Bons de reception', icon: 'fa-clipboard-check' },
  { key: 'email', label: 'Emails', icon: 'fa-envelope' },
];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  template: `
    <ngx-spinner name="documents" type="ball-scale-multiple" size="medium" color="#6366f1"
      [fullScreen]="true" bdColor="rgba(15,23,42,0.75)">
      <p style="color:white;font-weight:500;margin-top:1rem">{{ spinnerMsg() }}</p>
    </ngx-spinner>

    <div class="page">
      <h1><i class="fas fa-folder-open"></i> Documents</h1>

      <!-- Upload zone -->
      <div class="upload-row">
        <div class="upload-zone" (drop)="onDrop($event)" (dragover)="$event.preventDefault()" (click)="fileInput.click()">
          <input #fileInput type="file" accept=".pdf" (change)="onFileSelect($event)" hidden multiple>
          <i class="fas fa-cloud-upload-alt upload-icon"></i>
          <p>Glissez vos documents PDF ici ou cliquez</p>
        </div>
        <div class="upload-type">
          <label><i class="fas fa-tag"></i> Type du document</label>
          <select #docTypeSelect>
            <option value="devis">Devis</option>
            <option value="bon_commande">Bon de commande</option>
            <option value="bon_livraison">Bon de livraison</option>
            <option value="bon_reception">Bon de reception</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      @if (error()) { <div class="error-msg"><i class="fas fa-exclamation-circle"></i> {{ error() }}</div> }

      <!-- Filter tabs -->
      <div class="tabs">
        @for (tab of tabs; track tab.key) {
          <button class="tab" [class.active]="activeTab() === tab.key" (click)="setTab(tab.key)">
            <i class="fas {{ tab.icon }}"></i> {{ tab.label }}
            <span class="tab-count">{{ countByType(tab.key) }}</span>
          </button>
        }
      </div>

      <!-- Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Reference / Objet</th>
              <th>Fournisseur / De</th>
              <th>Date</th>
              <th>Montant</th>
              <th>Scenario</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (d of paged(); track d.id) {
              <tr>
                <td><span class="type-badge" [attr.data-type]="d.docType || d.type">
                  <i class="fas {{ getIcon(d.docType || d.type) }}"></i> {{ getLabel(d.docType || d.type) }}
                </span></td>
                <td>{{ d.reference || d.subject || d.fileName }}</td>
                <td>{{ d.fournisseur || d.from || '-' }}</td>
                <td>{{ d.date }}</td>
                <td class="montant">{{ d.montant ? (d.montant | number:'1.2-2') + ' EUR' : '-' }}</td>
                <td>
                  @if (d.scenarioId) { <span class="badge-scenario">{{ d.scenarioId }}</span> }
                  @if (d.hasRelation === false) { <span class="badge-no-rel">Aucune relation</span> }
                  @if (d.hasRelation === true) { <span class="badge-rel">{{ d.relationType }}</span> }
                </td>
                <td class="actions">
                  <button class="btn-view" (click)="viewPdf(d.id)" title="Voir PDF"><i class="fas fa-file-pdf"></i></button>
                  <button class="btn-delete" (click)="remove(d.id)" title="Supprimer"><i class="fas fa-trash-alt"></i></button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty"><i class="fas fa-inbox"></i> Aucun document</td></tr>
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
          <span class="page-info">{{ filtered().length }} elements</span>
        </div>
      }
    </div>

    @if (pdfUrl()) {
      <div class="modal-overlay" (click)="closePdf()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title"><i class="fas fa-file-pdf"></i> Document PDF</span>
            <button class="modal-close" (click)="closePdf()"><i class="fas fa-times"></i></button>
          </div>
          <iframe [src]="pdfUrl()" class="pdf-frame"></iframe>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1300px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; color: #1e293b; }
    h1 i { margin-right: 0.5rem; color: #6366f1; }

    .upload-row { display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: stretch; }
    .upload-zone {
      flex: 1; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 1.5rem; text-align: center;
      cursor: pointer; transition: all 0.2s; background: #f8fafc;
    }
    .upload-zone:hover { border-color: #6366f1; background: #eef2ff; }
    .upload-icon { font-size: 2rem; color: #94a3b8; margin-bottom: 0.5rem; }
    .upload-zone p { margin: 0; color: #64748b; font-size: 0.9rem; }
    .upload-type {
      width: 220px; background: white; border-radius: 12px; padding: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; justify-content: center; gap: 0.5rem;
    }
    .upload-type label { font-size: 0.8rem; font-weight: 600; color: #64748b; }
    .upload-type label i { margin-right: 0.3rem; }
    .upload-type select { padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; }
    .error-msg { background: #fef2f2; color: #dc2626; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }

    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .tab {
      padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: white;
      cursor: pointer; font-size: 0.85rem; color: #64748b; transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem;
    }
    .tab:hover { border-color: #6366f1; color: #6366f1; }
    .tab.active { background: #6366f1; color: white; border-color: #6366f1; }
    .tab-count { background: rgba(0,0,0,0.1); padding: 0.1rem 0.4rem; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
    .tab.active .tab-count { background: rgba(255,255,255,0.25); }

    .table-container { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #475569; font-size: 0.85rem; }
    td { padding: 0.6rem 1rem; border-top: 1px solid #f1f5f9; font-size: 0.9rem; }
    .montant { font-weight: 600; color: #6366f1; }
    .empty { text-align: center; color: #94a3b8; padding: 2rem !important; }

    .pagination { display: flex; align-items: center; gap: 0.3rem; margin-top: 1rem; justify-content: center; }
    .pagination button { padding: 0.4rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-size: 0.85rem; color: #475569; transition: all 0.15s; }
    .pagination button:hover:not(:disabled) { border-color: #6366f1; color: #6366f1; }
    .pagination button.active { background: #6366f1; color: white; border-color: #6366f1; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { margin-left: 0.75rem; font-size: 0.8rem; color: #94a3b8; }
    .actions { display: flex; gap: 0.4rem; }
    .btn-view { background: #eef2ff; color: #6366f1; border: none; padding: 0.4rem 0.65rem; border-radius: 6px; cursor: pointer; }
    .btn-view:hover { background: #e0e7ff; }
    .btn-delete { background: #fee2e2; color: #dc2626; border: none; padding: 0.4rem 0.65rem; border-radius: 6px; cursor: pointer; }
    .btn-delete:hover { background: #fecaca; }

    .type-badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
    .type-badge[data-type="devis"] { background: #eef2ff; color: #6366f1; }
    .type-badge[data-type="bon_commande"] { background: #dbeafe; color: #3b82f6; }
    .type-badge[data-type="bon_livraison"] { background: #fef3c7; color: #d97706; }
    .type-badge[data-type="bon_reception"] { background: #dcfce7; color: #16a34a; }
    .type-badge[data-type="email"] { background: #f1f5f9; color: #64748b; }
    .type-badge i { margin-right: 0.25rem; }

    .badge-scenario { background: #eef2ff; color: #6366f1; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-rel { background: #dcfce7; color: #16a34a; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; }
    .badge-no-rel { background: #f1f5f9; color: #94a3b8; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; border-radius: 12px; width: 90vw; height: 90vh; max-width: 900px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .modal-title { font-weight: 600; color: #1e293b; }
    .modal-title i { margin-right: 0.4rem; color: #ef4444; }
    .modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b; width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .modal-close:hover { background: #f1f5f9; }
    .pdf-frame { flex: 1; border: none; width: 100%; }
  `]
})
export class DocumentsComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);
  private sanitizer = inject(DomSanitizer);

  tabs = TABS;
  allDocuments = signal<any[]>([]);
  activeTab = signal('');
  error = signal('');
  spinnerMsg = signal('Chargement...');
  pdfUrl = signal<SafeResourceUrl | null>(null);

  page = signal(1);
  pageSize = 10;

  filtered = computed(() => {
    const tab = this.activeTab();
    if (!tab) return this.allDocuments();
    return this.allDocuments().filter(d => (d.docType || d.type) === tab);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  setPage(p: number) { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }

  private iconMap: Record<string, string> = {
    devis: 'fa-file-invoice', bon_commande: 'fa-box', bon_livraison: 'fa-truck',
    bon_reception: 'fa-clipboard-check', email: 'fa-envelope',
  };
  private labelMap: Record<string, string> = {
    devis: 'Devis', bon_commande: 'BC', bon_livraison: 'BL',
    bon_reception: 'BR', email: 'Email',
  };

  getIcon(type: string) { return this.iconMap[type] || 'fa-file'; }
  getLabel(type: string) { return this.labelMap[type] || type; }

  countByType(key: string) {
    if (!key) return this.allDocuments().length;
    return this.allDocuments().filter(d => (d.docType || d.type) === key).length;
  }

  ngOnInit() { this.load(); }

  load() {
    this.api.getDocuments().subscribe({
      next: (docs) => this.allDocuments.set(docs),
    });
  }

  setTab(key: string) { this.activeTab.set(key); this.page.set(1); }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const select = document.querySelector('.upload-type select') as HTMLSelectElement;
    const docType = select?.value || 'devis';
    if (input.files) {
      Array.from(input.files).forEach(f => this.upload(f, docType));
      input.value = '';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const select = document.querySelector('.upload-type select') as HTMLSelectElement;
    const docType = select?.value || 'devis';
    if (event.dataTransfer?.files) {
      Array.from(event.dataTransfer.files).forEach(f => this.upload(f, docType));
    }
  }

  upload(file: File, docType: string) {
    this.error.set('');
    this.spinnerMsg.set('Extraction et analyse IA en cours...');
    this.spinner.show('documents');
    this.api.uploadDocument(file, docType).subscribe({
      next: () => { this.spinner.hide('documents'); this.load(); },
      error: (err) => { this.spinner.hide('documents'); this.error.set(err.error?.error || 'Upload failed'); },
    });
  }

  viewPdf(id: string) {
    const url = this.api.getDocumentPdfUrl(id);
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  closePdf() { this.pdfUrl.set(null); }

  remove(id: string) {
    this.api.deleteDocument(id).subscribe(() => this.load());
  }
}
