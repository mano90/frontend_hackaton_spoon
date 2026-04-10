import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from './services/layout.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <nav class="sidebar" [class.collapsed]="layout.sidebarCollapsed()">
        <div class="logo">
          <div class="logo-row">
            <div class="brand">
              <h2>FactureMatch</h2>
              <span class="tagline">Rapprochement IA</span>
            </div>
            <button
              type="button"
              class="collapse-btn"
              (click)="layout.toggleSidebar()"
              [attr.aria-label]="layout.sidebarCollapsed() ? 'Etendre la barre laterale' : 'Reduire la barre laterale'"
              [attr.title]="layout.sidebarCollapsed() ? 'Etendre' : 'Reduire'"
            >
              <i class="fas" [class.fa-chevron-right]="layout.sidebarCollapsed()" [class.fa-chevron-left]="!layout.sidebarCollapsed()"></i>
            </button>
          </div>
        </div>
        <ul class="nav-links">
          <li>
            <a routerLink="/dashboard" routerLinkActive="active" [attr.title]="layout.sidebarCollapsed() ? 'Tableau de bord' : null">
              <i class="fas fa-tachometer-alt"></i><span class="link-text">Tableau de bord</span>
            </a>
          </li>
          <li class="nav-section"><span class="section-text">Gestion</span></li>
          <li>
            <a routerLink="/documents" routerLinkActive="active" [attr.title]="layout.sidebarCollapsed() ? 'Documents' : null">
              <i class="fas fa-folder-open"></i><span class="link-text">Documents</span>
            </a>
          </li>
          <li>
            <a routerLink="/mouvements" routerLinkActive="active" [attr.title]="layout.sidebarCollapsed() ? 'Mouvements' : null">
              <i class="fas fa-university"></i><span class="link-text">Mouvements</span>
            </a>
          </li>
          <li>
            <a routerLink="/rapprochement" routerLinkActive="active" [attr.title]="layout.sidebarCollapsed() ? 'Rapprochement' : null">
              <i class="fas fa-link"></i><span class="link-text">Rapprochement</span>
            </a>
          </li>
          <li class="nav-section"><span class="section-text">Analyse</span></li>
          <li>
            <a routerLink="/timeline" routerLinkActive="active" [attr.title]="layout.sidebarCollapsed() ? 'Timeline' : null">
              <i class="fas fa-stream"></i><span class="link-text">Timeline</span>
            </a>
          </li>
          <li>
            <a routerLink="/query" routerLinkActive="active" [attr.title]="layout.sidebarCollapsed() ? 'Assistant IA' : null">
              <i class="fas fa-robot"></i><span class="link-text">Assistant IA</span>
            </a>
          </li>
          <li>
            <a routerLink="/svg-test" routerLinkActive="active" [attr.title]="layout.sidebarCollapsed() ? 'SVG Animations' : null">
              <i class="fas fa-pen-nib"></i><span class="link-text">SVG Animations</span>
            </a>
          </li>
        </ul>
      </nav>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styleUrl: './app.scss'
})
export class App {
  layout = inject(LayoutService);
}
