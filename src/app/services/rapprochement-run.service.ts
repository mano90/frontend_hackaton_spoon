import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class RapprochementRunService {
  private api = inject(ApiService);

  running       = signal(false);
  progressTotal   = signal(0);
  progressCurrent = signal(0);
  progressCurrentLabel = signal('');
  statsExact    = signal(0);
  statsPartial  = signal(0);
  statsNoMatch  = signal(0);
  error         = signal('');

  progressPercent = computed(() => {
    const total = this.progressTotal();
    if (total === 0) return 0;
    return Math.round((this.progressCurrent() / total) * 100);
  });

  /** Map id → mouvement pour résoudre les libellés dans le label de progression. */
  private mouvementsCache: Record<string, any> = {};

  async runAll(): Promise<void> {
    if (this.running()) return;

    this.running.set(true);
    this.error.set('');
    this.progressCurrent.set(0);
    this.progressTotal.set(0);
    this.statsExact.set(0);
    this.statsPartial.set(0);
    this.statsNoMatch.set(0);
    this.progressCurrentLabel.set('Récupération des mouvements…');

    try {
      // Précharger les mouvements pour les libellés
      this.api.getMouvements().subscribe({
        next: (mvs) => {
          this.mouvementsCache = Object.fromEntries(mvs.map((m: any) => [m.id, m]));
        },
      });

      const { ids } = await firstValueFrom(this.api.getSortieIds());
      this.progressTotal.set(ids.length);

      if (ids.length === 0) {
        this.error.set('Aucun mouvement à traiter.');
        this.running.set(false);
        return;
      }

      for (let i = 0; i < ids.length; i++) {
        const mv = this.mouvementsCache[ids[i]];
        const label = mv?.libelle || mv?.reference || `mouvement ${i + 1}`;
        this.progressCurrentLabel.set(`Analyse : ${label}`);

        try {
          const res = await firstValueFrom(this.api.runRapprochement(ids[i]));
          if (res?.rapprochement) {
            const status = res.rapprochement.status;
            if (status === 'exact')        this.statsExact.update(v => v + 1);
            else if (status === 'partial') this.statsPartial.update(v => v + 1);
            else                           this.statsNoMatch.update(v => v + 1);
          }
        } catch {
          this.statsNoMatch.update(v => v + 1);
        }
        this.progressCurrent.set(i + 1);
      }

      this.progressCurrentLabel.set('Terminé !');
      await new Promise(r => setTimeout(r, 1200));
    } catch (err: any) {
      this.error.set(err?.error?.error || 'Erreur lors du rapprochement');
    } finally {
      this.running.set(false);
    }
  }
}
