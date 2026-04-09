import { Component, OnInit, AfterViewInit, inject, signal } from '@angular/core';
declare const Vivus: any;
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  stats = signal<any>(null);

  ngOnInit() {
    this.api.getStats().subscribe({ next: (data) => this.stats.set(data) });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      for (const id of ['svg-dash-invoice', 'svg-dash-bank', 'svg-dash-match']) {
        try { new Vivus(id, { type: 'delayed', duration: 100, animTimingFunction: Vivus.EASE_OUT }); } catch (_) {}
      }
    }, 200);
  }
}
