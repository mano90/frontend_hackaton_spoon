import { Component, AfterViewInit, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
declare const Vivus: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { switchMap, of, forkJoin, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  ApiService,
  type AIQuerySourceRef,
  type AIQueryHistoryTurn,
} from '../../services/api.service';
import { AuthTokenService } from '../../services/auth-token.service';

const CHAT_TL_TYPE_CFG: Record<string, { label: string; icon: string; color: string }> = {
  devis: { label: 'Devis', icon: 'fa-file-invoice', color: '#6366f1' },
  bon_commande: { label: 'Bon de commande', icon: 'fa-box', color: '#3b82f6' },
  bon_livraison: { label: 'Bon de livraison', icon: 'fa-truck', color: '#f59e0b' },
  bon_reception: { label: 'Bon de réception', icon: 'fa-clipboard-check', color: '#22c55e' },
  facture: { label: 'Facture', icon: 'fa-file-invoice-dollar', color: '#ef4444' },
  mouvement: { label: 'Paiement', icon: 'fa-university', color: '#8b5cf6' },
  email: { label: 'Email', icon: 'fa-envelope', color: '#64748b' },
};

const WANTS_TIMELINE_RE =
  /timeline|frise|chronolog|historique|chronologie|déroul|déroulement|ordre[^\n]{0,12}évén|vue[^\n]{0,8}temps|fil\s+des\s+évén/i;

@Component({
  selector: 'app-query',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxExtendedPdfViewerModule],
  templateUrl: './query.html',
  styleUrl: './query.scss',
})
export class QueryComponent implements AfterViewInit, OnInit {
  private api = inject(ApiService);
  readonly authToken = inject(AuthTokenService);
  private router = inject(Router);

  private readonly IA_SESSION_KEY = 'ia_assistant_session_id';

  queryText = '';
  loading = signal(false);
  sessionId = signal('');
  history = signal<AIQueryHistoryTurn[]>([]);
  /** Affichage : dernier échange en haut */
  displayedHistory = computed(() => [...this.history()].reverse());

  modalSource = signal<AIQuerySourceRef | null>(null);
  timelineEvents = signal<Record<string, unknown>[]>([]);
  modalTimelineLoading = signal(false);
  mouvementDetail = signal<Record<string, unknown> | null>(null);
  rapprochementDetail = signal<Record<string, unknown> | null>(null);
  documentDetail = signal<Record<string, unknown> | null>(null);
  documentDetailLoading = signal(false);
  showDocumentPdf = signal(false);

