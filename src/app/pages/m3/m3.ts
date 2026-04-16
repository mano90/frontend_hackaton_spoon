import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { M3StateService } from '../../services/m3-state.service';

@Component({
  selector: 'app-m3',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './m3.html',
  styleUrl: './m3.scss',
})
export class M3Component implements OnInit {
  private api   = inject(ApiService);
  readonly st   = inject(M3StateService);

  // ── Onglet actif ─────────────────────────────────────────────────────────
  activeTab = signal<'config' | 'factures'>('config');

  // ── Configuration ION ─────────────────────────────────────────────────────
  ionConfig = signal({
    tokenUrl: '',
    clientId: '',
    clientSecret: '',
    baseUrl: '',
    saak: '',
    sask: '',
    label: '',
  });
  configured = signal(false);
  configSaving = signal(false);
  configSaved = signal(false);
  configError = signal('');

  importError = signal('');

  // Test de connexion
  testing = signal(false);
  testResult = signal<{ success: boolean; tokenType?: string; expiresIn?: number; error?: string } | null>(null);

  // ── Signaux persistants (délégués au service) ────────────────────────────
  get programs()           { return this.st.programs; }
  get transactions()       { return this.st.transactions; }
  get program()            { return this.st.program; }
  get transaction()        { return this.st.transaction; }
  get programSearch()      { return this.st.programSearch; }
  get transactionSearch()  { return this.st.transactionSearch; }
  get paramsRaw()          { return this.st.paramsRaw; }
  get maxrecs()            { return this.st.maxrecs; }
  get returncols()         { return this.st.returncols; }
  get result()             { return this.st.result; }
  get execError()          { return this.st.execError; }
  get chargeResult()       { return this.st.chargeResult; }
  get chargeError()        { return this.st.chargeError; }
  get fieldMapping()       { return this.st.fieldMapping; }

  /** Champs de l'app à mapper, avec libellé et candidats M3 par ordre de priorité */
  readonly APP_FIELDS: { key: string; label: string; candidates: string[] }[] = [
    { key: 'montant',     label: 'Montant',     candidates: ['NTAM','IVAM','TOQT','REVV','CUAM'] },
    { key: 'date',        label: 'Date',        candidates: ['IVDT','DATE','PUDT','ORDT','LEDT'] },
    { key: 'fournisseur', label: 'Fournisseur', candidates: ['SUNO','SUNM','CONM','SPYN'] },
    { key: 'reference',   label: 'Référence',   candidates: ['IVNO','PUNO','ORNO','SINO','DONR'] },
    { key: 'fileName',    label: 'Libellé',     candidates: ['IVNO','PUNO','ORNO','SINO','YRE1'] },
  ];

  // ── Signaux UI locaux (non persistants) ──────────────────────────────────
  loadingPrograms        = signal(false);
  showProgramDropdown    = signal(false);
  loadingTransactions    = signal(false);
  showTransactionDropdown = signal(false);
  loading                = signal(false);
  showRaw                = signal(false);
  importing              = signal(false);

  filteredPrograms = computed(() => {
    const q = this.programSearch().toLowerCase();
    if (!q) return this.programs().slice(0, 50);
    return this.programs()
      .filter(p => p.PGNM.toLowerCase().includes(q) || p.TX40.toLowerCase().includes(q))
      .slice(0, 50);
  });

  filteredTransactions = computed(() => {
    const q = this.transactionSearch().toLowerCase();
    if (!q) return this.transactions().slice(0, 50);
    return this.transactions()
      .filter(t => t.TRNM.toLowerCase().includes(q) || t.TX40.toLowerCase().includes(q))
      .slice(0, 50);
  });

