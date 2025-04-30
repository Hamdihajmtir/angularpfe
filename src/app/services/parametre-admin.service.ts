import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class ParametreAdminService {
  constructor(private firebaseService: FirebaseService) {}

  // Méthode pour sauvegarder les paramètres de l'administrateur
  async saveAdminSettings(adminId: string, settings: any) {
    try {
      const settingsRef = `admins/${adminId}/settings`;
      await this.firebaseService.updateSettings(settingsRef, settings);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      return { success: false, error: error.message };
    }
  }

  // Méthode pour récupérer les paramètres de l'administrateur
  async getAdminSettings(adminId: string) {
    try {
      const settingsRef = `admins/${adminId}/settings`;
      const settings = await this.firebaseService.getSettings(settingsRef);
      return { success: true, settings };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des paramètres:', error);
      return { success: false, error: error.message };
    }
  }

  // Méthode pour mettre à jour un paramètre spécifique
  async updateSetting(adminId: string, settingKey: string, settingValue: any) {
    try {
      const settingsRef = `admins/${adminId}/settings/${settingKey}`;
      await this.firebaseService.updateSettings(settingsRef, settingValue);
      return { success: true };
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du paramètre:', error);
      return { success: false, error: error.message };
    }
  }
} 