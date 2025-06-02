import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faUserShield, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { ReactiveFormsModule } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-login-admin',
  standalone: true,
  imports: [FontAwesomeModule, ReactiveFormsModule],
  templateUrl: './login-admin.component.html',
  styleUrl: './login-admin.component.css'
})
export class LoginAdminComponent implements OnInit {
  faUserShield = faUserShield;
  faArrowLeft = faArrowLeft;
  loginForm!: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private library: FaIconLibrary,
    private firebaseService: FirebaseService
  ) {
    library.addIcons(faUserShield);
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoading = true;
      try {
        const { email, password } = this.loginForm.value;
        
        const result = await this.firebaseService.loginAdmin(email, password);

        if (result.success) {
          // Stocker les données de l'admin dans le localStorage
          localStorage.setItem('admin', JSON.stringify(result.user));
          this.router.navigate(['/dashboard-admin']);
        } else {
          this.errorMessage = result.error || 'Email ou mot de passe incorrect';
        }
      } catch (error: any) {
        this.errorMessage = error.message || 'Une erreur est survenue lors de la connexion';
      } finally {
        this.isLoading = false;
      }
    }
  }

  goToSignupadmin(): void {
    this.router.navigate(['/signup-admin']);
  }

  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
  goToChooseLogin() {
    this.router.navigate(['/choisi-le-login']);
  }
}