  records = computed<Record<string, string>[]>(() => {
    const r = this.result();
    if (!r) return [];

    let rows: Record<string, string>[];
    if (r.results?.length) {
      rows = r.results.flatMap((t: any) => t.records ?? []);
    } else {
      rows = r.MIRecord ?? [];
    }

    // ── Transformation spéciale EXPORTMI ──────────────────────────────────
    if (this.program() === 'EXPORTMI') {
      const params = this.parsedParams();
      const sepc = params['SEPC'];
      const qery = params['QERY'];

      if (sepc && qery) {
        // Extraire les noms de champs depuis QERY : tout ce qui est avant "from" (insensible casse)
        const selectPart = qery.replace(/\s+from\s+[\s\S]*/i, '');
        const fieldNames = selectPart.split(',').map(f => f.trim()).filter(Boolean);

        return rows.map(rec => {
          const parts = (rec['REPL'] ?? '').split(sepc);
          const transformed: Record<string, string> = {};
          fieldNames.forEach((name, i) => {
            transformed[name] = parts[i] ?? '';
          });
          return transformed;
        });
      }
    }

    return rows;
  });

  columns = computed<string[]>(() => {
    const rows = this.records();
    if (!rows.length) return [];
    return Object.keys(rows[0]);
  });

  readonly EXAMPLES = [
    { label: 'Fournisseurs',          program: 'CRS610MI',  transaction: 'LstSupplier',   params: 'CONO=1' },
    { label: 'Articles',              program: 'MMS200MI',  transaction: 'LstItmBasic',   params: 'CONO=1' },
    { label: 'Commandes fournisseur', program: 'PPS200MI',  transaction: 'LstHead',        params: 'CONO=1' },
    { label: 'Entrepôts',             program: 'MMS005MI',  transaction: 'LstWarehouses',  params: 'CONO=1' },
    { label: 'Export SQL (EXPORTMI)', program: 'EXPORTMI',  transaction: 'Select',
      params: "QERY=E5SINO, E5SUNO, E5IVDT, E5CUAM from FAPIBH where SUNO = 'Y20002'\nSEPC=," },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    this.api.getIonConfig().subscribe({
      next: ({ config, configured }) => {
        this.ionConfig.set({ ...this.ionConfig(), ...config });
        this.configured.set(configured);
        if (configured) {
          this.activeTab.set('factures');
          // Ne recharger que si la liste est vide (première visite)
          if (this.programs().length === 0) this.loadPrograms();
        }
      },
      error: () => {},
    });
  }

  get programsError()     { return this.st.programsError; }
  get transactionsError() { return this.st.transactionsError; }

  // ── Chargement liste programmes ───────────────────────────────────────────
  loadPrograms() {
    this.loadingPrograms.set(true);
    this.programsError.set('');
    this.api.executeM3('MRS001MI', 'LstPrograms', {}, { maxrecs: 9999 }).subscribe({
      next: ({ result }) => {
        const rows: any[] = result?.results?.flatMap((t: any) => t.records ?? []) ?? result?.MIRecord ?? [];
        console.log('[M3] LstPrograms — premier enregistrement :', rows[0]);
        console.log('[M3] LstPrograms — total :', rows.length);
        if (rows.length === 0) {
          this.programsError.set('Aucun programme retourné par MRS001MI/LstPrograms.');
          this.loadingPrograms.set(false);
          return;
        }
        // Détection automatique du champ nom programme (PGNM ou premier champ)
        const firstRow = rows[0];
        const nameField = 'PGNM' in firstRow ? 'PGNM' : Object.keys(firstRow)[0];
        const descField = 'TX40' in firstRow ? 'TX40' : ('TX15' in firstRow ? 'TX15' : '');
        this.programs.set(rows.map(r => ({ PGNM: r[nameField] ?? '', TX40: r[descField] ?? '' })));
        this.loadingPrograms.set(false);
      },
      error: (e) => {
        this.programsError.set(e.error?.error ?? e.message ?? 'Erreur chargement programmes.');
        this.loadingPrograms.set(false);
      },
    });
  }

  // ── Combobox programme ────────────────────────────────────────────────────
  onProgramFocus() {
    this.programSearch.set('');
    this.showProgramDropdown.set(true);
  }

