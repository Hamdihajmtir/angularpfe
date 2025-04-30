import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHeartPulse } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-choisi-le-login',
  standalone: true,
  imports: [RouterModule, FontAwesomeModule],
  templateUrl: './choisi-le-login.component.html',
  styleUrls: ['./choisi-le-login.component.css']
})
export class ChoisiLeLoginComponent {
  faHeartPulse = faHeartPulse;
  
  constructor(private router: Router) {}
  
  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToLoginAdmin() {
    this.router.navigate(['/login-admin']);
  }

  goToLoginSecretaire() {
    this.router.navigate(['/login-secretaire']);
  }
}
