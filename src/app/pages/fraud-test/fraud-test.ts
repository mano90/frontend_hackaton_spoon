import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

/** Ligne affichée après scan global (aligné backend FraudSignal + document). */
interface FraudSignalDisplay {
  kind: string;
  code: string;
  severity: string;
  evidence: string[];
}

interface DocumentWithFraudRow {
  id: string;
  fileName: string;
  fournisseur: string;
  reference: string;
  date?: string;
  docType?: string;
  maxSeverity: string;
  summary?: string;
  llmNote?: string;
  scannedAt?: string;
  signals: FraudSignalDisplay[];
}

/** Aligné sur `backend_hackaton_spoon` FraudConfig (champs éditables ici). */
interface FraudFormNumbers {
  autoApprovalMaxAmount: number;
  arithToleranceEuro: number;
  newCompanyMaxAgeDays: number;
}

@Component({
  selector: 'app-fraud-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fraud-test.html',
  styleUrl: './fraud-test.scss',
})
export class FraudTestComponent implements OnInit {
  private api = inject(ApiService);

  /** Upload */
  uploadFile: File | null = null;
  forceDocTypeFacture = true;
  uploadBusy = signal(false);
  uploadMessage = signal('');

  /** Document courant */
  documentIdInput = '';
  docBusy = signal(false);
  documentPayload = signal<Record<string, unknown> | null>(null);

  /** Re-scan */
  scanBusy = signal(false);
  scanResult = signal<Record<string, unknown> | null>(null);

  /** Config fraude */
  fraudDefaults = signal<Record<string, unknown>>({});
  fraudForm: FraudFormNumbers = {
    autoApprovalMaxAmount: 500,
    arithToleranceEuro: 0.02,
    newCompanyMaxAgeDays: 90,
  };
  motsClefsLines = '';
  massAddressLines = '';
  pdfProducerLines = '';
  configBusy = signal(false);
  configMessage = signal('');

  /** Démo inject */
  injectBusy = signal(false);
  injectDemoMessage = signal('');

  /** Scan de tous les documents (re-scan skip LLM par id) */
  bulkScanBusy = signal(false);
  bulkScanProgress = signal<{ current: number; total: number } | null>(null);
  bulkScanOnlyFactures = true;
  bulkScanResults = signal<DocumentWithFraudRow[]>([]);
  bulkScanStats = signal<{
    total: number;
    analyzed: number;
    skipped: number;
    withFraud: number;
  } | null>(null);

  error = signal('');

  ngOnInit(): void {
    this.loadFraudConfig();
  }

  loadFraudConfig(): void {
    this.configBusy.set(true);
    this.configMessage.set('');
    this.error.set('');
    this.api.getFraudConfig().subscribe({
      next: ({ fraudConfig, defaults }) => {
        this.fraudDefaults.set(defaults as Record<string, unknown>);
        this.applyFraudConfigToForm(fraudConfig as Record<string, unknown>);
        this.configBusy.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.configBusy.set(false);
        this.error.set(e.error?.error || e.message || 'GET /api/config/fraud impossible.');
      },
    });
  }

  private applyFraudConfigToForm(fc: Record<string, unknown>): void {
    this.fraudForm = {
      autoApprovalMaxAmount: Number(fc['autoApprovalMaxAmount'] ?? 500),
      arithToleranceEuro: Number(fc['arithToleranceEuro'] ?? 0.02),
      newCompanyMaxAgeDays: Number(fc['newCompanyMaxAgeDays'] ?? 90),
    };
    this.motsClefsLines = this.arrToLines(fc['motsClefsPhishing']);
    this.massAddressLines = this.arrToLines(fc['massAddressSubstrings']);
    this.pdfProducerLines = this.arrToLines(fc['pdfEditorProducerPatterns']);
  }

  private arrToLines(v: unknown): string {
    if (!Array.isArray(v)) return '';
    return v.map((x) => String(x)).join('\n');
  }

