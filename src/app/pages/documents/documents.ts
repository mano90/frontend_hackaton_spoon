import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';

const TYPE_LABELS: Record<string, { title: string; icon: string }> = {
  devis: { title: 'Demandes de Devis', icon: '📋' },
  bon_commande: { title: 'Bons de Commande', icon: '📦' },
  bon_livraison: { title: 'Bons de Livraison', icon: '🚚' },
  bon_reception: { title: 'Bons de Reception', icon: '✅' },
  email: { title: 'Emails', icon: '📧' },
};

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>{{ config().icon }} {{ config().title }}</h1>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              @if (docType() === 'email') {
                <th>Date</th><th>De</th><th>Objet</th><th>Relation</th><th>Actions</th>
              } @else {
                <th>Reference</th><th>Fournisseur</th><th>Date</th>
                @if (hasMontant()) { <th>Montant</th> }
                <th>Scenario</th><th>Actions</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (d of documents(); track d.id) {
              <tr>
                @if (docType() === 'email') {
                  <td>{{ d.date }}</td>
                  <td>{{ d.from }}</td>
                  <td>{{ d.subject }}</td>
                  <td>
                    @if (d.hasRelation) {
                      <span class="badge related">{{ d.relationType }} ({{ d.scenarioId }})</span>
                    } @else {
                      <span class="badge unrelated">Aucune</span>
                    }
                  </td>
                } @else {
                  <td>{{ d.reference }}</td>
                  <td>{{ d.fournisseur }}</td>
                  <td>{{ d.date }}</td>
                  @if (hasMontant()) { <td class="montant">{{ d.montant | number:'1.2-2' }} EUR</td> }
                  <td><span class="badge scenario" *ngIf="d.scenarioId">{{ d.scenarioId }}</span></td>
                }
                <td class="actions">
                  <button class="btn-view" (click)="viewPdf(d.id)"><i class="fas fa-file-pdf"></i></button>
                  <button class="btn-delete" (click)="remove(d.id)"><i class="fas fa-trash-alt"></i></button>
                </td>
              </tr>
            } @empty {
              <tr><td [attr.colspan]="docType() === 'email' ? 5 : (hasMontant() ? 6 : 5)" class="empty">Aucun document</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (pdfUrl()) {
      <div class="modal-overlay" (click)="closePdf()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">Document PDF</span>
            <button class="modal-close" (click)="closePdf()">✕</button>
          </div>
          <iframe [src]="pdfUrl()" class="pdf-frame"></iframe>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; color: #1e293b; }
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
    .badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
    .badge.related { background: #dcfce7; color: #16a34a; }
    .badge.unrelated { background: #f1f5f9; color: #94a3b8; }
    .badge.scenario { background: #eef2ff; color: #6366f1; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; border-radius: 12px; width: 90vw; height: 90vh; max-width: 900px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .modal-title { font-weight: 600; color: #1e293b; }
    .modal-close { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #64748b; width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
    .modal-close:hover { background: #f1f5f9; }
    .pdf-frame { flex: 1; border: none; width: 100%; }
  `]
})
export class DocumentsComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  docType = signal('devis');
  config = signal<{ title: string; icon: string }>({ title: '', icon: '' });
  documents = signal<any[]>([]);
  pdfUrl = signal<SafeResourceUrl | null>(null);

  hasMontant() { return ['devis', 'bon_commande'].includes(this.docType()); }

  ngOnInit() {
    this.route.data.subscribe((data: any) => {
      const type = data['docType'] || 'devis';
      this.docType.set(type);
      this.config.set(TYPE_LABELS[type] || { title: type, icon: '📄' });
      this.load();
    });
  }

  load() {
    this.api.getDocuments(this.docType()).subscribe({
      next: (docs) => this.documents.set(docs),
    });
  }

  viewPdf(id: string) {
    const url = this.api.getDocumentPdfUrl(this.docType(), id);
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  closePdf() { this.pdfUrl.set(null); }

  remove(id: string) {
    this.api.deleteDocument(this.docType(), id).subscribe(() => this.load());
  }
}
