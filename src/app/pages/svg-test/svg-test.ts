import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

declare const Vivus: any;

@Component({
  selector: 'app-svg-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './svg-test.html',
  styleUrl: './svg-test.scss'
})
export class SvgTestComponent implements AfterViewInit {
  private svgIds = ['svg-devis', 'svg-bc', 'svg-bl', 'svg-br', 'svg-facture', 'svg-paiement', 'svg-email', 'svg-chain'];
  private instances: any[] = [];

  ngAfterViewInit() {
    setTimeout(() => this.initVivus(), 300);
  }

  initVivus() {
    this.instances = [];
    for (const id of this.svgIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      try {
        const v = new Vivus(id, {
          type: 'delayed',
          duration: 100,
          animTimingFunction: Vivus.EASE_OUT,
          start: 'inViewport',
        });
        this.instances.push(v);
      } catch (_) {}
    }
  }

  replayAll() {
    for (const v of this.instances) {
      try { v.reset().play(); } catch (_) {}
    }
  }
}
