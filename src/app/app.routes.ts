import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './guards/auth.guard';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChoisiLeLoginComponent } from './choisi-le-login/choisi-le-login.component';
import { LoginAdminComponent } from './login-admin/login-admin.component';
import { SignupAdminComponent } from './signup-admin/signup-admin.component';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { ParametreAdminComponent } from './parametre-admin/parametre-admin.component';
import { LoginSecretaireComponent } from './login-secretaire/login-secretaire.component';
import { GenerateSecretaireComponent } from './generate-secretaire/generate-secretaire.component';

export const routes: Routes = [
  { path: '', redirectTo: '/choisi-le-login', pathMatch: 'full' },
  { path: 'choisi-le-login', component: ChoisiLeLoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'login-admin', component: LoginAdminComponent },
  { path: 'login-secretaire', component: LoginSecretaireComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'signup-admin', component: SignupAdminComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { 
    path: 'dashboard-admin', 
    component: DashboardAdminComponent,
    children: [
      { path: 'generate-secretaire', component: GenerateSecretaireComponent },
      { path: 'parametre', component: ParametreAdminComponent },
      { path: 'ajouter-medecin', component: SignupComponent }
    ]
  },
  { 
    path: '', 
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'calendrier', loadComponent: () => import('./appointments/appointments.component').then(m => m.AppointmentsComponent) },
      { path: 'parametre', loadComponent: () => import('./parametre/parametre.component').then(m => m.ParametreComponent) },
      { path: 'patient-detail/:id', loadComponent: () => import('./patient-detail/patient-detail.component').then(m => m.PatientDetailComponent) },
      { path: 'liste-des-rendez-vous', loadComponent: () => import('./liste-des-rendez-vous/liste-des-rendez-vous.component').then(m => m.ListeDesRendezVousComponent) },
    ]
  },
  // Wildcard route for handling 404
  // { path: '**', redirectTo: '/choisi-le-login' }
]; 