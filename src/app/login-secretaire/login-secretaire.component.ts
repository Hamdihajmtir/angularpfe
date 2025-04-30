import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faEye,
  faEyeSlash,
  faSignOutAlt,
  faUserTie,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-login-secretaire',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './login-secretaire.component.html',
  styleUrls: ['./login-secretaire.component.css']
})
export class LoginSecretaireComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  
  // Icons
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faUserTie = faUserTie;
  faSignOutAlt = faSignOutAlt;
  faArrowLeft = faArrowLeft;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private firebaseService: FirebaseService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      try {
        const { email, password } = this.loginForm.value;
        const result = await this.firebaseService.loginSecretaire(email, password);
        
        if (result.success) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userRole', 'doctor');
          localStorage.setItem('isSecretaireLogin', 'true');
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = result.error || 'Email ou mot de passe incorrect';
        }
      } catch (error: any) {
        this.errorMessage = error.message || 'Une erreur s\'est produite lors de la connexion';
        console.error('Erreur de connexion:', error);
      } finally {
        this.isLoading = false;
      }
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
  goToChooseLogin() {
    this.router.navigate(['/choisi-le-login']);
  }
} 