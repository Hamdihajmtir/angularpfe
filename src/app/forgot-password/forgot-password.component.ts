import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class ForgotPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isSubmitted = false;
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
  }

  get f() { 
    return this.resetForm.controls; 
  }

  onSubmit() {
    this.isSubmitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    if (this.resetForm.invalid) {
      return;
    }
    
    this.loading = true;
    
    this.authService.sendPasswordResetEmail(this.resetForm.value.email)
      .then(() => {
        this.loading = false;
        this.successMessage = 'Un email de réinitialisation a été envoyé à votre adresse email.';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      })
      .catch((error: any) => {
        this.loading = false;
        this.errorMessage = 'Une erreur est survenue. Veuillez vérifier votre email et réessayer.';
        console.error('Error sending password reset email:', error);
      });
  }
} 