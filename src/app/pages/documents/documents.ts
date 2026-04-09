import { Component, OnInit, AfterViewInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { ApiService } from '../../services/api.service';

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
  imports: [CommonModule, NgxSpinnerModule],
  templateUrl: './documents.html',
  styleUrl: './documents.scss'
})
export class DocumentsComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);
  private sanitizer = inject(DomSanitizer);

  tabs = TABS;
  allDocuments = signal<any[]>([]);
  activeTab = signal('');
  error = signal('');
  spinnerMsg = signal('Chargement...');
  pdfUrl = signal<SafeResourceUrl | null>(null);
  pdfDocName = signal('');
  classifyInfo = signal<any>(null);
  duplicateInfo = signal<any>(null);
  pendingPdfUrl = signal<SafeResourceUrl | null>(null);

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
    if (input.files) { Array.from(input.files).forEach(f => this.upload(f)); input.value = ''; }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) { Array.from(event.dataTransfer.files).forEach(f => this.upload(f)); }
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
          this.pendingPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
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
    const doc = this.allDocuments().find(d => d.id === id);
    this.pdfDocName.set(doc?.reference || doc?.subject || doc?.fileName || 'Document');
    const url = this.api.getDocumentPdfUrl(id);
    this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
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
