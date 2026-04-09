import { Component, OnInit, AfterViewChecked, inject, signal, computed, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

declare const Vivus: any;

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; svg: string }> = {
  devis: {
    label: 'Devis', icon: 'fa-file-invoice', color: '#6366f1',
    svg: `<svg viewBox="0 0 60 60"><rect x="10" y="5" width="40" height="50" rx="4" fill="none" stroke="#6366f1" stroke-width="3"/><line x1="18" y1="18" x2="42" y2="18" stroke="#6366f1" stroke-width="2"/><line x1="18" y1="26" x2="42" y2="26" stroke="#6366f1" stroke-width="2"/><line x1="18" y1="34" x2="35" y2="34" stroke="#6366f1" stroke-width="2"/></svg>`,
  },
  bon_commande: {
    label: 'Bon de commande', icon: 'fa-box', color: '#3b82f6',
    svg: `<svg viewBox="0 0 60 60"><rect x="8" y="15" width="44" height="35" rx="3" fill="none" stroke="#3b82f6" stroke-width="3"/><polyline points="8,25 30,10 52,25" fill="none" stroke="#3b82f6" stroke-width="3"/><line x1="30" y1="25" x2="30" y2="42" stroke="#3b82f6" stroke-width="2"/><line x1="22" y1="33" x2="38" y2="33" stroke="#3b82f6" stroke-width="2"/></svg>`,
  },
  bon_livraison: {
    label: 'Bon de livraison', icon: 'fa-truck', color: '#f59e0b',
    svg: `<svg viewBox="0 0 60 60"><rect x="3" y="18" width="32" height="22" rx="3" fill="none" stroke="#f59e0b" stroke-width="3"/><path d="M35,18 L35,40 L52,40 L52,28 L45,18 Z" fill="none" stroke="#f59e0b" stroke-width="3"/><circle cx="15" cy="44" r="5" fill="none" stroke="#f59e0b" stroke-width="3"/><circle cx="44" cy="44" r="5" fill="none" stroke="#f59e0b" stroke-width="3"/></svg>`,
  },
  bon_reception: {
    label: 'Bon de reception', icon: 'fa-clipboard-check', color: '#22c55e',
    svg: `<svg viewBox="0 0 60 60"><rect x="12" y="8" width="36" height="46" rx="4" fill="none" stroke="#22c55e" stroke-width="3"/><rect x="22" y="3" width="16" height="10" rx="2" fill="none" stroke="#22c55e" stroke-width="2"/><polyline points="22,32 28,38 40,24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  facture: {
    label: 'Facture', icon: 'fa-file-invoice-dollar', color: '#ef4444',
    svg: `<svg viewBox="0 0 60 60"><rect x="10" y="5" width="40" height="50" rx="4" fill="none" stroke="#ef4444" stroke-width="3"/><circle cx="30" cy="25" r="8" fill="none" stroke="#ef4444" stroke-width="2.5"/><line x1="30" y1="21" x2="30" y2="29" stroke="#ef4444" stroke-width="2"/><line x1="26" y1="25" x2="34" y2="25" stroke="#ef4444" stroke-width="2"/><line x1="18" y1="40" x2="42" y2="40" stroke="#ef4444" stroke-width="2"/><line x1="18" y1="46" x2="36" y2="46" stroke="#ef4444" stroke-width="2"/></svg>`,
  },
  mouvement: {
    label: 'Paiement', icon: 'fa-university', color: '#8b5cf6',
    svg: `<svg viewBox="0 0 60 60"><rect x="5" y="20" width="50" height="30" rx="4" fill="none" stroke="#8b5cf6" stroke-width="3"/><line x1="5" y1="30" x2="55" y2="30" stroke="#8b5cf6" stroke-width="2"/><line x1="15" y1="38" x2="30" y2="38" stroke="#8b5cf6" stroke-width="2"/><circle cx="45" cy="40" r="5" fill="none" stroke="#8b5cf6" stroke-width="2"/></svg>`,
  },
  email: {
    label: 'Email', icon: 'fa-envelope', color: '#64748b',
    svg: `<svg viewBox="0 0 60 60"><rect x="5" y="14" width="50" height="32" rx="4" fill="none" stroke="#64748b" stroke-width="3"/><polyline points="5,14 30,34 55,14" fill="none" stroke="#64748b" stroke-width="3"/></svg>`,
  },
};

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1><i class="fas fa-stream"></i> Timeline</h1>

      <div class="filters">
        <div class="filter-group">
          <label><i class="fas fa-filter"></i> Scenario</label>
          <select [(ngModel)]="selectedScenario" (ngModelChange)="load()">
            <option value="">Tous</option>
            @for (s of scenarioIds(); track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
        </div>
        <div class="filter-group">
          <label><i class="fas fa-tag"></i> Type</label>
          <select [(ngModel)]="selectedType" (ngModelChange)="applyFilters()">
            <option value="">Tous</option>
            <option value="devis">Devis</option>
            <option value="bon_commande">Bon de commande</option>
            <option value="bon_livraison">Bon de livraison</option>
            <option value="bon_reception">Bon de reception</option>
            <option value="facture">Facture</option>
            <option value="mouvement">Paiement</option>
            <option value="email">Email</option>
          </select>
        </div>
        <span class="event-count"><i class="fas fa-chart-bar"></i> {{ filteredEvents().length }} evenements</span>
      </div>

      <!-- Horizontal Timeline -->
      <div class="h-timeline-wrapper">
        <div class="h-timeline" #timelineEl>
          <!-- Center line -->
          <div class="h-line"></div>

          @for (event of filteredEvents(); track event.id; let i = $index) {
            <div class="h-item" [class.above]="i % 2 === 0" [class.below]="i % 2 !== 0">
              <!-- SVG icon with vivus animation -->
              <div class="h-icon-wrapper">
                <div class="h-dot" [style.border-color]="getConfig(event.type).color">
                  <i class="fas {{ getConfig(event.type).icon }}" [style.color]="getConfig(event.type).color"></i>
                </div>
                <div class="h-connector" [style.background]="getConfig(event.type).color"></div>
              </div>

              <!-- Card -->
              <div class="h-card" [style.border-top-color]="getConfig(event.type).color">
                <!-- Animated SVG -->
                <div class="h-svg" [attr.id]="'svg-' + event.id" [innerHTML]="getConfig(event.type).svg"></div>

                <div class="h-card-body">
                  <span class="h-date">{{ event.date }}</span>
                  <span class="h-type" [style.background]="getConfig(event.type).color">
                    <i class="fas {{ getConfig(event.type).icon }}"></i> {{ getConfig(event.type).label }}
                  </span>
                  <strong class="h-ref">{{ event.reference || event.subject || '' }}</strong>
                  @if (event.fournisseur) {
                    <span class="h-supplier">{{ event.fournisseur }}</span>
                  }
                  @if (event.montant) {
                    <span class="h-amount">{{ event.montant | number:'1.2-2' }} EUR</span>
                  }
                  @if (event.scenarioId) {
                    <span class="h-scenario">{{ event.scenarioId }}</span>
                  }
                  @if (event.type === 'email') {
                    <span class="h-relation" [class.related]="event.hasRelation" [class.unrelated]="!event.hasRelation">
                      {{ event.hasRelation ? event.relationType : 'Pas de relation' }}
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      @if (!filteredEvents().length) {
        <div class="empty"><i class="fas fa-inbox"></i> Aucun evenement dans la timeline.</div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 100%; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; color: #1e293b; }
    h1 i { margin-right: 0.5rem; color: #6366f1; }

    .filters {
      display: flex; gap: 1.5rem; align-items: center; margin-bottom: 2rem;
      background: white; padding: 1rem 1.25rem; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .filter-group label { font-size: 0.85rem; font-weight: 600; color: #64748b; }
    .filter-group label i { margin-right: 0.25rem; }
    .filter-group select { padding: 0.4rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9rem; }
    .event-count { margin-left: auto; font-size: 0.85rem; color: #94a3b8; font-weight: 500; }

    /* Horizontal timeline */
    .h-timeline-wrapper {
      overflow-x: auto; padding: 2rem 0;
      scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;
    }
    .h-timeline-wrapper::-webkit-scrollbar { height: 8px; }
    .h-timeline-wrapper::-webkit-scrollbar-track { background: transparent; }
    .h-timeline-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    .h-timeline {
      display: flex; align-items: center; position: relative;
      min-height: 420px; padding: 0 40px;
    }
    .h-line {
      position: absolute; top: 50%; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%);
      z-index: 0;
    }

    .h-item {
      position: relative; flex: 0 0 200px; display: flex; flex-direction: column;
      align-items: center; z-index: 1;
    }

    /* Alternating above/below */
    .h-item.above { justify-content: flex-end; padding-bottom: 210px; }
    .h-item.below { justify-content: flex-start; padding-top: 210px; }

    .h-icon-wrapper {
      position: absolute; top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; align-items: center; z-index: 2;
    }
    .h-dot {
      width: 40px; height: 40px; border-radius: 50%; background: white;
      border: 3px solid #6366f1; display: flex; align-items: center; justify-content: center;
      font-size: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .h-item:hover .h-dot { transform: scale(1.15); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }

    .h-connector {
      width: 2px; height: 30px; background: #e2e8f0;
    }
    .h-item.above .h-connector { order: 1; }
    .h-item.below .h-connector { order: -1; }

    .h-card {
      width: 180px; background: white; border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); border-top: 3px solid #6366f1;
      padding: 0.75rem; transition: transform 0.3s, box-shadow 0.3s;
      position: absolute;
    }
    .h-item.above .h-card { bottom: 230px; }
    .h-item.below .h-card { top: 230px; }
    .h-item:hover .h-card { transform: translateY(-4px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }

    .h-svg {
      width: 48px; height: 48px; margin: 0 auto 0.5rem;
    }
    .h-svg svg { width: 100%; height: 100%; }

    .h-card-body { display: flex; flex-direction: column; gap: 0.2rem; }
    .h-date { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
    .h-type {
      color: white; padding: 0.15rem 0.4rem; border-radius: 4px;
      font-size: 0.65rem; font-weight: 600; align-self: flex-start;
    }
    .h-type i { margin-right: 0.2rem; }
    .h-ref { font-size: 0.8rem; color: #1e293b; line-height: 1.2;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
    .h-supplier { font-size: 0.7rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .h-amount { font-size: 0.85rem; font-weight: 700; color: #6366f1; }
    .h-scenario { font-size: 0.65rem; background: #eef2ff; color: #6366f1; padding: 0.1rem 0.3rem; border-radius: 3px; align-self: flex-start; }
    .h-relation { font-size: 0.65rem; padding: 0.1rem 0.3rem; border-radius: 3px; align-self: flex-start; }
    .h-relation.related { background: #dcfce7; color: #16a34a; }
    .h-relation.unrelated { background: #f1f5f9; color: #94a3b8; }

    .empty { text-align: center; padding: 3rem; color: #94a3b8; background: white; border-radius: 12px; font-size: 1.1rem; }
    .empty i { margin-right: 0.5rem; }

    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .h-item { animation: fadeInUp 0.5s ease forwards; }
    .h-item:nth-child(2) { animation-delay: 0.05s; }
    .h-item:nth-child(3) { animation-delay: 0.1s; }
    .h-item:nth-child(4) { animation-delay: 0.15s; }
    .h-item:nth-child(5) { animation-delay: 0.2s; }
    .h-item:nth-child(6) { animation-delay: 0.25s; }
    .h-item:nth-child(7) { animation-delay: 0.3s; }
    .h-item:nth-child(8) { animation-delay: 0.35s; }
    .h-item:nth-child(9) { animation-delay: 0.4s; }
    .h-item:nth-child(10) { animation-delay: 0.45s; }
  `]
})
export class TimelineComponent implements OnInit, AfterViewChecked {
  private api = inject(ApiService);

