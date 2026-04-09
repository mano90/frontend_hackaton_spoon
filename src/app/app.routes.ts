import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent) },
  { path: 'documents', loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent) },
  { path: 'mouvements', loadComponent: () => import('./pages/mouvements/mouvements').then(m => m.MouvementsComponent) },
  { path: 'rapprochement', loadComponent: () => import('./pages/rapprochement/rapprochement').then(m => m.RapprochementComponent) },
  { path: 'timeline', loadComponent: () => import('./pages/timeline/timeline').then(m => m.TimelineComponent) },
  { path: 'query', loadComponent: () => import('./pages/query/query').then(m => m.QueryComponent) },
  { path: 'svg-test', loadComponent: () => import('./pages/svg-test/svg-test').then(m => m.SvgTestComponent) },
];
