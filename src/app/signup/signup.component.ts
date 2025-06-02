import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faUserDoctor, 
  faUser, 
  faEnvelope, 
  faLock, 
  faUserPlus,
  faPhone,
  faIdCard
} from '@fortawesome/free-solid-svg-icons';
import { FirebaseService } from '../services/firebase.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule]
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  
  // Icônes Font Awesome
  faUserDoctor = faUserDoctor;
  faUser = faUser;
  faEnvelope = faEnvelope;
  faLock = faLock;
  faUserPlus = faUserPlus;
  faPhone = faPhone;
  faIdCard = faIdCard;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.signupForm = this.fb.group({
      nom: ['', [Validators.required, this.nameValidator()]],
      prenom: ['', [Validators.required, this.nameValidator()]],
      email: ['', [Validators.required, Validators.email, this.emailValidator()]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator()
      ]],
      confirmPassword: ['', Validators.required],
      tel: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]]
    }, { validator: this.checkPasswords });
  }

  // Validation personnalisée pour les noms (première lettre majuscule, reste en minuscules)
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

  // Validation personnalisée pour l'email
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

  // Validation personnalisée pour le mot de passe
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

  // Validation personnalisée pour vérifier que les mots de passe correspondent
  checkPasswords(group: FormGroup) {
    const passwordControl = group.get('password');
    const confirmPasswordControl = group.get('confirmPassword');
    
    if (!passwordControl || !confirmPasswordControl) {
      return null;
    }
    
    const password = passwordControl.value;
    const confirmPassword = confirmPasswordControl.value;
    return password === confirmPassword ? null : { notSame: true };
  }

  async onSubmit() {
    if (this.signupForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      
      try {
        const { email, password, nom, prenom, tel, cin } = this.signupForm.value;
        
        // Vérifier si le CIN existe déjà
        const cinExists = await this.checkCinExists(cin);
        if (cinExists) {
          this.errorMessage = "Ce numéro de CIN existe déjà dans la base de données.";
          this.isLoading = false;
          return;
        }
        
        const result = await this.firebaseService.registerDoctor(
          email, 
          password, 
          { 
            nom, 
            prenom, 
            email,
            tel,
            cin,
            role: 'medecin',
            dateCreation: new Date().toISOString()
          }
        );
        
        if (result.success) {
          console.log('Inscription réussie, redirection vers la page de connexion');
          this.notificationService.showSuccess(
            'Inscription réussie ! Un email de vérification a été envoyé à votre adresse email. Veuillez vérifier votre boîte de réception et cliquer sur le lien de vérification. Une fois votre email vérifié, votre compte sera en attente d\'approbation par l\'administrateur. Vous serez notifié par email une fois votre compte approuvé.'
          );
          this.router.navigate(['/login']);
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

  // Méthode pour vérifier si un CIN existe déjà
  async checkCinExists(cin: string): Promise<boolean> {
    try {
      const result = await this.firebaseService.checkIfMedecin(cin);
      return result;
    } catch (error) {
      console.error('Erreur lors de la vérification du CIN:', error);
      return false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goBack() {
    this.router.navigate(['/dashboard-admin']);
  }
}
