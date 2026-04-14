import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  SalesforceConnectPayload,
  SalesforceSObject,
  SalesforceStatus,
} from '../../services/api.service';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class IntegrationsComponent implements OnInit {
  private api = inject(ApiService);

  status = signal<SalesforceStatus | null>(null);
  loading = signal(false);
  connecting = signal(false);
  error = signal('');
  success = signal('');

  sObjects = signal<SalesforceSObject[] | null>(null);
  sObjectsLoading = signal(false);
  sObjectsError = signal('');
  filter = signal('');
  onlyCustom = signal(false);

  filteredSObjects = computed(() => {
    const list = this.sObjects();
    if (!list) return [];
    const q = this.filter().trim().toLowerCase();
    return list.filter(o => {
      if (this.onlyCustom() && !o.custom) return false;
      if (!q) return true;
      return o.name.toLowerCase().includes(q) || o.label.toLowerCase().includes(q);
    });
  });

  overrideOpen = signal(false);
  form: SalesforceConnectPayload = { env: 'sandbox', loginUrl: '' };

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.api.getSalesforceStatus().subscribe({
      next: s => {
        this.status.set(s);
        this.loading.set(false);
        this.form.env = s.envDefaults?.env ?? 'sandbox';
        this.form.loginUrl = s.envDefaults?.loginUrl ?? '';
      },
      error: () => {
        this.error.set('Impossible de récupérer l\'état Salesforce.');
        this.loading.set(false);
      },
    });
  }

  connect() {
    this.error.set('');
    this.success.set('');
    this.connecting.set(true);
    this.api.connectSalesforce(this.form).subscribe({
      next: res => {
        this.connecting.set(false);
        if (res.success) {
          this.success.set(`Connecté à ${res.session?.instanceUrl}`);
          this.overrideOpen.set(false);
          this.refresh();
        } else {
          this.error.set(res.error || 'Échec de la connexion.');
        }
      },
      error: err => {
        this.connecting.set(false);
        this.error.set(err?.error?.error || 'Échec de la connexion Salesforce.');
      },
    });
  }

  disconnect() {
    this.api.disconnectSalesforce().subscribe({
      next: () => {
        this.success.set('Déconnecté.');
        this.sObjects.set(null);
        this.refresh();
      },
      error: () => this.error.set('Échec de la déconnexion.'),
    });
  }

  loadSObjects() {
    this.sObjectsError.set('');
    this.sObjectsLoading.set(true);
    this.api.listSalesforceSObjects().subscribe({
      next: ({ objects }) => {
        this.sObjects.set(objects);
        this.sObjectsLoading.set(false);
      },
      error: err => {
        this.sObjectsLoading.set(false);
        this.sObjectsError.set(err?.error?.error || 'Impossible de récupérer les objets.');
      },
    });
  }

  clearSObjects() {
    this.sObjects.set(null);
    this.filter.set('');
    this.onlyCustom.set(false);
  }

  get envDefaults() {
    return this.status()?.envDefaults;
  }

  get credsMissing(): boolean {
    const d = this.envDefaults;
    return !d ? false : !(d.hasClientId && d.hasClientSecret);
  }
}
