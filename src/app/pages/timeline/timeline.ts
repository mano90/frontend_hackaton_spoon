import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss'
})
export class TimelineComponent implements OnInit {
  private api = inject(ApiService);

  allEvents = signal<any[]>([]);
  selectedScenario = '';
  selectedType = '';

  scenarioIds = computed(() => {
    const ids = new Set<string>();
    for (const e of this.allEvents()) { if (e.scenarioId) ids.add(e.scenarioId); }
    return Array.from(ids).sort();
  });

  filteredEvents = computed(() => {
    let events = this.allEvents();
    if (this.selectedType) events = events.filter(e => e.type === this.selectedType);
    return events;
  });

  cfg(type: string) {
    return TYPE_CONFIG[type] || { label: type, icon: 'fa-file', color: '#94a3b8', bg: '#f1f5f9' };
  }

  ngOnInit() { this.load(); }

  load() {
    const obs = this.selectedScenario
      ? this.api.getScenarioTimeline(this.selectedScenario)
      : this.api.getTimeline();
    obs.subscribe({ next: (data) => this.allEvents.set(data) });
  }

  applyFilters() { this.allEvents.set([...this.allEvents()]); }
}
