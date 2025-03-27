import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ThemeService } from '../services/theme.service';

interface Patient {
  id: number;
  nom: string;
  prenom: string;
  phone: string;
  cin: string;
  braceletCode: string;
  imageUrl: string;
  age: number;
  genre: string;
}

// Enregistrer les modules Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class PatientDetailComponent implements OnInit, OnDestroy {
  patient: any = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  currentUser: any;
  patientId: number | null = null;
  chartPeriod: 'day' | 'week' | 'month' = 'day';
  medicalReportForm!: FormGroup;
  charts: { [key: string]: Chart } = {};
  medicalReports: any[] = [];
  currentReportId: string | null = null;
  isEditingReport: boolean = false;
  isDarkMode: boolean = false;
  
  // Ajout de propriétés pour les mesures vitales
  heartRate: number = 0;
  oxygenLevel: number = 0;
  hasMeasurements: boolean = false;
  
  // Ajouter une propriété pour stocker la fonction de nettoyage de l'écouteur
  private measurementUnsubscribe: (() => void) | null = null;
  
  // Données de test (à remplacer par un service réel)
  mockPatients: Patient[] = [
    {
      id: 1,
      nom: 'Alami',
      prenom: 'Mohammed',
      phone: '0612345678',
      cin: 'AB123456',
      braceletCode: 'CARD001',
      imageUrl: 'https://placehold.co/600x400/png',
      age: 45,
      genre: 'M'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private formBuilder: FormBuilder,
    private themeService: ThemeService
  ) {
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  ngOnInit(): void {
    this.currentUser = this.firebaseService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Récupérer l'ID du patient depuis l'URL
    this.route.paramMap.subscribe(params => {
      const patientId = params.get('id');
      if (patientId) {
        this.loadPatientDetails(patientId);
        this.loadMedicalReports(patientId);
      } else {
        this.errorMessage = 'ID de patient non spécifié';
        this.isLoading = false;
      }
    });
    this.initMedicalReportForm();
    
    // Initialiser les graphiques après le chargement des données
    setTimeout(() => {
      this.initCharts();
    }, 500);
  }

  ngOnDestroy(): void {
    // Nettoyage de l'écouteur lorsque le composant est détruit
    if (this.measurementUnsubscribe) {
      this.measurementUnsubscribe();
    }
  }

  async loadPatientDetails(patientId: string) {
    try {
      // Récupérer les détails du patient depuis Firebase
      if (this.currentUser && this.currentUser.uid) {
        const patientRef = await this.firebaseService.getPatientById(this.currentUser.uid, patientId);
        
        if (patientRef.success && patientRef.patient) {
          this.patient = {
            id: patientRef.patient.id,
            nom: patientRef.patient.nom,
            prenom: patientRef.patient.prenom,
            age: patientRef.patient.age,
            genre: patientRef.patient.genre === 'M' ? 'Homme' : 'Femme',
            phone: patientRef.patient.tel,
            cin: patientRef.patient.cin,
            braceletCode: patientRef.patient.code,
            imageUrl: patientRef.patient.imageUrl || 'assets/images/default-avatar.png',
            dateCreation: new Date(patientRef.patient.dateCreation).toLocaleDateString('fr-FR'),
            dateModification: patientRef.patient.dateModification 
              ? new Date(patientRef.patient.dateModification).toLocaleDateString('fr-FR')
              : 'Non modifié'
          };
          
          // Remplacer l'appel ponctuel par l'observation continue
          if (this.patient.braceletCode) {
            this.observePatientMeasurements(this.patient.braceletCode);
          }
        } else {
          this.errorMessage = 'Patient non trouvé';
        }
      } else {
        this.errorMessage = 'Utilisateur non connecté';
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails du patient:', error);
      this.errorMessage = 'Erreur lors du chargement des détails du patient';
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  editPatient() {
    this.router.navigate(['/dashboard']);
  }

  private initMedicalReportForm(): void {
    this.medicalReportForm = this.formBuilder.group({
      reportContent: ['', Validators.required]
    });
  }

  changeChartPeriod(period: 'day' | 'week' | 'month'): void {
    this.chartPeriod = period;
    // Mettre à jour les données des graphiques selon la période
    this.updateChartsData(period);
  }

  saveMedicalReport(): void {
    if (!this.medicalReportForm.valid) return;
    
    const reportContent = this.medicalReportForm.get('reportContent')?.value;
    
    // Si le champ est vide, ne rien faire
    if (!reportContent || reportContent.trim() === '') {
      alert('Le rapport ne peut pas être vide');
      return;
    }
    
    // Si un ID de rapport existe, mettre à jour ce rapport
    if (this.currentReportId) {
      this.updateMedicalReport();
    } else {
      // Sinon, créer un nouveau rapport
      this.addMedicalReport();
    }
  }

  printMedicalReport(): void {
    const content = this.medicalReportForm.get('reportContent')?.value;
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    const formattedTime = `${currentDate.getHours()}:${String(currentDate.getMinutes()).padStart(2, '0')}`;
    
    // Ouvrir une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Rapport Médical - ${this.patient?.prenom} ${this.patient?.nom}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                max-width: 800px; 
                margin: 0 auto;
              }
              h1, h2, h3 { color: #1E5F74; }
              h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th { background-color: #f5f5f5; }
              th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
              .notes { white-space: pre-wrap; line-height: 1.5; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
              .footer { text-align: center; font-size: 10px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div style="text-align: right; font-size: 12px; color: #666; margin-bottom: 10px;">
              ${formattedDate}, ${formattedTime}
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
              <h1>Rapport Médical</h1>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h2>${this.patient?.prenom} ${this.patient?.nom}</h2>
              <p><strong>CIN:</strong> ${this.patient?.cin}</p>
              <p><strong>Téléphone:</strong> ${this.patient?.phone}</p>
              <p><strong>Code Bracelet:</strong> ${this.patient?.braceletCode}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3>Signes Vitaux (${formattedDate}, ${formattedTime})</h3>
              <p><strong>Rythme Cardiaque:</strong> 77 bpm</p>
              <p><strong>Oxygène:</strong> 94%</p>
              <p><strong>Température:</strong> 36.1°C</p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3>Notes du Médecin</h3>
              <div class="notes">${content}</div>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3>Historique des Rendez-vous</h3>
              <table>
                <tr>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Motif</th>
                  <th>Statut</th>
                </tr>
                <tr>
                  <td>${formattedDate}</td>
                  <td>10:30</td>
                  <td>Consultation</td>
                  <td>Terminé</td>
                </tr>
              </table>
            </div>
            
            <div style="margin-top: 80px;">
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Signature du médecin:</strong> ___________________________</p>
            </div>
            
            <div class="footer">
              <p>Page 1/1</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }

  downloadPDF(): void {
    // Créer un élément temporaire pour capturer le rapport
    const reportElement = document.createElement('div');
    const content = this.medicalReportForm.get('reportContent')?.value;
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    const formattedTime = `${currentDate.getHours()}:${String(currentDate.getMinutes()).padStart(2, '0')}`;
    
    reportElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="text-align: right; font-size: 12px; color: #666; margin-bottom: 10px;">
          ${formattedDate}, ${formattedTime}
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #1E5F74; margin-bottom: 5px;">Rapport Médical</h1>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="color: #1E5F74; font-size: 20px; margin-bottom: 5px;">${this.patient?.prenom} ${this.patient?.nom}</h2>
          <p style="margin: 5px 0;"><strong>CIN:</strong> ${this.patient?.cin}</p>
          <p style="margin: 5px 0;"><strong>Téléphone:</strong> ${this.patient?.phone}</p>
          <p style="margin: 5px 0;"><strong>Code Bracelet:</strong> ${this.patient?.braceletCode}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1E5F74; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Signes Vitaux (${formattedDate}, ${formattedTime})</h3>
          <p style="margin: 5px 0;"><strong>Rythme Cardiaque:</strong> 77 bpm</p>
          <p style="margin: 5px 0;"><strong>Oxygène:</strong> 94%</p>
          <p style="margin: 5px 0;"><strong>Température:</strong> 36.1°C</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1E5F74; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Notes du Médecin</h3>
          <div style="white-space: pre-wrap; line-height: 1.5; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">${content}</div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1E5F74; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Historique des Rendez-vous</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Date</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Heure</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Motif</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Statut</th>
            </tr>
            <tr>
              <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${formattedDate}</td>
              <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">10:30</td>
              <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Consultation</td>
              <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">Terminé</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 40px;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Signature du médecin:</strong> ___________________________</p>
        </div>
        
        <div style="text-align: center; font-size: 10px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px;">
          <p>Page 1/1</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(reportElement);
    
    html2canvas(reportElement).then((canvas: HTMLCanvasElement) => {
      document.body.removeChild(reportElement);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`rapport_medical_${this.patient?.nom}_${this.patient?.prenom}.pdf`);
    });
  }
  
  initCharts(): void {
    this.createHeartRateChart();
    this.createOxygenLevelChart();
    this.createTemperatureChart();
  }
  
  private updateChartsData(period: 'day' | 'week' | 'month'): void {
    // Simuler différentes données selon la période
    let labels: string[] = [];
    let heartRateData: number[] = [];
    let oxygenData: number[] = [];
    let temperatureData: number[] = [];
    
    switch(period) {
      case 'day':
        labels = ['8h', '10h', '12h', '14h', '16h', '18h', '20h'];
        heartRateData = [72, 75, 80, 78, 76, 82, 85];
        oxygenData = [95, 96, 94, 95, 93, 94, 93];
        temperatureData = [36.5, 36.7, 37.2, 37.0, 36.8, 36.9, 38.0];
        break;
      case 'week':
        labels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        heartRateData = [75, 78, 80, 82, 76, 74, 79];
        oxygenData = [94, 95, 93, 94, 96, 95, 93];
        temperatureData = [36.8, 37.1, 36.9, 37.0, 36.7, 36.6, 36.9];
        break;
      case 'month':
        labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
        heartRateData = [76, 79, 77, 82];
        oxygenData = [94, 93, 95, 93];
        temperatureData = [36.9, 37.0, 36.8, 37.2];
        break;
    }
    
    // Mettre à jour les graphiques avec les nouvelles données
    this.updateChartData(this.charts['heartRate'], labels, heartRateData);
    this.updateChartData(this.charts['oxygen'], labels, oxygenData);
    this.updateChartData(this.charts['temperature'], labels, temperatureData);
  }
  
  private updateChartData(chart: Chart, labels: string[], data: number[]): void {
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.update();
    }
  }
  
  private createHeartRateChart(): void {
    const ctx = document.getElementById('heartRateChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    this.charts['heartRate'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'],
        datasets: [{
          label: 'BPM',
          data: [72, 75, 80, 78, 76, 82, 85],
          backgroundColor: 'rgba(231, 76, 60, 0.2)',
          borderColor: 'rgba(231, 76, 60, 1)',
          borderWidth: 2,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 60,
            max: 100
          }
        }
      }
    });
  }
  
  private createOxygenLevelChart(): void {
    const ctx = document.getElementById('oxygenLevelChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    this.charts['oxygen'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'],
        datasets: [{
          label: '%',
          data: [95, 96, 94, 95, 93, 94, 93],
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          borderColor: 'rgba(52, 152, 219, 1)',
          borderWidth: 2,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 90,
            max: 100
          }
        }
      }
    });
  }
  
  private createTemperatureChart(): void {
    const ctx = document.getElementById('temperatureChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    this.charts['temperature'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'],
        datasets: [{
          label: '°C',
          data: [36.5, 36.7, 37.2, 37.0, 36.8, 36.9, 38.0],
          backgroundColor: 'rgba(243, 156, 18, 0.2)',
          borderColor: 'rgba(243, 156, 18, 1)',
          borderWidth: 2,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 35,
            max: 40
          }
        }
      }
    });
  }

  async loadMedicalReports(patientId: string): Promise<void> {
    if (!this.currentUser || !this.currentUser.uid) return;
    
    try {
      const response = await this.firebaseService.getAllMedicalReports(
        this.currentUser.uid, 
        patientId
      );
      
      if (response.success && response.reports) {
        // Convert object to array and sort by date (newest first)
        this.medicalReports = Object.values(response.reports)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // If there are reports, load the most recent one
        if (this.medicalReports.length > 0) {
          const latestReport = this.medicalReports[0];
          this.medicalReportForm.patchValue({
            reportContent: latestReport.rapport
          });
          this.currentReportId = latestReport.id;
          this.isEditingReport = true;
        }
      }
    } catch (error) {
      console.error('Error loading medical reports:', error);
    }
  }

  editingMedicalReport(): boolean {
    return this.isEditingReport;
  }

  async addMedicalReport(): Promise<void> {
    if (!this.medicalReportForm.valid || !this.currentUser || !this.patient) return;
    
    const reportData = {
      date: new Date().toISOString(),
      rapport: this.medicalReportForm.get('reportContent')?.value
    };
    
    try {
      const response = await this.firebaseService.addMedicalReport(
        this.currentUser.uid,
        this.patient.id,
        reportData
      );
      
      if (response.success) {
        alert('Rapport médical ajouté avec succès!');
        this.currentReportId = response.reportId || null;
        this.isEditingReport = true;
        
        // Reload reports to get the updated list
        this.loadMedicalReports(this.patient.id);
      } else {
        alert("Erreur lors de l'ajout du rapport médical");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout du rapport médical:", error);
      alert("Une erreur s'est produite lors de l'ajout du rapport");
    }
  }

  async updateMedicalReport(): Promise<void> {
    if (!this.medicalReportForm.valid || !this.currentUser || !this.patient || !this.currentReportId) return;
    
    const reportData = {
      date: new Date().toISOString(),
      rapport: this.medicalReportForm.get('reportContent')?.value
    };
    
    try {
      const response = await this.firebaseService.updateMedicalReport(
        this.currentUser.uid,
        this.patient.id,
        this.currentReportId,
        reportData
      );
      
      if (response.success) {
        alert('Rapport médical mis à jour avec succès!');
        
        // Reload reports to get the updated list
        this.loadMedicalReports(this.patient.id);
      } else {
        alert("Erreur lors de la mise à jour du rapport médical");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du rapport médical:", error);
      alert("Une erreur s'est produite lors de la mise à jour du rapport");
    }
  }

  createNewReport(): void {
    this.medicalReportForm.reset();
    this.currentReportId = null;
    this.isEditingReport = false;
  }

  selectReport(report: any): void {
    this.medicalReportForm.patchValue({
      reportContent: report.rapport
    });
    this.currentReportId = report.id;
    this.isEditingReport = true;
  }

  async deleteReport(reportId: string): Promise<void> {
    if (!this.currentUser || !this.patient) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rapport médical?')) {
      try {
        const response = await this.firebaseService.deleteMedicalReport(
          this.currentUser.uid,
          this.patient.id,
          reportId
        );
        
        if (response.success) {
          alert('Rapport médical supprimé avec succès!');
          
          // If we deleted the current report, reset the form
          if (reportId === this.currentReportId) {
            this.createNewReport();
          }
          
          // Reload reports to get the updated list
          this.loadMedicalReports(this.patient.id);
        } else {
          alert("Erreur lors de la suppression du rapport médical");
        }
      } catch (error) {
        console.error("Erreur lors de la suppression du rapport médical:", error);
        alert("Une erreur s'est produite lors de la suppression du rapport");
      }
    }
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  // Nouvelle méthode pour observer les mesures vitales en temps réel
  observePatientMeasurements(braceletCode: string) {
    // Nettoyer l'écouteur existant s'il y en a un
    if (this.measurementUnsubscribe) {
      this.measurementUnsubscribe();
    }
    
    // Configurer le nouvel écouteur
    this.measurementUnsubscribe = this.firebaseService.observeMeasurementsByBraceletCode(
      braceletCode,
      (response) => {
        if (response.success && response.measures) {
          this.hasMeasurements = true;
          
          // Récupérer les valeurs de BPM et SpO2
          this.heartRate = response.measures.BPM || 0;
          this.oxygenLevel = response.measures.SpO2 || 0;
          
          // Mettre à jour les graphiques avec ces valeurs
          this.updateLatestChartValues(this.heartRate, this.oxygenLevel);
        } else {
          this.hasMeasurements = false;
          this.heartRate = 0;
          this.oxygenLevel = 0;
        }
      }
    );
  }
  
  // Méthode pour mettre à jour les dernières valeurs dans les graphiques
  updateLatestChartValues(heartRate: number, oxygenLevel: number) {
    if (this.charts['heartRate'] && this.charts['oxygen']) {
      // Ajouter la nouvelle valeur à la fin des données existantes
      const heartRateData = this.charts['heartRate'].data.datasets[0].data;
      heartRateData[heartRateData.length - 1] = heartRate;
      
      const oxygenData = this.charts['oxygen'].data.datasets[0].data;
      oxygenData[oxygenData.length - 1] = oxygenLevel;
      
      // Mettre à jour les graphiques
      this.charts['heartRate'].update();
      this.charts['oxygen'].update();
    }
  }
} 