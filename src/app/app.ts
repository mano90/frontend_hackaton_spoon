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
          <li class="nav-section">Gestion</li>
          <li><a routerLink="/documents" routerLinkActive="active"><i class="fas fa-folder-open"></i> Documents</a></li>
          <li><a routerLink="/mouvements" routerLinkActive="active"><i class="fas fa-university"></i> Mouvements</a></li>
          <li><a routerLink="/rapprochement" routerLinkActive="active"><i class="fas fa-link"></i> Rapprochement</a></li>
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