  allEvents = signal<any[]>([]);
  selectedScenario = '';
  selectedType = '';
  private vivusInitialized = new Set<string>();

  scenarioIds = computed(() => {
    const ids = new Set<string>();
    for (const e of this.allEvents()) {
      if (e.scenarioId) ids.add(e.scenarioId);
    }
    return Array.from(ids).sort();
  });

  filteredEvents = computed(() => {
    let events = this.allEvents();
    if (this.selectedType) events = events.filter(e => e.type === this.selectedType);
    return events;
  });

  getConfig(type: string) {
    return TYPE_CONFIG[type] || { label: type, icon: 'fa-file', color: '#94a3b8', svg: '' };
  }

  ngOnInit() { this.load(); }

  ngAfterViewChecked() {
    // Animate SVGs with Vivus
    for (const event of this.filteredEvents()) {
      const elId = `svg-${event.id}`;
      if (this.vivusInitialized.has(elId)) continue;
      const el = document.getElementById(elId);
      if (!el) continue;
      const svgEl = el.querySelector('svg');
      if (!svgEl) continue;

      svgEl.setAttribute('id', `vivus-${event.id}`);
      try {
        new Vivus(`vivus-${event.id}`, {
          type: 'delayed',
          duration: 80,
          animTimingFunction: Vivus.EASE,
          start: 'inViewport',
        });
        this.vivusInitialized.add(elId);
      } catch (_) {}
    }
  }

  load() {
    this.vivusInitialized.clear();
    const obs = this.selectedScenario
      ? this.api.getScenarioTimeline(this.selectedScenario)
      : this.api.getTimeline();
    obs.subscribe({ next: (data) => this.allEvents.set(data) });
  }

  applyFilters() {
    this.vivusInitialized.clear();
    this.allEvents.set([...this.allEvents()]);
  }
}
