import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  SalesforceConnectPayload,
  SalesforceSObject,
  SalesforceStatus,
  SalesforceSyncPayload,
  SalesforceSyncResult,
} from '../../services/api.service';
import { ImportSocketService } from '../../services/import-socket.service';

export interface DetectedObject {
  name: string;
  label: string;
  description: string;
  found: boolean;
  selected: boolean;
}

const EXPECTED_OBJECTS: { name: string; label: string; description: string }[] = [
  { name: 'Account', label: 'Comptes', description: 'Comptes fournisseurs et clients.' },
  { name: 'Bank_Movement__c', label: 'Mouvements bancaires', description: 'Relevés bancaires : virements, prélèvements, CB.' },
  { name: 'Commercial_Document__c', label: 'Documents commerciaux', description: 'Devis, bons de commande, bons de livraison, factures, emails.' },
  { name: 'Purchase_Order__c', label: 'Bons de commande', description: 'Commandes fournisseurs liées aux documents.' },
  { name: 'Supplier_Invoice__c', label: 'Factures fournisseurs', description: 'Factures reçues, liées aux commandes et documents.' },
  { name: 'Reconciliation__c', label: 'Rapprochements', description: 'Rapprochement entre mouvements bancaires et factures.' },
];

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './integrations.html',
  styleUrl: './integrations.scss',
})
export class IntegrationsComponent implements OnInit {
  private api = inject(ApiService);
  readonly importSocket = inject(ImportSocketService);

  status = signal<SalesforceStatus | null>(null);
  loading = signal(false);
  connecting = signal(false);
  error = signal('');
  success = signal('');

  sObjectsLoading = signal(false);
  sObjectsError = signal('');
  detectedObjects = signal<DetectedObject[] | null>(null);

  // Sync
  syncing = signal(false);
  syncOverlayOpen = signal(false);
  syncResult = signal<SalesforceSyncResult | null>(null);
  syncForm: SalesforceSyncPayload = { dateFrom: '', dateTo: '', includeEmails: false };

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
    this.error.set(''); this.success.set('');
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
      next: () => { this.success.set('Déconnecté.'); this.detectedObjects.set(null); this.refresh(); },
      error: () => this.error.set('Échec de la déconnexion.'),
    });
  }

  detectObjects() {
    this.sObjectsError.set(''); this.sObjectsLoading.set(true);
    this.api.listSalesforceSObjects().subscribe({
      next: ({ objects }) => {
        const orgNames = new Set(objects.map(o => o.name));
        this.detectedObjects.set(EXPECTED_OBJECTS.map(exp => ({
          ...exp, found: orgNames.has(exp.name), selected: orgNames.has(exp.name),
        })));
        this.sObjectsLoading.set(false);
      },
      error: err => {
        this.sObjectsLoading.set(false);
        this.sObjectsError.set(err?.error?.error || 'Impossible de récupérer les objets.');
      },
    });
  }

  toggleObject(obj: DetectedObject) {
    const list = this.detectedObjects();
    if (!list) return;
    this.detectedObjects.set(list.map(o => o.name === obj.name ? { ...o, selected: !o.selected } : o));
  }

  hasAllRequired(): boolean {
    return this.detectedObjects()?.every(o => o.found) ?? false;
  }

  confirmObjects() {
    const n = this.detectedObjects()?.filter(o => o.selected).length ?? 0;
    this.success.set(`Configuration confirmée : ${n} objets sélectionnés.`);
  }

  async startSync() {
    this.syncing.set(true);
    this.syncOverlayOpen.set(true);
    this.syncResult.set(null);
    this.error.set('');
    this.importSocket.clearSalesforceSync();

    await this.importSocket.ensureSocket();

    const payload: SalesforceSyncPayload = {
      dateFrom: this.syncForm.dateFrom || undefined,
      dateTo: this.syncForm.dateTo || undefined,
      includeEmails: this.syncForm.includeEmails,
    };

    this.api.syncSalesforceData(payload).subscribe({
      next: result => {
        this.syncResult.set(result);
        this.syncing.set(false);
      },
      error: err => {
        this.syncing.set(false);
        this.error.set(err?.error?.error || 'Erreur lors de la synchronisation.');
      },
    });
  }

  closeSyncOverlay() {
    this.syncOverlayOpen.set(false);
    this.importSocket.clearSalesforceSync();
  }

  clearDetection() {
    this.detectedObjects.set(null);
    this.sObjectsError.set('');
  }

  get envDefaults() { return this.status()?.envDefaults; }
  get credsMissing(): boolean {
    const d = this.envDefaults;
    return !d ? false : !(d.hasClientId && d.hasClientSecret);
  }
}
