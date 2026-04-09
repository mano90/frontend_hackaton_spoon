import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

declare const Vivus: any;

@Component({
  selector: 'app-svg-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1><i class="fas fa-pen-nib"></i> Vivus SVG Animations</h1>
      <p class="subtitle">Chaque SVG est dessine avec une animation Vivus.js</p>

      <div class="grid">
        <!-- Devis -->
        <div class="card">
          <div class="svg-box">
            <svg id="svg-devis" viewBox="0 0 120 120" fill="none">
              <rect x="20" y="10" width="80" height="100" rx="8" stroke="#6366f1" stroke-width="4"/>
              <line x1="35" y1="35" x2="85" y2="35" stroke="#6366f1" stroke-width="3"/>
              <line x1="35" y1="50" x2="85" y2="50" stroke="#6366f1" stroke-width="3"/>
              <line x1="35" y1="65" x2="70" y2="65" stroke="#6366f1" stroke-width="3"/>
              <line x1="35" y1="80" x2="60" y2="80" stroke="#6366f1" stroke-width="3"/>
              <circle cx="75" cy="80" r="10" stroke="#6366f1" stroke-width="3"/>
              <polyline points="71,80 74,84 80,76" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3><i class="fas fa-file-invoice" style="color:#6366f1"></i> Demande de Devis</h3>
          <p>Document initial de demande de prix</p>
        </div>

        <!-- Bon de commande -->
        <div class="card">
          <div class="svg-box">
            <svg id="svg-bc" viewBox="0 0 120 120" fill="none">
              <rect x="15" y="25" width="90" height="70" rx="6" stroke="#3b82f6" stroke-width="4"/>
              <polyline points="15,40 60,15 105,40" stroke="#3b82f6" stroke-width="4" stroke-linejoin="round"/>
              <line x1="35" y1="55" x2="85" y2="55" stroke="#3b82f6" stroke-width="3"/>
              <line x1="35" y1="68" x2="75" y2="68" stroke="#3b82f6" stroke-width="3"/>
              <line x1="35" y1="81" x2="65" y2="81" stroke="#3b82f6" stroke-width="3"/>
            </svg>
          </div>
          <h3><i class="fas fa-box" style="color:#3b82f6"></i> Bon de Commande</h3>
          <p>Confirmation de commande</p>
        </div>

        <!-- Bon de livraison -->
        <div class="card">
          <div class="svg-box">
            <svg id="svg-bl" viewBox="0 0 120 120" fill="none">
              <rect x="5" y="30" width="65" height="45" rx="5" stroke="#f59e0b" stroke-width="4"/>
              <path d="M70,30 L70,75 L110,75 L110,50 L95,30 Z" stroke="#f59e0b" stroke-width="4" stroke-linejoin="round"/>
              <line x1="70" y1="50" x2="95" y2="50" stroke="#f59e0b" stroke-width="3"/>
              <circle cx="28" cy="82" r="10" stroke="#f59e0b" stroke-width="4"/>
              <circle cx="90" cy="82" r="10" stroke="#f59e0b" stroke-width="4"/>
              <line x1="38" y1="75" x2="80" y2="75" stroke="#f59e0b" stroke-width="3"/>
            </svg>
          </div>
          <h3><i class="fas fa-truck" style="color:#f59e0b"></i> Bon de Livraison</h3>
          <p>Confirmation d'expedition</p>
        </div>

        <!-- Bon de reception -->
        <div class="card">
          <div class="svg-box">
            <svg id="svg-br" viewBox="0 0 120 120" fill="none">
              <rect x="25" y="15" width="70" height="90" rx="8" stroke="#22c55e" stroke-width="4"/>
              <rect x="42" y="6" width="36" height="18" rx="4" stroke="#22c55e" stroke-width="3"/>
              <polyline points="42,65 52,76 78,48" stroke="#22c55e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="38" y1="88" x2="82" y2="88" stroke="#22c55e" stroke-width="3"/>
            </svg>
          </div>
          <h3><i class="fas fa-clipboard-check" style="color:#22c55e"></i> Bon de Reception</h3>
          <p>Validation de reception conforme</p>
        </div>

        <!-- Facture -->
        <div class="card">
          <div class="svg-box">
            <svg id="svg-facture" viewBox="0 0 120 120" fill="none">
              <rect x="20" y="10" width="80" height="100" rx="8" stroke="#ef4444" stroke-width="4"/>
              <circle cx="60" cy="45" r="16" stroke="#ef4444" stroke-width="3.5"/>
              <text x="54" y="50" font-size="16" font-weight="bold" fill="none" stroke="#ef4444" stroke-width="1.5">€</text>
              <line x1="35" y1="75" x2="85" y2="75" stroke="#ef4444" stroke-width="3"/>
              <line x1="35" y1="88" x2="70" y2="88" stroke="#ef4444" stroke-width="3"/>
              <line x1="35" y1="98" x2="55" y2="98" stroke="#ef4444" stroke-width="3"/>
            </svg>
          </div>
          <h3><i class="fas fa-file-invoice-dollar" style="color:#ef4444"></i> Facture</h3>
          <p>Document de facturation</p>
        </div>

        <!-- Paiement -->
        <div class="card">
          <div class="svg-box">
            <svg id="svg-paiement" viewBox="0 0 120 120" fill="none">
              <rect x="10" y="30" width="100" height="60" rx="8" stroke="#8b5cf6" stroke-width="4"/>
              <line x1="10" y1="50" x2="110" y2="50" stroke="#8b5cf6" stroke-width="3"/>
              <line x1="25" y1="65" x2="60" y2="65" stroke="#8b5cf6" stroke-width="3"/>
              <line x1="25" y1="78" x2="50" y2="78" stroke="#8b5cf6" stroke-width="3"/>
              <circle cx="90" cy="72" r="12" stroke="#8b5cf6" stroke-width="3"/>
              <circle cx="80" cy="72" r="12" stroke="#8b5cf6" stroke-width="3"/>
            </svg>
          </div>
          <h3><i class="fas fa-university" style="color:#8b5cf6"></i> Paiement</h3>
          <p>Mouvement bancaire</p>
        </div>

        <!-- Email -->
        <div class="card">
          <div class="svg-box">
            <svg id="svg-email" viewBox="0 0 120 120" fill="none">
              <rect x="10" y="25" width="100" height="70" rx="8" stroke="#64748b" stroke-width="4"/>
              <polyline points="10,25 60,65 110,25" stroke="#64748b" stroke-width="4" stroke-linejoin="round"/>
              <line x1="10" y1="95" x2="40" y2="60" stroke="#64748b" stroke-width="3"/>
              <line x1="110" y1="95" x2="80" y2="60" stroke="#64748b" stroke-width="3"/>
            </svg>
          </div>
          <h3><i class="fas fa-envelope" style="color:#64748b"></i> Email</h3>
          <p>Echange de correspondance</p>
        </div>

        <!-- Chain flow -->
        <div class="card chain-card">
          <div class="svg-box wide">
            <svg id="svg-chain" viewBox="0 0 500 80" fill="none">
              <!-- Flow: Devis -> BC -> BL -> BR -> Facture -> Paiement -->
              <circle cx="40" cy="40" r="18" stroke="#6366f1" stroke-width="3"/>
              <text x="34" y="45" font-size="12" fill="none" stroke="#6366f1" stroke-width="1">DD</text>
              <line x1="58" y1="40" x2="102" y2="40" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>
              <circle cx="120" cy="40" r="18" stroke="#3b82f6" stroke-width="3"/>
              <text x="112" y="45" font-size="12" fill="none" stroke="#3b82f6" stroke-width="1">BC</text>
              <line x1="138" y1="40" x2="182" y2="40" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>
              <circle cx="200" cy="40" r="18" stroke="#f59e0b" stroke-width="3"/>
              <text x="193" y="45" font-size="12" fill="none" stroke="#f59e0b" stroke-width="1">BL</text>
              <line x1="218" y1="40" x2="262" y2="40" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>
              <circle cx="280" cy="40" r="18" stroke="#22c55e" stroke-width="3"/>
              <text x="272" y="45" font-size="12" fill="none" stroke="#22c55e" stroke-width="1">BR</text>
              <line x1="298" y1="40" x2="342" y2="40" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>
              <circle cx="360" cy="40" r="18" stroke="#ef4444" stroke-width="3"/>
              <text x="348" y="45" font-size="12" fill="none" stroke="#ef4444" stroke-width="1">FAC</text>
              <line x1="378" y1="40" x2="422" y2="40" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6,4"/>
              <circle cx="440" cy="40" r="18" stroke="#8b5cf6" stroke-width="3"/>
              <text x="432" y="45" font-size="12" fill="none" stroke="#8b5cf6" stroke-width="1">PAY</text>
            </svg>
          </div>
          <h3><i class="fas fa-project-diagram" style="color:#6366f1"></i> Chaine documentaire</h3>
          <p>Devis → Commande → Livraison → Reception → Facture → Paiement</p>
        </div>
      </div>

      <button class="btn-replay" (click)="replayAll()"><i class="fas fa-redo"></i> Rejouer les animations</button>
    </div>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; color: #1e293b; }
    h1 i { margin-right: 0.5rem; color: #6366f1; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }

    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem; margin-bottom: 2rem;
    }

    .card {
      background: white; border-radius: 14px; padding: 1.5rem; text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.3s, box-shadow 0.3s;
    }
    .card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    .card h3 { margin: 0.75rem 0 0.25rem; font-size: 1rem; color: #1e293b; }
    .card h3 i { margin-right: 0.4rem; }
    .card p { margin: 0; font-size: 0.85rem; color: #94a3b8; }

    .chain-card { grid-column: 1 / -1; }

    .svg-box { width: 100px; height: 100px; margin: 0 auto; }
    .svg-box svg { width: 100%; height: 100%; }
    .svg-box.wide { width: 100%; height: 80px; }

    .btn-replay {
      background: #6366f1; color: white; border: none; padding: 0.75rem 1.5rem;
      border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;
      display: block; margin: 0 auto;
    }
    .btn-replay:hover { background: #4f46e5; }
    .btn-replay i { margin-right: 0.5rem; }
  `]
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
