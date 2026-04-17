import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { ApiService } from '../../services/api.service';
import { ImportSocketService } from '../../services/import-socket.service';
import { ImportUiBlockService } from '../../services/import-ui-block.service';

@Component({
  selector: 'app-mouvements',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxSpinnerModule],
  templateUrl: './mouvements.html',
  styleUrl: './mouvements.scss'
})
export class MouvementsComponent implements OnInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);
  private importUiBlock = inject(ImportUiBlockService);
  readonly importSocket = inject(ImportSocketService);

  mouvements = signal<any[]>([]);
  error = signal('');

  page = signal(1);
  pageSize = 10;
  totalPages = computed(() => Math.max(1, Math.ceil(this.mouvements().length / this.pageSize)));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.mouvements().slice(start, start + this.pageSize);
  });
  pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  setPage(p: number) { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }

  /** Overlay progression import CSV (Socket.io) */
  importingCsv = signal(false);

  form = {
    libelle: '',
    reference: '',
    montant: null as number | null,
    date: '',
    type_mouvement: 'sortie',
  };

  constructor() {
    effect((onCleanup) => {
      if (!this.importingCsv()) return;
      this.importUiBlock.acquire();
      onCleanup(() => this.importUiBlock.release());
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.spinner.show('mouvements');
    this.api.getMouvements().subscribe({
      next: (data) => { this.mouvements.set(data); this.page.set(1); this.spinner.hide('mouvements'); },
      error: () => this.spinner.hide('mouvements')
    });
  }

  addMouvement() {
    this.error.set('');
    this.api.createMouvement(this.form).subscribe({
      next: () => {
        this.form = { libelle: '', reference: '', montant: null, date: '', type_mouvement: 'sortie' };
        this.load();
      },
      error: (err) => this.error.set(err.error?.error || 'Erreur lors de la creation')
    });
  }

  delete(id: string) {
    this.api.deleteMouvement(id).subscribe(() => this.load());
  }

  clearing = signal(false);
  seeding = signal(false);

  clearAll() {
    Swal.fire({
      icon: 'warning',
      title: 'Vider toutes les données ?',
      text: 'Documents, mouvements, rapprochements et sessions IA seront supprimés définitivement.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Annuler',
      confirmButtonText: 'Vider',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.clearing.set(true);
      this.api.clearAllData().subscribe({
        next: (res) => {
          this.clearing.set(false);
          this.mouvements.set([]);
          Swal.fire({ icon: 'success', title: 'Données vidées', text: `${res.deleted} entrées supprimées.`, timer: 2500, showConfirmButton: false, toast: true, position: 'top-end' });
        },
        error: () => {
          this.clearing.set(false);
          Swal.fire({ icon: 'error', title: 'Erreur', text: 'Impossible de vider les données.', timer: 3000, showConfirmButton: false, toast: true, position: 'top-end' });
        },
      });
    });
  }

  reloadSeeds() {
    this.seeding.set(true);
    this.api.reloadSeeds().subscribe({
      next: () => {
        this.load();
        this.seeding.set(false);
        Swal.fire({ icon: 'success', title: 'Données de démonstration chargées', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
      },
      error: () => {
        this.seeding.set(false);
        Swal.fire({ icon: 'error', title: 'Erreur', text: 'Le chargement a échoué.', timer: 3000, showConfirmButton: false, toast: true, position: 'top-end' });
      },
    });
  }

  async onCsvSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    this.importSocket.clearProgress();
    try {
      await this.importSocket.ensureSocket();
    } catch {
      /* progression impossible sans socket ; l’import HTTP peut quand même réussir */
    }

    this.importingCsv.set(true);
    this.api.importMouvementsCsv(file).subscribe({
      next: (res) => {
        this.importingCsv.set(false);
        this.importSocket.clearProgress();
        this.load();
        const w = res.warnings?.length ? ` (${res.warnings.length} ligne(s) ignorée(s))` : '';
        alert(`Import : ${res.count} mouvement(s) ajouté(s)${w}.`);
      },
      error: (err) => {
        this.importingCsv.set(false);
        this.importSocket.clearProgress();
        const msg = err.error?.error || err.error?.parseErrors?.join?.('\n') || 'Import CSV échoué';
        this.error.set(typeof msg === 'string' ? msg : JSON.stringify(err.error));
      },
    });
  }
}
