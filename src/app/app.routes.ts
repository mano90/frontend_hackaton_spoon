import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent) },
  { path: 'factures', loadComponent: () => import('./pages/factures/factures').then(m => m.FacturesComponent) },
  { path: 'mouvements', loadComponent: () => import('./pages/mouvements/mouvements').then(m => m.MouvementsComponent) },
  { path: 'rapprochement', loadComponent: () => import('./pages/rapprochement/rapprochement').then(m => m.RapprochementComponent) },
  { path: 'query', loadComponent: () => import('./pages/query/query').then(m => m.QueryComponent) },
];