  private linesToArr(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  resetFraudFormToDefaults(): void {
    const d = this.fraudDefaults();
    this.applyFraudConfigToForm(d);
    this.configMessage.set('Formulaire réaligné sur les défauts (non sauvegardé côté serveur).');
  }

  saveFraudConfig(): void {
    const n = this.fraudForm;
    const body: Record<string, unknown> = {
      autoApprovalMaxAmount: n.autoApprovalMaxAmount,
      arithToleranceEuro: n.arithToleranceEuro,
      newCompanyMaxAgeDays: n.newCompanyMaxAgeDays,
      motsClefsPhishing: this.linesToArr(this.motsClefsLines),
      massAddressSubstrings: this.linesToArr(this.massAddressLines),
      pdfEditorProducerPatterns: this.linesToArr(this.pdfProducerLines),
    };
    this.configBusy.set(true);
    this.configMessage.set('');
    this.error.set('');
    this.api.updateFraudConfig(body).subscribe({
      next: ({ fraudConfig }) => {
        this.applyFraudConfigToForm(fraudConfig as Record<string, unknown>);
        this.configBusy.set(false);
        this.configMessage.set('Configuration fraude enregistrée (PUT /api/config/fraud).');
      },
      error: (e: HttpErrorResponse) => {
        this.configBusy.set(false);
        this.error.set(e.error?.error || e.message || 'Sauvegarde impossible.');
      },
    });
  }

  onFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    this.uploadFile = f ?? null;
  }

  runUpload(): void {
    if (!this.uploadFile) {
      this.error.set('Choisissez un fichier PDF.');
      return;
    }
    this.uploadBusy.set(true);
    this.uploadMessage.set('');
    this.error.set('');
    this.api.uploadDocument(this.uploadFile, this.forceDocTypeFacture ? 'facture' : undefined).subscribe({
      next: (res: Record<string, unknown>) => {
        this.uploadBusy.set(false);
        if (res['success'] === true && res['document']) {
          const doc = res['document'] as Record<string, unknown>;
          const id = String(doc['id'] ?? '');
          this.documentIdInput = id;
          this.documentPayload.set(doc);
          this.scanResult.set(null);
          this.uploadMessage.set(
            `POST /api/documents/upload OK — type ${String(doc['docType'] ?? doc['type'] ?? '?')}, id ${id}.`
          );
          return;
        }
        this.uploadMessage.set(
          `Réponse inattendue (classification ou doublon en attente). Voir la console métier ou l’onglet Documents. Détails : ${JSON.stringify(res).slice(0, 400)}…`
        );
      },
      error: (e: HttpErrorResponse) => {
        this.uploadBusy.set(false);
        this.error.set(e.error?.error || e.message || 'Upload échoué.');
      },
    });
  }

  fetchDocument(): void {
    const id = this.documentIdInput.trim();
    if (!id) {
      this.error.set('Indiquez un id document.');
      return;
    }
    this.docBusy.set(true);
    this.error.set('');
    this.api.getDocument(id).subscribe({
      next: (doc) => {
        this.docBusy.set(false);
        this.documentPayload.set(doc as Record<string, unknown>);
      },
      error: (e: HttpErrorResponse) => {
        this.docBusy.set(false);
        this.error.set(e.error?.error || e.message || 'GET /api/documents/:id impossible.');
      },
    });
  }

  runFraudScan(skipLlm: boolean): void {
    const id = this.documentIdInput.trim();
    if (!id) {
      this.error.set('Indiquez un id document.');
      return;
    }
    this.scanBusy.set(true);
    this.error.set('');
    this.scanResult.set(null);
    this.api.fraudScan(id, { skipLlm }).subscribe({
      next: (res) => {
        this.scanBusy.set(false);
        this.scanResult.set(res as unknown as Record<string, unknown>);
        if (res.document) {
          this.documentPayload.set(res.document as Record<string, unknown>);
        }
      },
      error: (e: HttpErrorResponse) => {
        this.scanBusy.set(false);
        const msg =
          typeof e.error === 'object' && e.error && 'error' in e.error
            ? String((e.error as { error: string }).error)
            : e.message;
        this.error.set(msg || 'POST fraud-scan impossible.');
      },
    });
  }

  /** Démo : inject sans PDF puis tentative de scan → 400 attendu. */
  runInjectDemo(): void {
    this.injectBusy.set(true);
    this.injectDemoMessage.set('');
    this.error.set('');
    this.api
      .injectDocuments([
        {
          docType: 'facture',
          type: 'facture',
          fournisseur: 'Fournisseur démo inject',
          reference: 'INJ-001',
          montant: 100,
          date: new Date().toISOString().slice(0, 10),
        },
      ])
      .subscribe({
        next: (inj) => {
          const id = inj.ids[0];
          this.injectDemoMessage.set(`Inject OK — id ${id}. Tentative fraud-scan…`);
          this.api.fraudScan(id, { skipLlm: true }).subscribe({
            next: () => {
              this.injectBusy.set(false);
              this.injectDemoMessage.set('Unexpected: scan should have failed without PDF.');
            },
            error: (e: HttpErrorResponse) => {
              this.injectBusy.set(false);
              const msg =
                typeof e.error === 'object' && e.error && 'error' in e.error
                  ? String((e.error as { error: string }).error)
                  : e.message;
              this.injectDemoMessage.set(
                `Comportement attendu : fraud-scan renvoie une erreur sans PDF stocké — ${msg || e.status}`
              );
            },
          });
        },
        error: (e: HttpErrorResponse) => {
          this.injectBusy.set(false);
          this.error.set(e.error?.error || e.message || 'Inject impossible.');
        },
      });
  }

