import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-bracelet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bracelet.component.html',
  styleUrl: './bracelet.component.css'
})
export class BraceletComponent implements OnInit {
  bracelets: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private firebaseService: FirebaseService) {}

  async ngOnInit() {
    this.loading = true;
    this.error = null;
    try {
      // Récupérer les patients du médecin connecté
      const patientsRes = await this.firebaseService.getCurrentDoctorPatients();
      if (!patientsRes.success) {
        this.error = patientsRes.error || 'Erreur lors du chargement des patients';
        return;
      }

      // Récupérer tous les bracelets
      const braceletsRes = await this.firebaseService.getAllBracelets();
      if (!braceletsRes.success) {
        this.error = braceletsRes.error || 'Erreur lors du chargement des bracelets';
        return;
      }

      // Extraire les codes des patients du médecin
      const patientCodes = Object.values(patientsRes.patients || {}).map((patient: any) => patient.code);

      // Filtrer les bracelets pour ne garder que ceux correspondant aux patients du médecin
      this.bracelets = Object.entries(braceletsRes.bracelets || {})
        .map(([id, data]) => ({ id, ...(typeof data === 'object' && data !== null ? data : {}) }))
        .filter(bracelet => patientCodes.includes(bracelet.id));

    } catch (e: any) {
      this.error = e.message || 'Erreur lors du chargement des bracelets';
    } finally {
      this.loading = false;
    }
  }

  async activate(braceletId: string) {
    await this.firebaseService.activateBracelet(braceletId);
    await this.ngOnInit();
  }

  async deactivate(braceletId: string) {
    await this.firebaseService.deactivateBracelet(braceletId);
    await this.ngOnInit();
  }

  async reset(braceletId: string) {
    await this.firebaseService.resetBracelet(braceletId);
    await this.ngOnInit();
  }
}
