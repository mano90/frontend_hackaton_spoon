import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { ApiService } from '../../services/api.service';
import { AuthTokenService } from '../../services/auth-token.service';

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  devis: { label: 'Devis', icon: 'fa-file-invoice', color: '#6366f1', bg: '#eef2ff' },
  bon_commande: { label: 'Bon de commande', icon: 'fa-box', color: '#3b82f6', bg: '#dbeafe' },
  bon_livraison: { label: 'Bon de livraison', icon: 'fa-truck', color: '#f59e0b', bg: '#fef3c7' },
  bon_reception: { label: 'Bon de reception', icon: 'fa-clipboard-check', color: '#22c55e', bg: '#dcfce7' },
  facture: { label: 'Facture', icon: 'fa-file-invoice-dollar', color: '#ef4444', bg: '#fee2e2' },
  mouvement: { label: 'Paiement', icon: 'fa-university', color: '#8b5cf6', bg: '#f3e8ff' },
  email: { label: 'Email', icon: 'fa-envelope', color: '#64748b', bg: '#f1f5f9' },
};

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxExtendedPdfViewerModule],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss'
})
export class TimelineComponent implements OnInit {
  private api = inject(ApiService);
  readonly authToken = inject(AuthTokenService);
  private route = inject(ActivatedRoute);

  allEvents = signal<any[]>([]);
  selectedScenario = '';
  selectedType = '';
  /** ID document / événement à mettre en avant après navigation depuis l’assistant */
  highlightedEventId = signal<string>('');

  /** Détail ouvert dans la page Timeline (sans quitter le composant) */
  detailEvent = signal<any | null>(null);
  /** Panneau détail en plein écran */
  detailMaximized = signal(false);
  /** Frise horizontale plus haute (vue élargie) */
  timelineExpanded = signal(false);
  /** PDF affiché dans le panneau de détail (pas nouvel onglet) */
  showPdfInline = signal(false);

  /** Libellés métier (fournisseur), pas S01 / S02 */
  scenarioOptions = computed(() => {
    const events = this.allEvents();
    const ids = new Set<string>();
    for (const e of events) {
      if (e.scenarioId) ids.add(e.scenarioId);
    }
    const labelById = new Map<string, string>();
    const preferTypes = ['bon_commande', 'facture', 'devis', 'bon_livraison', 'bon_reception'];
    for (const sid of ids) {
      for (const typ of preferTypes) {
        const ev = events.find(
          (x) => x.scenarioId === sid && x.type === typ && x.fournisseur
        );
        if (ev?.fournisseur) {
          labelById.set(sid, ev.fournisseur);
          break;
        }
      }
    }
    for (const sid of ids) {
      if (labelById.has(sid)) continue;
      const ev = events.find((x) => x.scenarioId === sid && x.fournisseur);
      if (ev?.fournisseur) labelById.set(sid, ev.fournisseur);
    }
    return Array.from(ids)
      .sort()
      .map((id) => ({
        id,
        label: labelById.get(id) ? `${labelById.get(id)}` : id,
      }));
  });

  filteredEvents = computed(() => {
    let events = this.allEvents();
    if (this.selectedType) events = events.filter(e => e.type === this.selectedType);
    return events;
  });

  cfg(type: string) {
    return TYPE_CONFIG[type] || { label: type, icon: 'fa-file', color: '#94a3b8', bg: '#f1f5f9' };
  }

  ngOnInit() {
    const pm = this.route.snapshot.queryParamMap;
    const q = pm.get('scenario');
    if (q) this.selectedScenario = q;
    const focus = pm.get('focus');
    this.load(focus || undefined);
  }

  load(focusId?: string) {
    const obs = this.selectedScenario
      ? this.api.getScenarioTimeline(this.selectedScenario)
      : this.api.getTimeline();
    obs.subscribe({
      next: (data) => {
        this.allEvents.set(data);
        if (focusId) {
          this.highlightedEventId.set(focusId);
          setTimeout(() => {
            document.getElementById('tl-focus-' + focusId)?.scrollIntoView({
              behavior: 'smooth',
              inline: 'center',
              block: 'nearest',
            });
          }, 250);
        } else {
          this.highlightedEventId.set('');
        }
      },
    });
  }

  applyFilters() { this.allEvents.set([...this.allEvents()]); }

  isDocumentLike(ev: { type?: string } | null): boolean {
    return Boolean(ev && ev.type && ev.type !== 'mouvement');
  }

  openDetail(ev: any, e?: Event) {
    e?.stopPropagation();
    e?.preventDefault();
    this.detailEvent.set(ev);
    this.detailMaximized.set(false);
    this.showPdfInline.set(false);
  }

  openDetailMaximized(ev: any, e?: Event) {
    e?.stopPropagation();
    e?.preventDefault();
    this.detailEvent.set(ev);
    this.detailMaximized.set(true);
    this.showPdfInline.set(false);
  }

  closeDetail() {
    this.detailEvent.set(null);
    this.detailMaximized.set(false);
    this.showPdfInline.set(false);
  }

  pdfSrc(id: string): string {
    return this.api.getDocumentPdfUrl(id);
  }

  togglePdfInline(e?: Event) {
    e?.stopPropagation();
    this.showPdfInline.update((v) => !v);
  }

  showPdfInPanel(e?: Event) {
    e?.stopPropagation();
    this.showPdfInline.set(true);
  }

  toggleDetailMaximized(e?: Event) {
    e?.stopPropagation();
    this.detailMaximized.update((v) => !v);
  }

  toggleTimelineExpanded() {
    this.timelineExpanded.update((v) => !v);
  }

  /** PDF depuis la carte : ouvre le détail avec le lecteur intégré */
  openPdfFromCard(event: any, e?: Event) {
    e?.stopPropagation();
    this.detailEvent.set(event);
    this.detailMaximized.set(true);
    this.showPdfInline.set(true);
  }

  stopCardClick(e: Event) {
    e.stopPropagation();
  }
}
