import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHeartPulse } from '@fortawesome/free-solid-svg-icons';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule]
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  faHeartPulse = faHeartPulse;

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
        const result = await this.firebaseService.loginDoctor(email, password);
        
        if (result.success) {
          localStorage.setItem('isLoggedIn', 'true');
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

  goToSignup() {
    this.router.navigate(['/signup']);
  }
} 