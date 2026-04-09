import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="logo">
          <h2>FactureMatch</h2>
          <span class="tagline">Rapprochement IA</span>
        </div>
        <ul class="nav-links">
          <li><a routerLink="/dashboard" routerLinkActive="active"><i class="fas fa-tachometer-alt"></i> Tableau de bord</a></li>
          <li class="nav-section">Documents</li>
          <li><a routerLink="/devis" routerLinkActive="active"><i class="fas fa-file-invoice"></i> Devis</a></li>
          <li><a routerLink="/bons-commande" routerLinkActive="active"><i class="fas fa-box"></i> Bons de commande</a></li>
          <li><a routerLink="/bons-livraison" routerLinkActive="active"><i class="fas fa-truck"></i> Bons de livraison</a></li>
          <li><a routerLink="/bons-reception" routerLinkActive="active"><i class="fas fa-clipboard-check"></i> Bons de reception</a></li>
          <li><a routerLink="/factures" routerLinkActive="active"><i class="fas fa-file-invoice-dollar"></i> Factures</a></li>
          <li class="nav-section">Banque</li>
          <li><a routerLink="/mouvements" routerLinkActive="active"><i class="fas fa-university"></i> Mouvements</a></li>
          <li><a routerLink="/rapprochement" routerLinkActive="active"><i class="fas fa-link"></i> Rapprochement</a></li>
          <li class="nav-section">Communication</li>
          <li><a routerLink="/emails" routerLinkActive="active"><i class="fas fa-envelope"></i> Emails</a></li>
          <li class="nav-section">Analyse</li>
          <li><a routerLink="/timeline" routerLinkActive="active"><i class="fas fa-stream"></i> Timeline</a></li>
          <li><a routerLink="/query" routerLinkActive="active"><i class="fas fa-robot"></i> Assistant IA</a></li>
          <li><a routerLink="/svg-test" routerLinkActive="active"><i class="fas fa-pen-nib"></i> SVG Animations</a></li>
        </ul>
      </nav>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styleUrl: './app.scss'
})
export class App {}
