import { Routes } from '@angular/router';
import { AuthGuard } from './shared/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { 
    path: 'auth', 
    loadComponent: () => import('./auth/auth-simple.component').then(m => m.AuthSimpleComponent) 
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard-simple.component').then(m => m.DashboardSimpleComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/dashboard' }
];
