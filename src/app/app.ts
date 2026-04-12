import { Component, OnInit, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from './services/layout.service';
import { ImportSocketService } from './services/import-socket.service';
import { ImportUiBlockService } from './services/import-ui-block.service';
import { PendingAlertsService } from './services/pending-alerts.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
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
        @if (notifOpen()) {
          <div class="app-notif-backdrop" (click)="notifOpen.set(false)" aria-hidden="true"></div>
        }
        <header class="app-topbar">
          <div class="app-topbar__title"></div>
          <div class="app-notif-wrap">
            <button
              type="button"
              class="app-notif-btn"
              (click)="notifOpen.update((v) => !v)"
              [attr.aria-expanded]="notifOpen()"
              aria-label="Notifications — doublons suspects"
            >
              <i class="fas fa-bell" aria-hidden="true"></i>
              @if (pendingAlerts.duplicateCount() > 0) {
                <span class="app-notif-badge">{{ pendingAlerts.duplicateCount() }}</span>
              }
            </button>
            @if (notifOpen()) {
              <div class="app-notif-panel" role="menu" (click)="$event.stopPropagation()">
                <div class="app-notif-panel__head">
                  <i class="fas fa-clone"></i> Doublons suspects
                </div>
                @if (pendingAlerts.duplicateItems().length === 0) {
                  <p class="app-notif-panel__empty">Aucun fichier à traiter</p>
                } @else {
                  <ul class="app-notif-list">
                    @for (item of pendingAlerts.duplicateItems(); track item.id) {
                      <li>
                        <button type="button" class="app-notif-item" (click)="goToDuplicate(item.id)">
                          <i class="fas fa-file-pdf"></i>
                          <span class="app-notif-item__name">{{ item.fileName || item.id }}</span>
                          @if (item.similarity?.confidence != null) {
                            <span class="app-notif-item__pct">{{ item.similarity?.confidence | number: '1.0-0' }}&nbsp;%</span>
                          }
                        </button>
                      </li>
                    }
                  </ul>
                }
                <a routerLink="/documents" [queryParams]="{ tab: 'pending_duplicate' }" class="app-notif-panel__link" (click)="notifOpen.set(false)">
                  Ouvrir l’onglet Doublons suspects
                </a>
              </div>
            }
          </div>
        </header>
        <router-outlet />
      </main>
    </div>

    @if (globalImportStrip(); as strip) {
      <!-- Plein écran au-dessus du layout (sidebar comprise), comme le backdrop Bootstrap -->
      <div class="app-import-backdrop" aria-hidden="true" tabindex="-1"></div>
      <div class="global-import-strip" role="status" aria-live="polite">
        <div class="global-import-strip__row">
          <span class="global-import-strip__badge">
            @if (strip.kind === 'csv') {
              Import CSV
            } @else {
              Envoi documents
            }
          </span>
          <span class="global-import-strip__msg">{{ strip.message }}</span>
          @if (strip.kind === 'batch' && strip.stepLine) {
            <span class="global-import-strip__step">{{ strip.stepLine }}</span>
          }
          <span class="global-import-strip__pct">{{ strip.percent | number: '1.0-0' }} %</span>
        </div>
        <div class="global-import-strip__bar" aria-hidden="true">
          <div class="global-import-strip__fill" [style.width.%]="strip.percent"></div>
        </div>
      </div>
    }
    </div>
  `,
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  layout = inject(LayoutService);
  private router = inject(Router);
  private importSocket = inject(ImportSocketService);
  private importUiBlock = inject(ImportUiBlockService);
  readonly pendingAlerts = inject(PendingAlertsService);

  /** Panneau liste des doublons (cloche). */
  notifOpen = signal(false);
  private notifPoll: ReturnType<typeof setInterval> | null = null;

  goToDuplicate(pendingId: string) {
    this.notifOpen.set(false);
    void this.router.navigate(['/documents'], {
      queryParams: { tab: 'pending_duplicate', focusDuplicate: pendingId },
    });
  }

  /** Barre + backdrop uniquement pendant un import réel (Socket.io : CSV ou lot PDF). */
  globalImportStrip = computed(() => {
    const p = this.importSocket.progress();
    const d = this.importSocket.documentsBatchProgress();
    if (p && p.phase !== 'done' && p.phase !== 'error') {
      return { kind: 'csv' as const, message: p.message, percent: Math.min(100, Math.max(0, p.percent)) };
    }
    if (d && d.phase !== 'done' && d.phase !== 'error') {
      const msg = d.fileName ? `${d.fileName} — ${d.message}` : d.message;
      const stepLine =
        d.step != null && d.stepCount != null ? `Étape ${d.step} / ${d.stepCount}` : undefined;
      return {
        kind: 'batch' as const,
        message: msg,
        percent: Math.min(100, Math.max(0, d.percent)),
        stepLine,
      };
    }
    return null;
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.globalImportStrip()) return;
      this.importUiBlock.acquire();
      onCleanup(() => this.importUiBlock.release());
    });
  }

  ngOnInit(): void {
    this.importSocket.ensureSocket().catch(() => {
      /* connexion établie au premier import si besoin */
    });
    this.pendingAlerts.refresh();
    this.notifPoll = setInterval(() => this.pendingAlerts.refresh(), 60000);
  }

  ngOnDestroy(): void {
    if (this.notifPoll != null) clearInterval(this.notifPoll);
  }
}
