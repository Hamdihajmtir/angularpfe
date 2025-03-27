import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faUserDoctor, 
  faUser, 
  faEnvelope, 
  faLock, 
  faUserPlus 
} from '@fortawesome/free-solid-svg-icons';
import { FirebaseService } from '../services/firebase.service';

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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private firebaseService: FirebaseService
  ) { }

  ngOnInit() {
    this.signupForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      terms: [false, Validators.requiredTrue]
    }, { validator: this.checkPasswords });
  }

  // Validation personnalisée pour vérifier que les mots de passe correspondent
  checkPasswords(group: FormGroup) {
    const passwordControl = group.get('password');
    const confirmPasswordControl = group.get('confirmPassword');
    
    // Vérifier que les contrôles existent avant d'accéder à leurs valeurs
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
        const { email, password, nom, prenom } = this.signupForm.value;
        
        const result = await this.firebaseService.registerDoctor(
          email, 
          password, 
          { nom, prenom, email }
        );
        
        if (result.success) {
          console.log('Inscription réussie, redirection vers la page de connexion');
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

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
