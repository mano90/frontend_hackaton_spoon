import { Component, OnInit, AfterViewInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import Swal from 'sweetalert2';
import { ApiService } from '../../services/api.service';
import { LayoutService } from '../../services/layout.service';

declare const Vivus: any;

const TABS = [
  { key: '', label: 'Tous', icon: 'fa-layer-group' },
  { key: 'facture', label: 'Factures', icon: 'fa-file-invoice-dollar' },
  { key: 'devis', label: 'Devis', icon: 'fa-file-invoice' },
  { key: 'bon_commande', label: 'Bons de commande', icon: 'fa-box' },
  { key: 'bon_livraison', label: 'Bons de livraison', icon: 'fa-truck' },
  { key: 'bon_reception', label: 'Bons de reception', icon: 'fa-clipboard-check' },
  { key: 'email', label: 'Emails', icon: 'fa-envelope' },
];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule, NgxExtendedPdfViewerModule],
  templateUrl: './documents.html',
  styleUrl: './documents.scss'
})
export class DocumentsComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);
  private layout = inject(LayoutService);

  tabs = TABS;
  allDocuments = signal<any[]>([]);
  activeTab = signal('');
  error = signal('');
  spinnerMsg = signal('Chargement...');
  pdfUrl = signal<string | null>(null);
  pdfDocName = signal('');
  classifyInfo = signal<any>(null);
  duplicateInfo = signal<any>(null);
  pendingPdfUrl = signal<string | null>(null);

  page = signal(1);
  pageSize = 10;

  classifyTypes = [
    { key: 'facture', label: 'Facture', icon: 'fa-file-invoice-dollar' },
    { key: 'devis', label: 'Devis', icon: 'fa-file-invoice' },
    { key: 'bon_commande', label: 'Bon de commande', icon: 'fa-box' },
    { key: 'bon_livraison', label: 'Bon de livraison', icon: 'fa-truck' },
    { key: 'bon_reception', label: 'Bon de reception', icon: 'fa-clipboard-check' },
    { key: 'email', label: 'Email', icon: 'fa-envelope' },
  ];

  private iconMap: Record<string, string> = {
    devis: 'fa-file-invoice', bon_commande: 'fa-box', bon_livraison: 'fa-truck',
    bon_reception: 'fa-clipboard-check', facture: 'fa-file-invoice-dollar', email: 'fa-envelope',
  };
  private labelMap: Record<string, string> = {
    devis: 'Devis', bon_commande: 'BC', bon_livraison: 'BL',
    bon_reception: 'BR', facture: 'Facture', email: 'Email',
  };

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

  getIcon(type: string) { return this.iconMap[type] || 'fa-file'; }
  getLabel(type: string) { return this.labelMap[type] || type; }
  countByType(key: string) {
    if (!key) return this.allDocuments().length;
    return this.allDocuments().filter(d => (d.docType || d.type) === key).length;
  }
  setTab(key: string) {
    this.activeTab.set(key);
    this.page.set(1);
    // Trigger Vivus on the background SVG
    this.animateTabBg();
  }
  setPage(p: number) { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }

  private animateTabBg() {
    setTimeout(() => {
      try { new Vivus('svg-tab-bg', { type: 'delayed', duration: 100, animTimingFunction: Vivus.EASE_OUT }); } catch (_) {}
    }, 100);
  }

  ngOnInit() { this.load(); }

  ngAfterViewInit() {
    setTimeout(() => {
      try { new Vivus('svg-doc-upload', { type: 'delayed', duration: 100, animTimingFunction: Vivus.EASE_OUT }); } catch (_) {}
    }, 200);
  }

  load() {
    this.api.getDocuments().subscribe({ next: (docs) => this.allDocuments.set(docs) });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const pdfs = Array.from(input.files).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    input.value = '';
    if (!pdfs.length) return;
    if (pdfs.length === 1) this.upload(pdfs[0]);
    else this.uploadBatch(pdfs);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer?.files?.length) return;
    const pdfs = Array.from(event.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) return;
    if (pdfs.length === 1) this.upload(pdfs[0]);
    else this.uploadBatch(pdfs);
  }

  /** Plusieurs PDF : endpoint upload-batch (multer + agents + liaison scenarioId) */
  uploadBatch(files: File[]) {
    this.error.set('');
    this.spinnerMsg.set('Import multiple : extraction, classification et liaison des dossiers...');
    this.spinner.show('documents');
    this.api.uploadDocumentsBatch(files).subscribe({
      next: (res) => {
        this.spinner.hide('documents');
        const saved = (res.results as { outcome?: string }[])?.filter((r) => r.outcome === 'saved').length ?? 0;
        const dossiers = res.dossiers?.length ?? 0;
        const pending = (res.results as { outcome?: string }[])?.filter(
          (r) => r.outcome === 'pending_classification' || r.outcome === 'pending_duplicate'
        ).length ?? 0;
        Swal.fire({
          icon: 'success',
          title: 'Import terminé',
          html: `<p>${saved} document(s) enregistré(s).</p>${dossiers ? `<p>${dossiers} dossier(s) relié(s).</p>` : ''}${pending ? `<p>${pending} pièce(s) en attente de confirmation.</p>` : ''}`,
          timer: 4500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        this.load();
      },
      error: (err) => {
        this.spinner.hide('documents');
        const msg = err.error?.error || 'Import multiple échoué';
        this.error.set(msg);
        Swal.fire({ icon: 'error', title: 'Erreur', text: msg, toast: true, position: 'top-end', timer: 4000, showConfirmButton: false });
      },
    });
  }

  upload(file: File) {
    this.error.set('');
    this.spinnerMsg.set('Extraction du texte et classification IA...');
    this.spinner.show('documents');
    // No docType — let the backend auto-classify
    this.api.uploadDocument(file).subscribe({
      next: (res) => {
        this.spinner.hide('documents');
        if (res.needsClassification) {
          this.classifyInfo.set(res);
          const url = this.api.getPendingPdfUrl(res.pendingDocument.id);
          this.pendingPdfUrl.set(url);
        } else if (res.needsConfirmation) {
          this.duplicateInfo.set(res);
        } else {
          const label = this.labelMap[res.document?.docType] || res.document?.docType || 'Document';
          Swal.fire({ icon: 'success', title: 'Document ajoute', text: `${label} classifie et enregistre avec succes.`, timer: 2500, showConfirmButton: false, toast: true, position: 'top-end' });
          this.load();
        }
      },
      error: (err) => {
        this.spinner.hide('documents');
        const msg = err.error?.error || 'Upload failed';
        this.error.set(msg);
        Swal.fire({ icon: 'error', title: 'Erreur', text: msg, toast: true, position: 'top-end', timer: 4000, showConfirmButton: false });
      },
    });
  }

  // Classification confirmation
  confirmClassification(docType: string) {
    const info = this.classifyInfo();
    if (!info) return;
    this.spinnerMsg.set('Enregistrement...');
    this.spinner.show('documents');
    this.api.confirmDocument(info.pendingDocument.id, docType).subscribe({
      next: () => {
        this.classifyInfo.set(null); this.pendingPdfUrl.set(null); this.spinner.hide('documents');
        Swal.fire({ icon: 'success', title: 'Document classe', text: `Enregistre comme ${this.labelMap[docType] || docType}.`, timer: 2500, showConfirmButton: false, toast: true, position: 'top-end' });
        this.load();
      },
      error: () => this.spinner.hide('documents'),
    });
  }

  cancelClassification() {
    const info = this.classifyInfo();
    if (!info) return;
    this.api.cancelPending(info.pendingDocument.id).subscribe(() => { this.classifyInfo.set(null); this.pendingPdfUrl.set(null); });
  }

  // Duplicate confirmation
  keepBoth() {
    const info = this.duplicateInfo();
    if (!info) return;
    this.spinnerMsg.set('Enregistrement...');
    this.spinner.show('documents');
    this.api.confirmDocument(info.pendingDocument.id).subscribe({
      next: () => {
        this.duplicateInfo.set(null); this.spinner.hide('documents');
        Swal.fire({ icon: 'success', title: 'Les deux conserves', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        this.load();
      },
      error: () => this.spinner.hide('documents'),
    });
  }

  replaceDuplicate() {
    const info = this.duplicateInfo();
    if (!info?.similarity?.duplicateId) return;
    this.spinnerMsg.set('Remplacement...');
    this.spinner.show('documents');
    this.api.replaceDocument(info.pendingDocument.id, info.similarity.duplicateId).subscribe({
      next: () => {
        this.duplicateInfo.set(null); this.spinner.hide('documents');
        Swal.fire({ icon: 'success', title: 'Document remplace', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        this.load();
      },
      error: () => this.spinner.hide('documents'),
    });
  }

  cancelDuplicate() {
    const info = this.duplicateInfo();
    if (!info) return;
    this.api.cancelPending(info.pendingDocument.id).subscribe(() => this.duplicateInfo.set(null));
  }

  viewPdf(id: string) {
    this.layout.collapseSidebar();
    const doc = this.allDocuments().find(d => d.id === id);
    this.pdfDocName.set(doc?.reference || doc?.subject || doc?.fileName || 'Document');
    const url = this.api.getDocumentPdfUrl(id);
    this.pdfUrl.set(url);
  }
  closePdf() { this.pdfUrl.set(null); this.pdfDocName.set(''); }

  remove(id: string) {
    Swal.fire({
      title: 'Supprimer ce document ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Annuler',
      confirmButtonText: 'Supprimer',
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.deleteDocument(id).subscribe(() => {
          Swal.fire({ icon: 'success', title: 'Supprime', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
          this.load();
        });
      }
    });
  }
}
