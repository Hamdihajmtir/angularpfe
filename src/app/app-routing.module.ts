import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AppointmentsComponent } from './appointments/appointments.component';
import { ParametreComponent } from './parametre/parametre.component';
import { PatientDetailComponent } from './patient-detail/patient-detail.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ChoisiLeLoginComponent } from './choisi-le-login/choisi-le-login.component';
import { LoginAdminComponent } from './login-admin/login-admin.component';
import { GenerateSecretaireComponent } from './generate-secretaire/generate-secretaire.component';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'appointments', component: AppointmentsComponent },
  { path: 'parametre', component: ParametreComponent },
  { path: 'patient-detail/:id', component: PatientDetailComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'choisi-le-login', component: ChoisiLeLoginComponent },
  { path: 'login-admin', component: LoginAdminComponent },
  { path: 'generer-un-secretaire', component: GenerateSecretaireComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
