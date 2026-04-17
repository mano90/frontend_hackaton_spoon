import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import Swal from 'sweetalert2';
import { ApiService, type PendingListItem } from '../../services/api.service';
import { AuthTokenService } from '../../services/auth-token.service';
import { LayoutService } from '../../services/layout.service';
import { ImportSocketService, type DocumentsBatchProgressEvent } from '../../services/import-socket.service';
import { ImportUiBlockService } from '../../services/import-ui-block.service';
import { PendingAlertsService } from '../../services/pending-alerts.service';
import { EmailAnalyzerService, type ProcessedEmail } from '../../services/email-analyzer.service';

declare const Vivus: any;

/** Si true : progression simulée en local (sans Socket.io). Mettre à false pour la barre globale + événements serveur. */
export const BATCH_UPLOAD_CLIENT_DEMO = false;

/** Réponse `POST /documents/upload-batch` (identique à `ApiService.uploadDocumentsBatch`). */
type UploadBatchResponseBody = {
  success: boolean;
  fileCount: number;
  results: unknown[];
  dossiers?: { scenarioId: string; documentIds: string[] }[];
};

const TABS = [
  { key: '', label: 'Tous', icon: 'fa-layer-group' },
  { key: 'pending_duplicate', label: 'Doublons suspects', icon: 'fa-clone' },
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
export class DocumentsComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  readonly authToken = inject(AuthTokenService);
  private spinner = inject(NgxSpinnerService);
  private layout = inject(LayoutService);
  private importUiBlock = inject(ImportUiBlockService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private pendingAlerts = inject(PendingAlertsService);
  private emailAnalyzer = inject(EmailAnalyzerService);
  readonly importSocket = inject(ImportSocketService);
  /** IDs email dont l’analyse IA est en cours (signal pour le template du tiroir) */
  readonly emailAnalysisInFlight = signal<ReadonlySet<string>>(new Set());
  /** Exposé au template : true = progression simulée locale (test UI) */
  readonly batchUploadClientDemo = BATCH_UPLOAD_CLIENT_DEMO;

  tabs = TABS;
  allDocuments = signal<any[]>([]);
  activeTab = signal('');
  error = signal('');
  spinnerMsg = signal('Chargement...');
  pdfUrl = signal<string | null>(null);
  pdfDocName = signal('');
  detailDoc = signal<any>(null);
  detailOpen = signal(false);
  classifyInfo = signal<any>(null);
  duplicateInfo = signal<any>(null);
  pendingPdfUrl = signal<string | null>(null);

  /** Overlay plein écran pendant upload-batch */
  batchUploadOpen = signal(false);
  /** Progression affichée (démo locale et/ou futur merge serveur) */
  batchDemoProgress = signal<DocumentsBatchProgressEvent | null>(null);
  batchDemoLog = signal<string[]>([]);
  private batchDemoTimer: ReturnType<typeof setInterval> | null = null;

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

  filteredDocs = computed(() => {
    const tab = this.activeTab();
    if (tab === 'pending_duplicate') {
      /** Même source que la cloche (`PendingAlertsService`), mise à jour au chargement et par le polling global. */
      return this.pendingAlerts.duplicateItems();
    }
    if (!tab) return this.allDocuments();
    return this.allDocuments().filter((d) => (d.docType || d.type) === tab);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredDocs().length / this.pageSize)));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredDocs().slice(start, start + this.pageSize);
  });
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  /** Journal sous l’overlay : démo locale ou Socket.io */
  batchOverlayLogLines = computed(() =>
    this.batchUploadClientDemo ? this.batchDemoLog() : this.importSocket.documentsBatchLog()
  );

  getIcon(type: string) { return this.iconMap[type] || 'fa-file'; }
  getLabel(type: string) { return this.labelMap[type] || type; }

  /** Tags IA → `data-type` des .type-badge (devis / facture / …) */
  aiTagToBadgeType(tag: string): string {
    const t = (tag || '').toLowerCase().replace(/\s+/g, '_');
    const map: Record<string, string> = {
      invoice: 'facture',
      payment_reminder: 'facture',
      quote: 'devis',
      kyc: 'bon_reception',
      general_inquiry: 'email',
      none: 'email',
    };
    return map[t] ?? 'email';
  }

  aiTagLabel(tag: string): string {
    return String(tag || '').replace(/_/g, ' ');
  }

  /** Attribut `data-urgency` pour les pastilles (high | medium | low) */
  urgencyAttr(urgency: string | undefined): string {
    return String(urgency || '').toLowerCase().trim();
  }

  /** Attribut `data-sentiment` pour les pastilles (positive | neutral | negative) */
  sentimentAttr(sentiment: string | undefined): string {
    const v = String(sentiment || '').toLowerCase().trim();
    if (v === 'positive') return 'positive';
    if (v === 'negative') return 'negative';
    if (v === 'neutral') return 'neutral';
    return 'unknown';
  }

  /** Variante visuelle des pastilles risque (neutre / vigilance / critique) */
  riskBadgeKind(rf: string): 'none' | 'warn' | 'alert' {
    const s = String(rf || '').toLowerCase().trim();
    if (s === 'none') return 'none';
    if (/(phishing|suspicious|fraud|critical|overdue)/.test(s)) return 'alert';
    return 'warn';
  }

  isEmailAiPending(docId: string): boolean {
    return this.emailAnalysisInFlight().has(docId);
  }

  private emailContentForAnalysis(doc: any): string {
    const parts = [doc.subject, doc.body, doc.rawText].filter(
      (x) => x != null && String(x).trim() !== ''
    );
    return parts.join('\n\n').trim();
  }

  private applyEmailAnalysisToDoc(doc: any, r: ProcessedEmail): any {
    return {
      ...doc,
      aiTags: r.type ?? [],
      sentiment: r.sentiment,
      urgency: r.urgency,
      entities: r.entities,
      riskFlags: r.risk_flags ?? [],
      actionRequired: r.action_required ?? [],
    };
  }

  private mergeDocIntoState(merged: any): void {
    this.allDocuments.update((list) => list.map((d) => (d.id === merged.id ? merged : d)));
    const open = this.detailDoc();
    if (open?.id === merged.id) {
      this.detailDoc.set(merged);
    }
  }

  private setEmailAnalysisFlight(docId: string, pending: boolean): void {
    this.emailAnalysisInFlight.update((prev) => {
      const next = new Set(prev);
      if (pending) next.add(docId);
      else next.delete(docId);
      return next;
    });
  }

  /** Analyse IA automatique pour les emails sans tags encore */
  analyzeEmailIfNeeded(doc: any): void {
    const type = doc.docType || doc.type;
    if (type !== 'email') return;
    if (doc.aiTags?.length) return;
    const content = this.emailContentForAnalysis(doc);
    if (!content) return;
    if (this.emailAnalysisInFlight().has(doc.id)) return;

    this.setEmailAnalysisFlight(doc.id, true);
    const threadId = doc.thread?.id ?? doc.threadId;
    this.emailAnalyzer.analyze(doc.id, content, threadId).subscribe({
      next: (r) => {
        this.setEmailAnalysisFlight(doc.id, false);
        const latest = this.allDocuments().find((d) => d.id === doc.id) ?? doc;
        this.mergeDocIntoState(this.applyEmailAnalysisToDoc(latest, r));
      },
      error: () => {
        this.setEmailAnalysisFlight(doc.id, false);
      },
    });
  }

  private runEmailAnalysisForLoadedEmails(docs: any[]): void {
    for (const d of docs) {
      this.analyzeEmailIfNeeded(d);
    }
  }

  /** Infobulle du bouton % correspondance (comme la modale après glisser-déposer). */
  dupMatchTooltip(d: PendingListItem): string {
    const s = d.similarity;
    if (s?.confidence == null) return '';
    const pct = Math.round(s.confidence);
    const why = (s.reason && String(s.reason).trim()) || 'Doublon probable';
    return `Confiance : ${pct} % — ${why}. Cliquer pour remplacer ou garder les deux.`;
  }
  countByType(key: string) {
    if (!key) return this.allDocuments().length;
    if (key === 'pending_duplicate') {
      return this.pendingAlerts.duplicateCount();
    }
    return this.allDocuments().filter((d) => (d.docType || d.type) === key).length;
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

  constructor() {
    effect((onCleanup) => {
      if (!this.batchUploadOpen()) return;
      this.importUiBlock.acquire();
      onCleanup(() => this.importUiBlock.release());
    });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((q) => {
      const tab = q.get('tab');
      if (tab === 'pending_duplicate') {
        this.activeTab.set('pending_duplicate');
        this.page.set(1);
      }
      this.applyFocusDuplicateFromRoute();
    });
    this.load();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      try { new Vivus('svg-doc-upload', { type: 'delayed', duration: 100, animTimingFunction: Vivus.EASE_OUT }); } catch (_) {}
    }, 200);
  }

  ngOnDestroy() {
    this.stopBatchUploadDemo();
  }

  clearing = signal(false);
  seeding = signal(false);

  clearAll() {
    Swal.fire({
      icon: 'warning',
      title: 'Vider toutes les données ?',
      text: 'Documents, mouvements, rapprochements et sessions IA seront supprimés définitivement.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Annuler',
      confirmButtonText: 'Vider',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.clearing.set(true);
      this.api.clearAllData().subscribe({
        next: (res) => {
          this.clearing.set(false);
          this.allDocuments.set([]);
          this.pendingAlerts.refreshFromItems([]);
          Swal.fire({ icon: 'success', title: 'Données vidées', text: `${res.deleted} entrées supprimées.`, timer: 2500, showConfirmButton: false, toast: true, position: 'top-end' });
        },
        error: () => {
          this.clearing.set(false);
          Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de vider les données.', timer: 3000, showConfirmButton: false, toast: true, position: 'top-end' });
        },
      });
    });
  }

  reloadSeeds() {
    this.seeding.set(true);
    this.api.reloadSeeds().subscribe({
      next: () => {
        this.load();
        this.seeding.set(false);
        Swal.fire({ icon: 'success', title: 'Seeds rechargés', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
      },
      error: () => {
        this.seeding.set(false);
        Swal.fire({ icon: 'error', title: 'Erreur seed', text: 'Le rechargement a échoué.', timer: 3000, showConfirmButton: false, toast: true, position: 'top-end' });
      },
    });
  }

  load() {
    this.api.getDocuments().subscribe({
      next: (docs) => {
        this.allDocuments.set(docs);
        this.runEmailAnalysisForLoadedEmails(docs);
      },
    });
    this.api.getPendingList().subscribe({
      next: (res) => {
        this.pendingAlerts.refreshFromItems(res.items);
        this.applyFocusDuplicateFromRoute();
      },
      error: () => this.pendingAlerts.refreshFromItems([]),
    });
  }

  private applyFocusDuplicateFromRoute() {
    const pendingId = this.route.snapshot.queryParamMap.get('focusDuplicate');
    if (!pendingId) return;
    const row = this.pendingAlerts.duplicateItems().find((i) => i.id === pendingId);
    if (!row) return;
    this.openDuplicateFromPending(row);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focusDuplicate: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Onglet Doublons suspects ou cloche : ouvrir la même modale que après upload. */
  openDuplicateFromPending(row: PendingListItem) {
    const sim = row.similarity;
    if (!sim?.duplicateId) return;
    const existing = this.allDocuments().find((d) => d.id === sim.duplicateId);
    const pd = row.pendingDocument;
    const pendingDocument = {
      ...(pd ?? {}),
      id: row.id,
      fileName: row.fileName ?? (pd?.['fileName'] as string | undefined),
      reference: row.reference ?? (pd?.['reference'] as string | undefined),
      montant: row.montant ?? (pd?.['montant'] as number | undefined),
    };
    this.duplicateInfo.set({
      needsConfirmation: true,
      pendingDocument,
      similarity: {
        duplicateId: sim.duplicateId,
        confidence: sim.confidence,
        reason: sim.reason,
        existingDocument:
          existing ??
          (sim.existingFileName
            ? {
                fileName: sim.existingFileName,
                reference: '—',
                montant: null,
              }
            : null),
      },
    });
  }

  viewPendingPdf(id: string) {
    this.layout.collapseSidebar();
    const row = this.pendingAlerts.allPendingItems().find((x) => x.id === id);
    this.pdfDocName.set(row?.fileName || row?.reference || 'Document');
    this.pdfUrl.set(this.api.getPendingPdfUrl(id));
  }

  onUploadZoneClick(fileInput: HTMLInputElement) {
    if (this.batchUploadOpen()) return;
    fileInput.click();
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
    if (this.batchUploadOpen()) return;
    if (!event.dataTransfer?.files?.length) return;
    const pdfs = Array.from(event.dataTransfer.files).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) return;
    if (pdfs.length === 1) this.upload(pdfs[0]);
    else this.uploadBatch(pdfs);
  }

  /** Plusieurs PDF : endpoint upload-batch + overlay (démo locale de progression pour tests UI) */
  async uploadBatch(files: File[]) {
    this.error.set('');
    this.importSocket.clearDocumentsBatch();
    if (!BATCH_UPLOAD_CLIENT_DEMO) {
      try {
        await this.importSocket.ensureSocket();
      } catch {
        Swal.fire({
          icon: 'warning',
          title: 'Progression',
          text: 'Socket.io non connecté — l’import part, mais la barre de progression ne recevra pas les événements. Vérifiez le backend (port 3000).',
          toast: true,
          position: 'top-end',
          timer: 5000,
          showConfirmButton: false,
        });
      }
    }

    this.batchUploadOpen.set(true);
    if (BATCH_UPLOAD_CLIENT_DEMO) {
      this.startBatchUploadDemo(files);
    }

    this.api.uploadDocumentsBatch(files).subscribe({
      next: (res) => {
        this.stopBatchUploadDemo();
        if (BATCH_UPLOAD_CLIENT_DEMO) {
          this.batchDemoProgress.set({
            phase: 'done',
            message: 'Import serveur terminé',
            percent: 100,
            total: files.length,
            index: files.length,
          });
          setTimeout(() => {
            this.finishBatchOverlay();
            this.showBatchSuccessToast(res);
            this.load();
          }, 650);
        } else {
          this.batchUploadOpen.set(false);
          this.importSocket.clearDocumentsBatch();
          this.showBatchSuccessToast(res);
          this.load();
        }
      },
      error: (err) => {
        this.stopBatchUploadDemo();
        this.finishBatchOverlay();
        this.importSocket.clearDocumentsBatch();
        const msg = err.error?.error || 'Import multiple échoué';
        this.error.set(msg);
        if (BATCH_UPLOAD_CLIENT_DEMO) {
          this.batchDemoProgress.set({ phase: 'error', message: msg, percent: 0 });
        }
        Swal.fire({ icon: 'error', title: 'Erreur', text: msg, toast: true, position: 'top-end', timer: 4000, showConfirmButton: false });
      },
    });
  }

  private showBatchSuccessToast(res: UploadBatchResponseBody) {
    const rows = (res.results ?? []) as { outcome?: string }[];
    const saved = rows.filter((r) => r.outcome === 'saved').length;
    const dossiers = res.dossiers?.length ?? 0;
    const pending = rows.filter(
      (r) => r.outcome === 'pending_classification' || r.outcome === 'pending_duplicate'
    ).length;
    Swal.fire({
      icon: 'success',
      title: 'Import terminé',
      html: `<p>${saved} document(s) enregistré(s).</p>${dossiers ? `<p>${dossiers} dossier(s) relié(s).</p>` : ''}${pending ? `<p>${pending} pièce(s) en attente de confirmation.</p>` : ''}`,
      timer: 4500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
  }

  private finishBatchOverlay() {
    this.batchUploadOpen.set(false);
    this.batchDemoProgress.set(null);
    this.batchDemoLog.set([]);
  }

  /** Simulation locale : barre + lignes de journal tant que l’HTTP n’a pas répondu */
  private startBatchUploadDemo(files: File[]) {
    this.stopBatchUploadDemo();
    const n = files.length;
    const maxSteps = Math.max(n * 3, 8);
    let step = 0;
    this.batchDemoLog.set([]);
    const demoStepCount = 6;
    this.batchDemoProgress.set({
      phase: 'started',
      message: `Aperçu local (test) — envoi de ${n} fichier(s) au serveur…`,
      percent: 4,
      total: n,
      index: 0,
      step: 1,
      stepCount: demoStepCount,
    });

    this.batchDemoTimer = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / maxSteps);
      const pct = Math.min(88, 6 + Math.floor(t * 82));
      const fileIndex = Math.min(n, Math.max(1, Math.ceil(t * n)));
      const name = files[fileIndex - 1]?.name ?? '…';
      const phase: DocumentsBatchProgressEvent['phase'] =
        t < 0.75 ? 'processing' : t < 0.92 ? 'linking' : 'processing';
      const subStep =
        t < 0.92
          ? Math.min(demoStepCount, Math.max(1, Math.ceil(t * demoStepCount)))
          : demoStepCount;
      this.batchDemoProgress.set({
        phase,
        message:
          t < 0.92
            ? `Réception / traitement simulé — fichier ${fileIndex}/${n} — ${name}`
            : 'Liaison dossiers (simulation)…',
        percent: pct,
        index: fileIndex,
        total: n,
        fileName: name,
        step: subStep,
        stepCount: demoStepCount,
      });
      if (step % 2 === 0) {
        this.batchDemoLog.update((log) => [...log, `[test UI] ${fileIndex}/${n} ${name}`].slice(-60));
      }
    }, 420);
  }

  private stopBatchUploadDemo() {
    if (this.batchDemoTimer != null) {
      clearInterval(this.batchDemoTimer);
      this.batchDemoTimer = null;
    }
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
      next: (res: any) => {
        this.spinner.hide('documents');
        if (res?.needsConfirmation) {
          this.classifyInfo.set(null);
          this.pendingPdfUrl.set(null);
          this.duplicateInfo.set(res);
          return;
        }
        this.classifyInfo.set(null); this.pendingPdfUrl.set(null);
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

  openDetail(doc: any) {
    const latest = this.allDocuments().find((x) => x.id === doc.id) ?? doc;
    this.detailDoc.set(latest);
    this.detailOpen.set(true);
  }
  closeDetail() { this.detailOpen.set(false); }

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
