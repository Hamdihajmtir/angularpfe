import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ThemeService } from '../services/theme.service';
import { LanguageService, Language } from '../services/language.service';
import { AuthService } from '../services/auth.service';
import { FirebaseService } from '../services/firebase.service';

interface User {
  uid: string;
}

@Component({
  selector: 'app-parametre',
  templateUrl: './parametre.component.html',
  styleUrls: ['./parametre.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  providers: [AuthService, FirebaseService]
})
export class ParametreComponent implements OnInit {
  isDarkMode = false;
  currentLanguage: Language = 'fr';
  languages: {code: Language, name: string, flag: string}[] = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'العربية', flag: '🇲🇦' }
  ];
  settingsForm: FormGroup;
  medecin: any = null;
  
  constructor(
    private themeService: ThemeService,
    private languageService: LanguageService,
    private fb: FormBuilder,
    @Inject(AuthService) private authService: AuthService,
    @Inject(FirebaseService) private firebaseService: FirebaseService
  ) {
    this.settingsForm = this.fb.group({
      nomCabinet: ['Cabinet Médical', Validators.required],
      adresse: ['123 Avenue Mohammed V, Casablanca', Validators.required],
      telephone: ['0522123456', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['contact@cabinet.ma', [Validators.required, Validators.email]],
      heureOuverture: ['08:00', Validators.required],
      heureFermeture: ['18:00', Validators.required],
      intervalleRdv: [30, [Validators.required, Validators.min(10)]]
    });
  }
  
  ngOnInit(): void {
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
    });

    this.authService.getCurrentUser().subscribe((user: User) => {
      if (user) {
        this.firebaseService.getMedecinByUid(user.uid).subscribe((data: any) => {
          this.medecin = data;
        });
      }
    });
  }
  
  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }
  
  changeLanguage(lang: string): void {
    this.languageService.setLanguage(lang as Language);
  }
  
  saveSettings() {
    if (this.settingsForm.valid) {
      console.log('Paramètres sauvegardés:', this.settingsForm.value);
      // Enregistrer les paramètres dans localStorage ou envoyer au backend
      localStorage.setItem('cabinetSettings', JSON.stringify(this.settingsForm.value));
      alert('Paramètres sauvegardés avec succès!');
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.settingsForm.controls).forEach(key => {
        const control = this.settingsForm.get(key);
        control?.markAsTouched();
      });
    }
  }
  
  resetSettings() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres?')) {
      this.settingsForm.reset({
        nomCabinet: 'Cabinet Médical',
        adresse: '123 Avenue Mohammed V, Casablanca',
        telephone: '0522123456',
        email: 'contact@cabinet.ma',
        heureOuverture: '08:00',
        heureFermeture: '18:00',
        intervalleRdv: 30
      });
    }
  }
} 