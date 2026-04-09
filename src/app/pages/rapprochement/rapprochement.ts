import { Component, OnInit, AfterViewInit, inject, signal, computed } from '@angular/core';
declare const Vivus: any;
import { CommonModule } from '@angular/common';
import { NgxSpinnerModule } from 'ngx-spinner';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-rapprochement',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  templateUrl: './rapprochement.html',
  styleUrl: './rapprochement.scss'
})
export class RapprochementComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);

  rapprochements = signal<any[]>([]);
  running = signal(false);
  error = signal('');

  progressTotal = signal(0);
  progressCurrent = signal(0);
  progressCurrentLabel = signal('');
  statsExact = signal(0);
  statsPartial = signal(0);
  statsNoMatch = signal(0);

  progressPercent = computed(() => {
    const total = this.progressTotal();
    if (total === 0) return 0;
    return Math.round((this.progressCurrent() / total) * 100);
  });

  ngOnInit() { this.load(); }

  ngAfterViewInit() {
    setTimeout(() => {
      try { new Vivus('svg-rapp-empty', { type: 'delayed', duration: 100, animTimingFunction: Vivus.EASE_OUT }); } catch (_) {}
    }, 200);
  }

  load() {
    this.api.getRapprochements().subscribe({
      next: (data) => this.rapprochements.set(data),
    });
  }

  confirm(id: string) {
    this.api.confirmRapprochement(id).subscribe(() => this.load());
  }

  reject(id: string) {
    this.api.deleteRapprochement(id).subscribe(() => this.load());
  }

  async runAll() {
    this.running.set(true);
    this.error.set('');
    this.progressCurrent.set(0);
    this.statsExact.set(0);
    this.statsPartial.set(0);
    this.statsNoMatch.set(0);
    this.progressCurrentLabel.set('Recuperation des mouvements...');

    try {
      // Get all sortie mouvement IDs
      const { ids } = await firstValueFrom(this.api.getSortieIds());
      this.progressTotal.set(ids.length);

      if (ids.length === 0) {
        this.running.set(false);
        this.error.set('Aucun mouvement de type sortie a traiter.');
        return;
      }

      // Process one by one
      for (let i = 0; i < ids.length; i++) {
        this.progressCurrentLabel.set(`Analyse du mouvement ${i + 1} / ${ids.length}...`);
        try {
          const res = await firstValueFrom(this.api.runRapprochement(ids[i]));
          if (res?.rapprochement) {
            const status = res.rapprochement.status;
            if (status === 'exact') this.statsExact.update(v => v + 1);
            else if (status === 'partial') this.statsPartial.update(v => v + 1);
            else this.statsNoMatch.update(v => v + 1);
          }
        } catch {
          this.statsNoMatch.update(v => v + 1);
        }
        this.progressCurrent.set(i + 1);
      }

      this.progressCurrentLabel.set('Termine !');
      // Brief pause so user sees 100%
      await new Promise(r => setTimeout(r, 800));
      this.running.set(false);
      this.load();
    } catch (err: any) {
      this.running.set(false);
      this.error.set(err?.error?.error || 'Erreur lors du rapprochement');
    }
  }
}
