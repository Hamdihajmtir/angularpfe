import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  constructor(private firebaseService: FirebaseService) {}

  // Ajouter un nouveau patient
  async addPatient(patientData: any) {
    const currentUser = this.firebaseService.getCurrentUser();
    if (!currentUser || !currentUser.uid) {
      throw new Error('Utilisateur non connecté');
    }

    return await this.firebaseService.addPatient(currentUser.uid, patientData);
  }

  // Récupérer tous les patients du médecin connecté
  async getAllPatients() {
    const currentUser = this.firebaseService.getCurrentUser();
    if (!currentUser || !currentUser.uid) {
      throw new Error('Utilisateur non connecté');
    }

    return await this.firebaseService.getPatientsForDoctor(currentUser.uid);
  }
} 