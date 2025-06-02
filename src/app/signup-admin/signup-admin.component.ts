import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faUserShield } from '@fortawesome/free-solid-svg-icons';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-signup-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './signup-admin.component.html',
  styleUrl: './signup-admin.component.css'
})
export class SignupAdminComponent implements OnInit {
  faUserShield = faUserShield;
  signupForm!: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private library: FaIconLibrary,
    private firebaseService: FirebaseService
  ) {
    library.addIcons(faUserShield);
  }

  ngOnInit(): void {
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required, this.nameValidator()]],
      lastName: ['', [Validators.required, this.nameValidator()]],
      email: ['', [Validators.required, Validators.email, this.emailValidator()]],
      phone: ['', [Validators.required, this.phoneValidator()]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator()
      ]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.checkPasswords });
  }

  nameValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const nameRegex = /^[A-Z][a-z]+$/;
      if (!nameRegex.test(value)) {
        return {
          invalidName: true,
          message: 'Le nom doit commencer par une majuscule et ne contenir que des lettres'
        };
      }
      return null;
    };
  }

  emailValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      if (!value.includes('@')) {
        return {
          invalidEmail: true,
          message: "L'email doit contenir le caractère @"
        };
      }
      return null;
    };
  }

  phoneValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const phoneRegex = /^[0-9]{8,}$/;
      if (!phoneRegex.test(value)) {
        return {
          invalidPhone: true,
          message: 'Le numéro de téléphone doit contenir au moins 8 chiffres'
        };
      }
      return null;
    };
  }

  passwordValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumbers = /\d/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      const passwordValid = hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;

      if (!passwordValid) {
        return {
          invalidPassword: true,
          message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'
        };
      }
      return null;
    };
  }

  checkPasswords(group: FormGroup) {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { mismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      try {
        const { email, password, firstName, lastName, phone } = this.signupForm.value;
        
        const result = await this.firebaseService.registerAdmin(
          email, 
          password, 
          { 
            firstName, 
            lastName, 
            email,
            phone,
            role: 'admin'
          }
        );
        
        if (result.success) {
          console.log('Inscription admin réussie');
          this.router.navigate(['/login-admin']);
        } else {
          this.errorMessage = result.error || "Une erreur s'est produite lors de l'inscription";
        }
      } catch (error: any) {
        this.errorMessage = error.message || "Une erreur inattendue s'est produite";
        console.error("Erreur d'inscription:", error);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.errorMessage = "Veuillez remplir correctement tous les champs";
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login-admin']);
  }
}
