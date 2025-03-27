import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { 
    path: '', 
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'calendrier', loadComponent: () => import('./appointments/appointments.component').then(m => m.AppointmentsComponent) },
      { path: 'parametre', loadComponent: () => import('./parametre/parametre.component').then(m => m.ParametreComponent) },
      { path: 'patient-detail/:id', loadComponent: () => import('./patient-detail/patient-detail.component').then(m => m.PatientDetailComponent) },
      // Add other routes as needed
    ]
  },
  // Wildcard route for handling 404
  { path: '**', redirectTo: '/login' }
]; 