import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  sidebarCollapsed = signal(false);

  collapseSidebar() {
    this.sidebarCollapsed.set(true);
  }

  expandSidebar() {
    this.sidebarCollapsed.set(false);
  }

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }
}

