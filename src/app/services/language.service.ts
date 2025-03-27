import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'fr' | 'ar' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguage = new BehaviorSubject<Language>('fr');
  currentLanguage$ = this.currentLanguage.asObservable();

  // Traductions simplifiées (à développer dans une application réelle)
  private translations: Record<string, Record<string, string>> = {
    fr: {
      dashboard: 'Tableau de bord',
      patients: 'Patients',
      appointments: 'Rendez-vous',
      settings: 'Paramètres',
      darkMode: 'Mode sombre',
      language: 'Langue',
      profile: 'Profil',
      logout: 'Déconnexion',
      // Ajouter d'autres traductions
    },
    ar: {
      dashboard: 'لوحة القيادة',
      patients: 'المرضى',
      appointments: 'المواعيد',
      settings: 'الإعدادات',
      darkMode: 'الوضع المظلم',
      language: 'اللغة',
      profile: 'الملف الشخصي',
      logout: 'تسجيل الخروج',
      // Ajouter d'autres traductions
    },
    en: {
      dashboard: 'Dashboard',
      patients: 'Patients',
      appointments: 'Appointments',
      settings: 'Settings',
      darkMode: 'Dark Mode',
      language: 'Language',
      profile: 'Profile',
      logout: 'Logout',
      // Ajouter d'autres traductions
    }
  };

  constructor() {
    // Récupérer la langue enregistrée ou utiliser la langue du navigateur
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && ['fr', 'ar', 'en'].includes(savedLang)) {
      this.setLanguage(savedLang);
    } else {
      // Détecter la langue du navigateur
      const browserLang = navigator.language.split('-')[0];
      const lang = ['fr', 'ar', 'en'].includes(browserLang) ? browserLang as Language : 'fr';
      this.setLanguage(lang);
    }
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.next(lang);
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    
    // Appliquer la direction pour l'arabe (RTL)
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.body.classList.add('rtl');
    } else {
      document.documentElement.dir = 'ltr';
      document.body.classList.remove('rtl');
    }
  }

  translate(key: string): string {
    const lang = this.currentLanguage.value;
    return this.translations[lang][key] || key;
  }
} 