  ngOnInit() {
    let sid = localStorage.getItem(this.IA_SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(this.IA_SESSION_KEY, sid);
    }
    this.sessionId.set(sid);
    this.loadHistory();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      try {
        new Vivus('svg-query-brain', { type: 'delayed', duration: 120, animTimingFunction: Vivus.EASE_OUT });
      } catch (_) {}
    }, 200);
  }

  loadHistory() {
    const sid = this.sessionId();
    if (!sid) return;
    this.api
      .getQueryHistory(sid)
      .pipe(
        switchMap((r) => {
          const turns = r.turns || [];
          if (!turns.length) {
            return of(r);
          }
          return forkJoin(turns.map((t) => this.enrichTurnTimeline(t))).pipe(
            map((enriched) => ({ sessionId: r.sessionId, turns: enriched }))
          );
        })
      )
      .subscribe({
        next: (r) => {
          this.history.set(r.turns || []);
          if (r.sessionId) {
            this.sessionId.set(r.sessionId);
            localStorage.setItem(this.IA_SESSION_KEY, r.sessionId);
          }
        },
        error: () => {},
      });
  }

  /**
   * Réhydrate la frise après F5 : Redis peut ne pas stocker timelineEvents (volume)
   * ou le tour a été enrichi uniquement côté client.
   */
  private enrichTurnTimeline(t: AIQueryHistoryTurn): Observable<AIQueryHistoryTurn> {
    if (t.timelineEvents && t.timelineEvents.length > 0) {
      return of(t);
    }
    const src = t.sources?.find(
      (s) => s.kind === 'timeline_global' || s.kind === 'timeline_scenario'
    );
    if (src?.kind === 'timeline_global') {
      return this.api.getTimeline().pipe(
        map((events) => ({
          ...t,
          timelineEvents: events,
          timelineMeta: { scope: 'global' as const },
        })),
        catchError(() => of(t))
      );
    }
    if (src?.kind === 'timeline_scenario' && src.scenarioId) {
      return this.api.getScenarioTimeline(src.scenarioId).pipe(
        map((events) => ({
          ...t,
          timelineEvents: events,
          timelineMeta: {
            scope: 'scenario' as const,
            scenarioId: src.scenarioId,
            purchaseLabel: this.purchaseLabelFromEvents(events, src.scenarioId),
          },
        })),
        catchError(() => of(t))
      );
    }
    if (WANTS_TIMELINE_RE.test(t.question || '')) {
      return this.api.getTimeline().pipe(
        map((events) => ({
          ...t,
          timelineEvents: events,
          timelineMeta: { scope: 'global' as const },
        })),
        catchError(() => of(t))
      );
    }
    return of(t);
  }

  ask() {
    const q = this.queryText.trim();
    if (!q) return;

    this.loading.set(true);
    this.queryText = '';

    const sid = this.sessionId();
    this.api
      .query(q, sid)
      .pipe(
        switchMap((res) => {
          const hasTimeline = res.timelineEvents && res.timelineEvents.length > 0;
          if (!hasTimeline && WANTS_TIMELINE_RE.test(q)) {
            return this.api.getTimeline().pipe(
              map((events) => ({
                ...res,
                timelineEvents: events,
                timelineMeta: { scope: 'global' as const },
              }))
            );
          }
          return of(res);
        })
      )
      .subscribe({
      next: (res) => {
        this.sessionId.set(res.sessionId);
        localStorage.setItem(this.IA_SESSION_KEY, res.sessionId);
        this.history.update((h) => [
          ...h,
          {
            question: q,
            answer: res.answer,
            sources: res.sources || [],
            at: new Date().toISOString(),
            ...(res.timelineEvents?.length
              ? { timelineEvents: res.timelineEvents, timelineMeta: res.timelineMeta }
              : {}),
            ...(res.dossierBriefs?.length ? { dossierBriefs: res.dossierBriefs } : {}),
          },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.history.update((h) => [
          ...h,
          {
            question: q,
            answer: 'Erreur lors de la requête.',
            sources: [],
            at: new Date().toISOString(),
          },
        ]);
        this.loading.set(false);
      },
    });
  }

  resetAssistant() {
    const sid = this.sessionId();
    if (!sid) return;
    this.api.resetQuerySession(sid).subscribe({
      next: () => {
        this.history.set([]);
        this.closeModal();
      },
      error: () => {},
    });
  }

  trackTurn(_i: number, item: AIQueryHistoryTurn) {
    return `${item.at}-${item.question}`;
  }

  openSource(src: AIQuerySourceRef) {
    this.modalSource.set(src);
    this.timelineEvents.set([]);
    this.mouvementDetail.set(null);
    this.rapprochementDetail.set(null);
    this.documentDetail.set(null);
    this.showDocumentPdf.set(false);
    this.documentDetailLoading.set(false);

    if (src.kind === 'document') {
      this.documentDetailLoading.set(true);
      this.api.getDocuments().subscribe({
        next: (list) => {
          const d = list.find((x: { id?: string }) => x.id === src.id);
          this.documentDetail.set(d ?? { id: src.id });
          this.documentDetailLoading.set(false);
        },
        error: () => {
          this.documentDetail.set({ id: src.id });
          this.documentDetailLoading.set(false);
        },
      });
      return;
    }

    if (src.kind === 'timeline_global') {
      this.modalTimelineLoading.set(true);
      this.api.getTimeline().subscribe({
        next: (ev) => {
          this.timelineEvents.set(ev);
          this.modalTimelineLoading.set(false);
        },
        error: () => this.modalTimelineLoading.set(false),
      });
      return;
    }

    if (src.kind === 'timeline_scenario' && src.scenarioId) {
      this.modalTimelineLoading.set(true);
      this.api.getScenarioTimeline(src.scenarioId).subscribe({
        next: (ev) => {
          this.timelineEvents.set(ev);
          this.modalTimelineLoading.set(false);
        },
        error: () => this.modalTimelineLoading.set(false),
      });
      return;
    }

    if (src.kind === 'mouvement') {
      this.api.getMouvements().subscribe({
        next: (list) => {
          const m = list.find((x: { id?: string }) => x.id === src.id);
          this.mouvementDetail.set(m ?? { id: src.id, note: 'Détail non trouvé en cache.' });
        },
        error: () => this.mouvementDetail.set({ id: src.id }),
      });
      return;
    }

    if (src.kind === 'rapprochement') {
      this.api.getRapprochements().subscribe({
        next: (list) => {
          const r = list.find((x: { id?: string }) => x.id === src.id);
          this.rapprochementDetail.set(r ?? { id: src.id, note: 'Détail non trouvé en cache.' });
        },
        error: () => this.rapprochementDetail.set({ id: src.id }),
      });
    }
  }

  closeModal() {
    this.modalSource.set(null);
    this.timelineEvents.set([]);
    this.mouvementDetail.set(null);
    this.rapprochementDetail.set(null);
    this.documentDetail.set(null);
    this.showDocumentPdf.set(false);
    this.documentDetailLoading.set(false);
  }

  toggleDocumentPdf() {
    this.showDocumentPdf.update((v) => !v);
  }

  openDocumentInTimeline() {
    const src = this.modalSource();
    const doc = this.documentDetail();
    if (!src || src.kind !== 'document') return;
    const scenarioId =
      doc && doc['scenarioId'] != null && String(doc['scenarioId']).trim() !== ''
        ? String(doc['scenarioId'])
        : undefined;
    this.closeModal();
    void this.router.navigate(['/timeline'], {
      queryParams: {
        ...(scenarioId ? { scenario: scenarioId } : {}),
        focus: src.id,
      },
    });
  }

  pdfHref(id: string): string {
    return this.api.getDocumentPdfUrl(id);
  }

  openPdfInNewTab(id: string): void {
    this.api.openDocumentPdfInNewTab(id);
  }

  openTimelinePage(scenarioId?: string) {
    this.closeModal();
    if (scenarioId) {
      void this.router.navigate(['/timeline'], { queryParams: { scenario: scenarioId } });
    } else {
      void this.router.navigate(['/timeline']);
    }
  }

  /** Libellé métier (fournisseur) pour l’en-tête de frise, aligné backend */
  private purchaseLabelFromEvents(
    events: Record<string, unknown>[],
    scenarioId?: string
  ): string | undefined {
    const list = scenarioId
      ? events.filter((e) => String(e['scenarioId'] ?? '') === scenarioId)
      : events;
    const prefer = ['bon_commande', 'facture', 'devis', 'bon_livraison', 'bon_reception'];
    for (const typ of prefer) {
      const ev = list.find((e) => String(e['type'] ?? '') === typ && e['fournisseur']);
      if (ev && String(ev['fournisseur']).trim() !== '') return String(ev['fournisseur']).trim();
    }
    for (const ev of list) {
      const f = ev['fournisseur'];
      if (f != null && String(f).trim() !== '') return String(f).trim();
    }
    return undefined;
  }

  timelineCfg(type: string) {
    return CHAT_TL_TYPE_CFG[type] || { label: type, icon: 'fa-file', color: '#94a3b8' };
  }

  tlRow(ev: Record<string, unknown>) {
    return this.timelineCfg(String(ev['type'] ?? ''));
  }

  openTimelineEvent(ev: Record<string, unknown>) {
    const id = ev['id'];
    if (typeof id !== 'string' || !id) return;
    const type = String(ev['type'] ?? '');
    if (type === 'mouvement') {
      this.openSource({
        id,
        kind: 'mouvement',
        label: `${ev['date'] ?? ''} · ${ev['montant'] ?? ''} € · ${ev['reference'] ?? ev['libelle'] ?? ''}`,
      });
      return;
    }
    const ref = String(ev['reference'] ?? ev['subject'] ?? '');
    const four = String(ev['fournisseur'] ?? '');
    this.openSource({
      id,
      kind: 'document',
      label: [type, ref, four].filter(Boolean).join(' · ') || id,
      hasPdf: true,
    });
  }

  sourceIcon(kind: AIQuerySourceRef['kind']): string {
    switch (kind) {
      case 'document':
        return 'fa-file-pdf';
      case 'mouvement':
        return 'fa-building-columns';
      case 'rapprochement':
        return 'fa-link';
      case 'timeline_global':
      case 'timeline_scenario':
        return 'fa-calendar-days';
      default:
        return 'fa-circle-question';
    }
  }
}
