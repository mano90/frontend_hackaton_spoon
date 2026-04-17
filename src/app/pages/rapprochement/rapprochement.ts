import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed } from '@angular/core';
declare const Vivus: any;
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgxSpinnerModule } from 'ngx-spinner';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { RapprochementRunService } from '../../services/rapprochement-run.service';

@Component({
  selector: 'app-rapprochement',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  templateUrl: './rapprochement.html',
  styleUrl: './rapprochement.scss'
})
export class RapprochementComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  readonly run = inject(RapprochementRunService);

  rapprochements = signal<any[]>([]);
  mouvementsMap = signal<Record<string, any>>({});
  facturesMap = signal<Record<string, any>>({});
  error = signal('');

  drawerFacture = signal<any>(null);
  drawerOpen = signal(false);

  canGenerateRecapPdf = computed(() => this.rapprochements().some((r: any) => r?.confirmed === true));

  recapOpen = signal(false);
  recapLoading = signal(false);
  recapError = signal('');
  recapPdfSrc = signal<SafeResourceUrl | null>(null);
  private recapObjectUrl: string | null = null;
  private recapBlob: Blob | null = null;

  ngOnInit() { this.load(); }

  ngOnDestroy(): void {
    this.revokeRecapBlobUrl();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      try { new Vivus('svg-rapp-empty', { type: 'delayed', duration: 100, animTimingFunction: Vivus.EASE_OUT }); } catch (_) {}
    }, 200);
  }

  load() {
    forkJoin({
      rapprochements: this.api.getRapprochements(),
      mouvements: this.api.getMouvements(),
      documents: this.api.getDocuments(),
    }).subscribe({
      next: ({ rapprochements, mouvements, documents }) => {
        this.rapprochements.set(rapprochements);
        this.mouvementsMap.set(Object.fromEntries(mouvements.map((m: any) => [m.id, m])));
        const factures = documents.filter((d: any) => d.docType === 'facture' || d.type === 'facture');
        this.facturesMap.set(Object.fromEntries(factures.map((f: any) => [f.id, f])));
      },
    });
  }

  getMouvement(id: string): any {
    return this.mouvementsMap()[id] ?? null;
  }

  openFacturePdfInNewTab(factureId: string): void {
    this.api.openDocumentPdfInNewTab(factureId);
  }

  openDrawer(factureId: string) {
    const cached = this.facturesMap()[factureId];
    if (cached) {
      this.drawerFacture.set(cached);
      this.drawerOpen.set(true);
    } else {
      this.api.getDocument(factureId).subscribe({
        next: (doc) => { this.drawerFacture.set(doc); this.drawerOpen.set(true); },
      });
    }
  }

  /** Remplace les UUIDs bruts dans le texte IA par leur référence/libellé. */
  formatExplanation(text: string): string {
    if (!text) return text;
    const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    return text.replace(UUID_RE, (id) => {
      const fac = this.facturesMap()[id];
      if (fac) return fac.reference || fac.fournisseur || fac.fileName || id;
      const mv = this.mouvementsMap()[id];
      if (mv) return mv.libelle || mv.reference || id;
      return id;
    });
  }

  closeDrawer() {
    this.drawerOpen.set(false);
    setTimeout(() => this.drawerFacture.set(null), 300);
  }

  confirm(id: string) {
    this.api.confirmRapprochement(id).subscribe(() => this.load());
  }

  unconfirm(id: string) {
    this.api.unconfirmRapprochement(id).subscribe(() => this.load());
  }

  reject(id: string) {
    this.api.deleteRapprochement(id).subscribe(() => this.load());
  }

  /** Lance le rapprochement via le service singleton (survit aux navigations). */
  async runAll() {
    await this.run.runAll();
    // Recharger les résultats une fois terminé si on est encore sur la page
    if (!this.run.running()) this.load();
  }

  openRecapViewer() {
    if (!this.canGenerateRecapPdf()) return;
    this.recapOpen.set(true);
    this.recapLoading.set(true);
    this.recapError.set('');
    this.recapPdfSrc.set(null);
    this.revokeRecapBlobUrl();
    this.recapBlob = null;

    this.api.getRapprochementRecapPdfBlob().subscribe({
      next: (blob) => {
        this.recapBlob = blob;
        const url = URL.createObjectURL(blob);
        this.recapObjectUrl = url;
        this.recapPdfSrc.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.recapLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const finish = (message: string) => {
          this.recapError.set(message);
          this.recapLoading.set(false);
        };
        if (err.error instanceof Blob) {
          err.error.text().then((t) => {
            try {
              const j = JSON.parse(t) as { error?: string };
              finish(j.error || 'Impossible de generer le PDF');
            } catch {
              finish(t || 'Erreur lors du chargement du PDF');
            }
          }).catch(() => finish('Erreur lors du chargement du PDF'));
          return;
        }
        const msg = (err.error as { error?: string })?.error || err.message;
        finish(typeof msg === 'string' ? msg : 'Erreur lors du chargement du PDF');
      },
    });
  }

  closeRecapViewer() {
    this.recapOpen.set(false);
    this.recapLoading.set(false);
    this.recapError.set('');
    this.recapPdfSrc.set(null);
    this.revokeRecapBlobUrl();
    this.recapBlob = null;
  }

  downloadRecapFromViewer() {
    const blob = this.recapBlob;
    if (!blob) return;
    const name = `rapprochements-recap-${new Date().toISOString().slice(0, 10)}.pdf`;
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(u), 60_000);
  }

  private revokeRecapBlobUrl() {
    if (this.recapObjectUrl) {
      URL.revokeObjectURL(this.recapObjectUrl);
      this.recapObjectUrl = null;
    }
  }
}