  onProgramInput(value: string) {
    this.programSearch.set(value);
    this.showProgramDropdown.set(true);
  }

  selectProgram(p: { PGNM: string; TX40: string }) {
    this.program.set(p.PGNM);
    this.programSearch.set(p.PGNM);
    this.showProgramDropdown.set(false);
    // Charger les transactions du programme sélectionné
    this.transaction.set('');
    this.transactionSearch.set('');
    this.transactions.set([]);
    this.loadTransactions(p.PGNM);
  }

  onProgramBlur() {
    setTimeout(() => {
      this.showProgramDropdown.set(false);
      if (!this.programSearch()) this.programSearch.set(this.program());
    }, 150);
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  loadTransactions(programName: string) {
    if (!programName) return;
    this.loadingTransactions.set(true);
    this.transactionsError.set('');
    this.api.executeM3('MRS001MI', 'LstTransactions', { MINM: programName }, { maxrecs: 999 }).subscribe({
      next: ({ result }) => {
        const rows: any[] = result?.results?.flatMap((t: any) => t.records ?? []) ?? result?.MIRecord ?? [];
        console.log('[M3] LstTransactions — premier enregistrement :', rows[0]);
        const nameField = 'TRNM' in (rows[0] ?? {}) ? 'TRNM' : Object.keys(rows[0] ?? {})[0];
        const descField = 'TX40' in (rows[0] ?? {}) ? 'TX40' : ('TX15' in (rows[0] ?? {}) ? 'TX15' : '');
        this.transactions.set(rows.map(r => ({ TRNM: r[nameField] ?? '', TX40: r[descField] ?? '' })));
        this.loadingTransactions.set(false);
      },
      error: (e) => {
        this.transactionsError.set(e.error?.error ?? 'Erreur chargement transactions.');
        this.loadingTransactions.set(false);
      },
    });
  }

  onTransactionFocus() {
    this.transactionSearch.set('');
    this.showTransactionDropdown.set(true);
  }

  onTransactionInput(value: string) {
    this.transactionSearch.set(value);
    this.showTransactionDropdown.set(true);
  }

  selectTransaction(t: { TRNM: string; TX40: string }) {
    this.transaction.set(t.TRNM);
    this.transactionSearch.set(t.TRNM);
    this.showTransactionDropdown.set(false);
  }

  onTransactionBlur() {
    setTimeout(() => {
      this.showTransactionDropdown.set(false);
      if (!this.transactionSearch()) this.transactionSearch.set(this.transaction());
    }, 150);
  }

  // ── Import fichier .ionapi ────────────────────────────────────────────────
  importFromFile(event: Event) {
    this.importError.set('');
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const mapped = {
          tokenUrl:     (json.pu && json.ot) ? `${json.pu.replace(/\/$/, '')}/${json.ot}` : (json.iu || ''),
          clientId:     json.ci   || '',
          clientSecret: json.cs   || '',
          baseUrl:      (json.iu && json.ti) ? `${json.iu.replace(/\/$/, '')}/${json.ti}` : '',
          saak:         json.saak || '',
          sask:         json.sask || '',
          label:        json.cn   ? `${json.cn} (${json.ti || ''})`.trim() : (json.ti || ''),
        };
        const missing = Object.entries(mapped)
          .filter(([k, v]) => k !== 'label' && !v)
          .map(([k]) => k);
        if (missing.length) {
          this.importError.set(`Champs manquants dans le fichier : ${missing.join(', ')}`);
        }
        this.ionConfig.set(mapped);
        (event.target as HTMLInputElement).value = '';
      } catch {
        this.importError.set('Fichier invalide — JSON non lisible.');
      }
    };
    reader.readAsText(file);
  }

  // ── Config actions ────────────────────────────────────────────────────────
  updateConfig(field: string, value: string) {
    this.ionConfig.update(c => ({ ...c, [field]: value }));
  }

  saveConfig() {
    this.configSaving.set(true);
    this.configError.set('');
    this.testResult.set(null);
    this.api.saveIonConfig(this.ionConfig()).subscribe({
      next: ({ config, configured }) => {
        this.ionConfig.update(c => ({ ...c, ...config }));
        this.configured.set(configured);
        this.configSaving.set(false);
        this.configSaved.set(true);
        setTimeout(() => this.configSaved.set(false), 2500);
      },
      error: (e) => {
        this.configSaving.set(false);
        this.configError.set(e.error?.error ?? 'Erreur lors de la sauvegarde.');
      },
    });
  }

  testConnection() {
    this.testing.set(true);
    this.testResult.set(null);
    this.api.saveIonConfig(this.ionConfig()).subscribe({
      next: () => {
        this.api.testIonConnection().subscribe({
          next: (res) => {
            this.testResult.set(res);
            this.testing.set(false);
            if (res.success) {
              this.configured.set(true);
              this.loadPrograms();
            }
          },
          error: () => { this.testResult.set({ success: false, error: 'Impossible de joindre le serveur.' }); this.testing.set(false); },
        });
      },
      error: (e) => { this.testResult.set({ success: false, error: e.error?.error ?? 'Erreur sauvegarde.' }); this.testing.set(false); },
    });
  }

  // ── Exécution M3 ─────────────────────────────────────────────────────────
  parsedParams = computed<Record<string, string>>(() =>
    Object.fromEntries(
      this.paramsRaw().split('\n')
        .map(line => line.split('='))
        .filter(parts => parts.length >= 2)
        .map(([k, ...rest]) => [k.trim(), rest.join('=').trim()])
        .filter(([k]) => k.length > 0)
    )
  );

  execute() {
    if (!this.program() || !this.transaction()) return;
    this.loading.set(true);
    this.execError.set('');
    this.result.set(null);
    this.showRaw.set(false);
    this.chargeResult.set(null);
    this.chargeError.set('');

    const data = this.parsedParams();
    const options: any = { maxrecs: this.maxrecs() };
    if (this.returncols().trim()) options.returncols = this.returncols().trim();

    this.api.executeM3(this.program(), this.transaction(), data, options).subscribe({
      next: ({ result }) => {
        this.result.set(result);
        this.loading.set(false);
        this.autoDetectMapping();
      },
      error: (e) => {
        this.execError.set(e.error?.error ?? e.message ?? 'Erreur lors de l\'appel M3.');
        this.loading.set(false);
      },
    });
  }

  loadExample(ex: { program: string; transaction: string; params: string }) {
    this.program.set(ex.program);
    this.programSearch.set(ex.program);
    this.transaction.set(ex.transaction);
    this.transactionSearch.set(ex.transaction);
    this.paramsRaw.set(ex.params);
    this.result.set(null);
    this.execError.set('');
    this.loadTransactions(ex.program);
  }

  /** Sélectionne automatiquement le premier champ candidat présent dans les colonnes. */
  autoDetectMapping() {
    const cols = new Set(this.columns());
    if (!cols.size) return;
    const detected: Record<string, string> = {};
    for (const field of this.APP_FIELDS) {
      detected[field.key] = field.candidates.find(c => cols.has(c)) ?? '';
    }
    this.fieldMapping.set(detected);
  }

  updateMapping(key: string, value: string) {
    this.fieldMapping.update(m => ({ ...m, [key]: value }));
  }

  charger() {
    const rows = this.records();
    if (!rows.length) return;
    this.importing.set(true);
    this.chargeError.set('');
    this.chargeResult.set(null);
    this.api.importM3Factures(rows, this.fieldMapping()).subscribe({
      next: ({ count }) => { this.chargeResult.set({ count }); this.importing.set(false); },
      error: (e) => { this.chargeError.set(e.error?.error ?? 'Erreur lors du chargement.'); this.importing.set(false); },
    });
  }

  toggleRaw() { this.showRaw.update(v => !v); }

  get rawJson(): string { return JSON.stringify(this.result(), null, 2); }
}
