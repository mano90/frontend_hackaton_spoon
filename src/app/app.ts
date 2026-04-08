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
          <li><a routerLink="/dashboard" routerLinkActive="active">Tableau de bord</a></li>
          <li><a routerLink="/factures" routerLinkActive="active">Factures</a></li>
          <li><a routerLink="/mouvements" routerLinkActive="active">Mouvements</a></li>
          <li><a routerLink="/rapprochement" routerLinkActive="active">Rapprochement</a></li>
          <li><a routerLink="/query" routerLinkActive="active">Assistant IA</a></li>
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
