import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface ConfigField {
  key: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

const AGENT_GROUPS: { title: string; icon: string; fields: ConfigField[] }[] = [
  {
    title: 'SA-4 — Frais bancaires',
    icon: 'fa-university',
    fields: [
      {
        key: 'bankFeesMaxEcart',
        label: 'Écart maximum',
        description: 'Montant maximal de l\'écart pouvant être attribué à des frais ou commissions bancaires.',
        unit: '€',
        min: 1,
        max: 500,
        step: 1,
      },
    ],
  },
  {
    title: 'SA-4 — Escompte commercial',
    icon: 'fa-percent',
    fields: [
      {
        key: 'discountMaxWithoutProof',
        label: 'Seuil sans preuve documentaire',
        description: 'Au-delà de ce pourcentage d\'écart, une preuve documentaire (accord, avoir) est obligatoire pour valider l\'escompte.',
        unit: '%',
        min: 0,
        max: 100,
        step: 1,
      },
      {
        key: 'discountAbsoluteMax',
        label: 'Seuil absolu maximum',
        description: 'Un écart supérieur à ce pourcentage est systématiquement rejeté, quelle que soit la documentation.',
        unit: '%',
        min: 0,
        max: 100,
        step: 1,
      },
    ],
  },
  {
    title: 'SA-4 — Paiement groupé',
    icon: 'fa-layer-group',
    fields: [
      {
        key: 'groupedPaymentTolerance',
        label: 'Tolérance de regroupement',
        description: 'Tolérance relative appliquée lors de la recherche de combinaisons de factures dont la somme correspond au mouvement.',
        unit: '%',
        min: 0,
        max: 10,
        step: 0.5,
      },
    ],
  },
  {
    title: 'SA-4 — Taux de change',
    icon: 'fa-exchange-alt',
    fields: [
      {
        key: 'exchangeRateTolerance',
        label: 'Tolérance de taux',
        description: 'Tolérance relative pour valider qu\'un montant en devise étrangère converti correspond au montant du mouvement.',
        unit: '%',
        min: 0,
        max: 20,
        step: 0.5,
      },
    ],
  },
];

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config.html',
  styleUrl: './config.scss',
})
export class ConfigComponent implements OnInit {
  private api = inject(ApiService);

  groups = AGENT_GROUPS;
  config = signal<Record<string, number>>({});
  defaults = signal<Record<string, number>>({});
  saving = signal(false);
  saved = signal(false);
  error = signal('');

  ngOnInit() {
    this.api.getConfig().subscribe({
      next: ({ config, defaults }) => {
        this.config.set(config);
        this.defaults.set(defaults);
      },
      error: () => this.error.set('Impossible de charger la configuration.'),
    });
  }

  getValue(key: string): number {
    return this.config()[key] ?? this.defaults()[key] ?? 0;
  }

  setValue(key: string, value: number) {
    this.config.update(c => ({ ...c, [key]: value }));
  }

  isDefault(key: string): boolean {
    return this.getValue(key) === this.defaults()[key];
  }

  reset(key: string) {
    this.setValue(key, this.defaults()[key]);
  }

  resetAll() {
    this.saving.set(true);
    this.api.resetConfig().subscribe({
      next: ({ config }) => {
        this.config.set(config);
        this.saving.set(false);
        this.flash();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Erreur lors de la réinitialisation.');
      },
    });
  }

  save() {
    this.saving.set(true);
    this.error.set('');
    this.api.updateConfig(this.config()).subscribe({
      next: ({ config }) => {
        this.config.set(config);
        this.saving.set(false);
        this.flash();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Erreur lors de la sauvegarde.');
      },
    });
  }

  private flash() {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
}
