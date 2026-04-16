import { Injectable, signal } from '@angular/core';

/**
 * Service singleton (providedIn: 'root') qui conserve l'état de la page M3
 * pendant toute la session front-end, même si le composant est détruit lors
 * d'un changement d'écran.
 */
@Injectable({ providedIn: 'root' })
export class M3StateService {
  // ── Sélection programme / transaction ────────────────────────────────────
  program        = signal('');
  programSearch  = signal('');
  transaction    = signal('');
  transactionSearch = signal('');
  paramsRaw      = signal('CONO=1');
  maxrecs        = signal(100);
  returncols     = signal('');

  // ── Listes chargées depuis M3 ─────────────────────────────────────────────
  programs      = signal<{ PGNM: string; TX40: string }[]>([]);
  transactions  = signal<{ TRNM: string; TX40: string }[]>([]);

  // ── Résultat de la dernière exécution ─────────────────────────────────────
  result        = signal<any>(null);
  execError     = signal('');

  // ── Résultat du dernier chargement en base ────────────────────────────────
  chargeResult  = signal<{
    count: number;
    pendingDuplicateCount?: number;
  } | null>(null);
  chargeError   = signal('');

  // ── Erreurs de chargement listes ──────────────────────────────────────────
  programsError     = signal('');
  transactionsError = signal('');

  // ── Mapping champs M3 → champs app ────────────────────────────────────────
  fieldMapping = signal<Record<string, string>>({
    montant:     '',
    date:        '',
    fournisseur: '',
    reference:   '',
    fileName:    '',
  });
}
