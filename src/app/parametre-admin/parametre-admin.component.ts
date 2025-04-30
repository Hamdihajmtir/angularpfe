import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faUserShield, 
  faSignOutAlt, 
  faCog, 
  faUser, 
  faLock,
  faEye,
  faEyeSlash,
  faPalette
} from '@fortawesome/free-solid-svg-icons';
import { Router, RouterModule } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ParametreAdminService } from '../services/parametre-admin.service';

@Component({
  selector: 'app-parametre-admin',
  standalone: true,
  imports: [
    CommonModule, 
    FontAwesomeModule, 
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './parametre-admin.component.html',
  styleUrls: ['./parametre-admin.component.css']
})
export class ParametreAdminComponent implements OnInit {
  // Icons
  faUserShield = faUserShield;
  faSignOutAlt = faSignOutAlt;
  faCog = faCog;
  faUser = faUser;
  faLock = faLock;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faPalette = faPalette;

  // Forms
  accountForm: FormGroup;
  passwordForm: FormGroup;

  // UI States
  isDarkMode = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private parametreService: ParametreAdminService,
    private fb: FormBuilder
  ) {
    this.accountForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: [{ value: '', disabled: true }]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.loadAdminData();
    this.loadThemePreference();
  }

  async loadAdminData() {
    const adminData = await this.firebaseService.getCurrentUser();
    if (adminData) {
      this.accountForm.patchValue({
        nom: adminData.nom,
        prenom: adminData.prenom,
        email: adminData.email
      });
    }
  }

  loadThemePreference() {
    const darkMode = localStorage.getItem('darkMode');
    this.isDarkMode = darkMode === 'true';
    this.applyTheme();
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  async updateAccount() {
    if (this.accountForm.valid) {
      try {
        const adminId = this.firebaseService.getCurrentUser()?.uid;
        if (!adminId) throw new Error('Admin non connecté');

        const result = await this.parametreService.saveAdminSettings(adminId, this.accountForm.value);
        if (result.success) {
          alert('Profil mis à jour avec succès');
        } else {
          throw new Error('Erreur lors de la mise à jour');
        }
      } catch (error: any) {
        alert('Erreur: ' + error.message);
      }
    }
  }

  async updatePassword() {
    if (this.passwordForm.valid) {
      try {
        const adminId = this.firebaseService.getCurrentUser()?.uid;
        if (!adminId) throw new Error('Admin non connecté');

        const result = await this.firebaseService.updatePassword(
          this.passwordForm.get('currentPassword')?.value,
          this.passwordForm.get('newPassword')?.value
        );

        if (result.success) {
          alert('Mot de passe mis à jour avec succès');
          this.passwordForm.reset();
        } else {
          throw new Error('Erreur lors de la mise à jour du mot de passe');
        }
      } catch (error: any) {
        alert('Erreur: ' + error.message);
      }
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }

  async logout() {
    try {
      await this.firebaseService.logout();
      localStorage.removeItem('admin');
      this.router.navigate(['/login-admin']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }
} 