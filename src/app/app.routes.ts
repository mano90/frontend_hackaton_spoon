import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent) },
  { path: 'factures', loadComponent: () => import('./pages/factures/factures').then(m => m.FacturesComponent) },
  { path: 'mouvements', loadComponent: () => import('./pages/mouvements/mouvements').then(m => m.MouvementsComponent) },
  { path: 'devis', loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent), data: { docType: 'devis' } },
  { path: 'bons-commande', loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent), data: { docType: 'bon_commande' } },
  { path: 'bons-livraison', loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent), data: { docType: 'bon_livraison' } },
  { path: 'bons-reception', loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent), data: { docType: 'bon_reception' } },
  { path: 'emails', loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent), data: { docType: 'email' } },
  { path: 'timeline', loadComponent: () => import('./pages/timeline/timeline').then(m => m.TimelineComponent) },
  { path: 'rapprochement', loadComponent: () => import('./pages/rapprochement/rapprochement').then(m => m.RapprochementComponent) },
  { path: 'query', loadComponent: () => import('./pages/query/query').then(m => m.QueryComponent) },
  { path: 'svg-test', loadComponent: () => import('./pages/svg-test/svg-test').then(m => m.SvgTestComponent) },
];
