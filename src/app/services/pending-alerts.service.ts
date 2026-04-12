import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService, type PendingListItem } from './api.service';

/** Doublon en attente : flag explicite ou anciennes entrées Redis avec seulement `similarity`. */
export function isDuplicatePending(i: PendingListItem): boolean {
  if (i.pendingKind === 'duplicate') return true;
  const dup = i.similarity?.duplicateId;
  return typeof dup === 'string' && dup.length > 0;
}

@Injectable({ providedIn: 'root' })
export class PendingAlertsService {
  private api = inject(ApiService);

  /** Tous les imports provisoires (liste brute API). */
  readonly allPendingItems = signal<PendingListItem[]>([]);

  /** Sous-ensemble doublons — même logique que l’onglet « Doublons suspects ». */
  readonly duplicateItems = computed(() => this.allPendingItems().filter((i) => isDuplicatePending(i)));

  readonly duplicateCount = computed(() => this.duplicateItems().length);

  refreshFromItems(items: PendingListItem[]) {
    this.allPendingItems.set(items);
  }

  refresh() {
    this.api.getPendingList().subscribe({
      next: (res) => this.refreshFromItems(res.items),
      error: () => this.allPendingItems.set([]),
    });
  }
}
