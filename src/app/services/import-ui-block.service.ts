import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Verrouille le défilement et permet un style global (backdrop plein écran)
 * pendant un import CSV ou un envoi de documents.
 */
@Injectable({ providedIn: 'root' })
export class ImportUiBlockService {
  private readonly doc = inject(DOCUMENT);
  private count = 0;

  acquire(): void {
    this.count++;
    if (this.count === 1) {
      this.doc.documentElement.classList.add('ui-import-blocking');
      this.doc.body.classList.add('ui-import-blocking');
    }
  }

  release(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      this.doc.documentElement.classList.remove('ui-import-blocking');
      this.doc.body.classList.remove('ui-import-blocking');
    }
  }
}
