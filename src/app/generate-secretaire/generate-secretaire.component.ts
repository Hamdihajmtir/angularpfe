import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faUserPlus, 
  faUser, 
  faEnvelope, 
  faPhone, 
  faIdCard, 
  faUserMd, 
  faLock,
  faEye,
  faEyeSlash,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { FirebaseService } from '../services/firebase.service';

interface Doctor {
  uid: string;
  nom: string;
  prenom: string;
  email: string;
}

@Component({
  selector: 'app-generate-secretaire',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './generate-secretaire.component.html',
  styleUrls: ['./generate-secretaire.component.css']
})
export class GenerateSecretaireComponent implements OnInit {
  faUserPlus = faUserPlus;
  faUser = faUser;
  faEnvelope = faEnvelope;
  faPhone = faPhone;
  faIdCard = faIdCard;
  faUserMd = faUserMd;
  faLock = faLock;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faSpinner = faSpinner;

  secretaireForm!: FormGroup;
  doctors: Doctor[] = [];
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  error: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private firebaseService: FirebaseService
  ) { }

  ngOnInit() {
    this.loadDoctors();
    this.initForm();
  }

  private initForm() {
    this.secretaireForm = this.fb.group({
      nom: ['', [Validators.required, this.nameValidator()]],
      prenom: ['', [Validators.required, this.nameValidator()]],
      email: ['', [Validators.required, Validators.email, this.emailValidator()]],
      telephone: ['', [Validators.required, this.phoneValidator()]],
      cin: ['', [Validators.required, this.cinValidator()]],
      doctorId: ['', Validators.required],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordValidator()
      ]],
      confirmPassword: ['', Validators.required]
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

  // Validation personnalisée pour le numéro de téléphone
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

  // Validation personnalisée pour le CIN
  cinValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      // Format CIN: exactement 8 chiffres
      const cinRegex = /^[0-9]{8}$/;
      if (!cinRegex.test(value)) {
        return {
          invalidCin: true,
          message: 'Le CIN doit contenir exactement 8 chiffres'
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

  // Validation pour la correspondance des mots de passe
  checkPasswords(group: FormGroup) {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { mismatch: true };
  }

  async loadDoctors() {
    try {
      this.isLoading = true;
      const result = await this.firebaseService.getAllDoctors();
      if (result.success) {
        this.doctors = Object.values(result.doctors);
      } else {
        this.error = 'Erreur lors du chargement des médecins';
      }
    } catch (error) {
      this.error = 'Une erreur est survenue lors du chargement des médecins';
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    if (this.secretaireForm.valid) {
      this.isLoading = true;
      this.error = '';

      try {
        const formData = this.secretaireForm.value;
        const result = await this.firebaseService.registerSecretaire(
          formData.email,
          formData.password,
          {
            nom: formData.nom,
            prenom: formData.prenom,
            telephone: formData.telephone,
            cin: formData.cin,
            doctorId: formData.doctorId
          }
        );

        if (result.success) {
          // Mettre à jour les données du médecin dans le localStorage
          const doctorId = formData.doctorId;
          const doctorResult = await this.firebaseService.getMedecinByUid(doctorId).toPromise();
          if (doctorResult) {
            localStorage.setItem('updatedDoctorData', JSON.stringify(doctorResult));
          }
          
          alert('Compte secrétaire créé avec succès');
          this.router.navigate(['/dashboard-admin']);
        } else {
          this.error = result.error || 'Erreur lors de la création du compte';
          console.error("Erreur lors de la création du compte:", this.error);
        }
      } catch (error: any) {
        this.error = error.message || 'Une erreur est survenue';
        console.error("Exception lors de la création du compte:", error);
      } finally {
        this.isLoading = false;
      }
    } else {
      console.log("Formulaire invalide:", this.secretaireForm.errors);
      this.error = "Veuillez remplir tous les champs correctement";
    }
  }

  goBack() {
    this.router.navigate(['/dashboard-admin']);
  }
}
