import { Component, AfterViewInit, inject, signal } from '@angular/core';
declare const Vivus: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-query',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxSpinnerModule],
  templateUrl: './query.html',
  styleUrl: './query.scss'
})
export class QueryComponent implements AfterViewInit {
  private api = inject(ApiService);
  private spinner = inject(NgxSpinnerService);

  queryText = '';
  loading = signal(false);

  ngAfterViewInit() {
    setTimeout(() => {
      try { new Vivus('svg-query-brain', { type: 'delayed', duration: 120, animTimingFunction: Vivus.EASE_OUT }); } catch (_) {}
    }, 200);
  }
  history = signal<{ question: string; answer: string; sources: string[] }[]>([]);

  ask() {
    const q = this.queryText.trim();
    if (!q) return;

    this.loading.set(true);
    this.spinner.show('query');
    this.queryText = '';

    this.api.query(q).subscribe({
      next: (res) => {
        this.history.update(h => [{ question: q, answer: res.answer, sources: res.sources || [] }, ...h]);
        this.loading.set(false);
        this.spinner.hide('query');
      },
      error: () => {
        this.history.update(h => [{ question: q, answer: 'Erreur lors de la requête.', sources: [] }, ...h]);
        this.loading.set(false);
        this.spinner.hide('query');
      }
    });
  }
}