  fraudAnalysisView(): Record<string, unknown> | null {
    const d = this.documentPayload();
    const fa = d?.['fraudAnalysis'];
    if (fa && typeof fa === 'object') return fa as Record<string, unknown>;
    return null;
  }

  /**
   * Liste les documents via GET /api/documents, puis pour chaque id appelle POST fraud-scan (skipLlm).
   * Les documents sans PDF en Redis sont ignorés. Ne garde que ceux avec signaux ou gravité ≠ none.
   */
  async scanAllExistingDocuments(): Promise<void> {
    this.bulkScanBusy.set(true);
    this.bulkScanProgress.set(null);
    this.bulkScanResults.set([]);
    this.bulkScanStats.set(null);
    this.error.set('');
    try {
      const docs = await firstValueFrom(
        this.api.getDocuments(this.bulkScanOnlyFactures ? 'facture' : undefined)
      );
      const total = docs.length;
      let analyzed = 0;
      let skipped = 0;
      const flagged: DocumentWithFraudRow[] = [];

      for (let idx = 0; idx < docs.length; idx++) {
        const d = docs[idx];
        this.bulkScanProgress.set({ current: idx + 1, total });
        const id = String(d?.['id'] ?? '');
        if (!id) continue;
        try {
          const res = await firstValueFrom(this.api.fraudScan(id, { skipLlm: true }));
          analyzed += 1;
          const doc = res.document as Record<string, unknown>;
          const fa = res.fraudAnalysis as Record<string, unknown> | undefined;
          if (!fa || typeof fa !== 'object') continue;
          const signalsRaw = fa['signals'];
          const signals = this.normalizeSignals(signalsRaw);
          const maxSev = String(fa['maxSeverity'] ?? 'none');
          if (signals.length === 0 && maxSev === 'none') continue;

          flagged.push({
            id,
            fileName: String(doc['fileName'] ?? d['fileName'] ?? ''),
            fournisseur: String(doc['fournisseur'] ?? d['fournisseur'] ?? ''),
            reference: String(doc['reference'] ?? d['reference'] ?? ''),
            date: doc['date'] != null ? String(doc['date']) : d['date'] != null ? String(d['date']) : undefined,
            docType: String(doc['docType'] ?? doc['type'] ?? d['docType'] ?? d['type'] ?? ''),
            maxSeverity: maxSev,
            summary: fa['summary'] != null ? String(fa['summary']) : undefined,
            llmNote: fa['llmNote'] != null ? String(fa['llmNote']) : undefined,
            scannedAt: fa['scannedAt'] != null ? String(fa['scannedAt']) : undefined,
            signals,
          });
        } catch {
          skipped += 1;
        }
      }

      this.bulkScanResults.set(flagged);
      this.bulkScanStats.set({
        total,
        analyzed,
        skipped,
        withFraud: flagged.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof HttpErrorResponse ? e.error?.error || e.message : String(e);
      this.error.set(msg || 'Impossible de lister ou analyser les documents.');
    } finally {
      this.bulkScanBusy.set(false);
      this.bulkScanProgress.set(null);
    }
  }

  severityClass(sev: string): string {
    const s = (sev || '').toLowerCase();
    if (s === 'high') return 'fraud-sev fraud-sev--high';
    if (s === 'medium') return 'fraud-sev fraud-sev--medium';
    if (s === 'low') return 'fraud-sev fraud-sev--low';
    return 'fraud-sev fraud-sev--none';
  }

  private normalizeSignals(signalsRaw: unknown): FraudSignalDisplay[] {
    if (!Array.isArray(signalsRaw)) return [];
    const out: FraudSignalDisplay[] = [];
    for (const s of signalsRaw) {
      if (!s || typeof s !== 'object') continue;
      const o = s as Record<string, unknown>;
      const evidence = o['evidence'];
      out.push({
        kind: String(o['kind'] ?? ''),
        code: String(o['code'] ?? ''),
        severity: String(o['severity'] ?? ''),
        evidence: Array.isArray(evidence) ? evidence.map((x) => String(x)) : [],
      });
    }
    return out;
  }

  jsonPretty(v: unknown): string {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
}
