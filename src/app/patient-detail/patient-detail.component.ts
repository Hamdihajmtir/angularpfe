import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ThemeService } from '../services/theme.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { NotificationService } from '../services/notification.service';

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

// Enregistrer les modules Chart.js et le plugin zoom
Chart.register(...registerables, zoomPlugin);

@Component({
  selector: 'app-patient-detail',
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe]
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

  isFullscreenChart: boolean = false;
  fullscreenChart: Chart | null = null;

  private chartZoomLevel = 1;
  private readonly ZOOM_FACTOR = 1.2;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private chartTranslateX = 0;
  private chartTranslateY = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private formBuilder: FormBuilder,
    private themeService: ThemeService,
    private notificationService: NotificationService
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
    this.initializeChart();
  }

  ngOnDestroy(): void {
    // Nettoyage de l'écouteur lorsque le composant est détruit
    if (this.measurementUnsubscribe) {
      this.measurementUnsubscribe();
    }
    if (this.fullscreenChart) {
      this.fullscreenChart.destroy();
    }
  }

  async loadPatientDetails(patientId: string) {
    try {
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
          
          // Initialiser les graphiques et charger les mesures
          if (this.patient.braceletCode) {
            await this.loadAllMeasurements(this.patient.braceletCode);
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
    if (this.measurementUnsubscribe) {
      this.measurementUnsubscribe();
    }
    
    this.measurementUnsubscribe = this.firebaseService.observeMeasurementsByBraceletCode(
      braceletCode,
      (measures) => {
        if (measures && measures.BPM !== undefined && measures.SpO2 !== undefined) {
          this.hasMeasurements = true;
          this.heartRate = measures.BPM || 0;
          this.oxygenLevel = measures.SpO2 || 0;
          
          // Créer le timestamp au format Firebase
          const now = new Date();
          const timestamp = now.toISOString()
            .replace(/[:.]/g, '_')
            .replace('T', '_')
            .replace('Z', '');
          
          if (this.charts['proVital']) {
            const chart = this.charts['proVital'];
            
            if (chart.data && chart.data.labels && chart.data.datasets) {
              // Ajouter les nouvelles valeurs
              chart.data.labels.push(timestamp);
              chart.data.datasets[0].data.push(measures.BPM);
              chart.data.datasets[1].data.push(measures.SpO2);
              chart.data.datasets[2].data.push(measures.temperature);
              
              // Garder les 50 dernières mesures
              if (chart.data.labels.length > 50) {
                chart.data.labels.shift();
                chart.data.datasets.forEach(dataset => dataset.data.shift());
              }
              
              chart.update('none');
            }
          }
        } else {
          this.hasMeasurements = false;
          this.heartRate = 0;
          this.oxygenLevel = 0;
        }
      }
    );
  }
  
  async loadAllMeasurements(braceletCode: string) {
    const response = await this.firebaseService.getMeasurementsByBraceletCode(braceletCode);
    if (!response.success || !response.measures) return;

    // Convertir l'objet de mesures en tableau trié par timestamp
    const entries = Object.entries(response.measures)
      .map(([timestamp, values]: [string, any]) => ({
        // Garder le format original du timestamp de Firebase
        timestamp: timestamp,
        BPM: values.BPM ?? null,
        SpO2: values.SpO2 ?? null,
        temperature: values.temperature ?? null
      }))
      .sort((a, b) => {
        // Convertir les timestamps pour le tri (remplacer les underscores par des :)
        const dateA = new Date(a.timestamp.replace(/_/g, ':'));
        const dateB = new Date(b.timestamp.replace(/_/g, ':'));
        return dateA.getTime() - dateB.getTime();
      });

    // Préparer les labels en gardant le format original
    const labels = entries.map(e => e.timestamp);
    const bpmData = entries.map(e => e.BPM);
    const spo2Data = entries.map(e => e.SpO2);
    const tempData = entries.map(e => e.temperature);

    this.updateProChart(labels, bpmData, spo2Data, tempData);
  }

  updateProChart(labels: string[], bpmData: number[], spo2Data: number[], tempData: number[]) {
    const ctx = document.getElementById('proVitalChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.charts['proVital']) {
        this.charts['proVital'].destroy();
    }

    this.charts['proVital'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'BPM',
                    data: bpmData,
                    borderColor: 'rgba(231, 76, 60, 1)',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    yAxisID: 'y',
                    tension: 0.3,
                    pointRadius: 3,
                    borderWidth: 2
                },
                {
                    label: 'SpO2 (%)',
                    data: spo2Data,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.3,
                    pointRadius: 3,
                    borderWidth: 2
                },
                {
                    label: 'Température (°C)',
                    data: tempData,
                    borderColor: 'rgba(243, 156, 18, 1)',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    yAxisID: 'y2',
                    tension: 0.3,
                    pointRadius: 3,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            animation: { duration: 750, easing: 'linear' },
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Courbes Vitales en Temps Réel' },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        modifierKey: undefined,
                        threshold: 5
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy'
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Date et Heure' },
                    ticks: {
                        maxRotation: 45,
                        callback: function(value: any) {
                            // Convertir le format Firebase en format lisible
                            const timestamp = this.getLabelForValue(value);
                            if (timestamp) {
                                const date = new Date(timestamp.replace(/_/g, ':'));
                                return date.toLocaleString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    year: '2-digit',
                                    month: '2-digit',
                                    day: '2-digit'
                                });
                            }
                            return '';
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'BPM' },
                    min: 0,
                    max: 200,
                    grid: {
                        color: 'rgba(231, 76, 60, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'SpO2 (%)' },
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(52, 152, 219, 0.1)',
                        drawOnChartArea: false
                    }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Température (°C)' },
                    min: 0,
                    max: 45,
                    grid: {
                        color: 'rgba(243, 156, 18, 0.1)',
                        drawOnChartArea: false
                    },
                    offset: true
                }
            }
        }
    });
  }

  private saveChartState() {
    if (this.fullscreenChart) {
      const chartState = {
        zoom: this.fullscreenChart.getZoomLevel ? this.fullscreenChart.getZoomLevel() : 1,
        pan: this.fullscreenChart.pan ? this.fullscreenChart.pan : { x: 0, y: 0 },
        timestamp: new Date().getTime()
      };
      localStorage.setItem('chartState', JSON.stringify(chartState));
    }
  }

  private loadChartState(): any {
    const savedState = localStorage.getItem('chartState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Vérifier si l'état sauvegardé n'est pas trop ancien (24 heures)
        if (new Date().getTime() - state.timestamp < 24 * 60 * 60 * 1000) {
          return state;
        } else {
          localStorage.removeItem('chartState');
        }
      } catch (e) {
        console.error('Erreur lors du chargement de l\'état du graphique:', e);
        localStorage.removeItem('chartState');
      }
    }
    return null;
  }

  openFullscreenChart() {
    this.isFullscreenChart = true;
    
    setTimeout(() => {
      const ctx = document.getElementById('fullscreenChart') as HTMLCanvasElement;
      if (!ctx) {
        console.error('Canvas element not found');
        return;
      }

      // Récupérer le graphique source
      const currentChart = this.charts['proVital'];
      if (!currentChart || !currentChart.data) {
        console.error('Source chart not found or has no data');
        return;
      }

      // Détruire l'ancien graphique en plein écran s'il existe
      if (this.fullscreenChart) {
        this.fullscreenChart.destroy();
      }

      // S'assurer que le canvas a la bonne taille
      const container = ctx.parentElement;
      if (container) {
        ctx.width = container.clientWidth;
        ctx.height = container.clientHeight;
      }

      // Charger l'état sauvegardé
      const savedState = this.loadChartState();

      // Créer le nouveau graphique avec les options de pan et zoom
      this.fullscreenChart = new Chart(ctx, {
        type: 'line',
        data: JSON.parse(JSON.stringify(currentChart.data)),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 },
          plugins: {
            zoom: {
              pan: {
                enabled: true,
                mode: 'xy',
                modifierKey: undefined,
                threshold: 5
              },
              zoom: {
                wheel: {
                  enabled: true,
                  speed: 0.1
                },
                pinch: {
                  enabled: true
                },
                mode: 'xy'
              }
            }
          }
        }
      });

      // Restaurer l'état sauvegardé si disponible
      if (savedState) {
        this.fullscreenChart.zoom(savedState.zoom);
        this.fullscreenChart.pan(savedState.pan);
      }

      // Ajouter des écouteurs d'événements pour sauvegarder l'état
      if (this.fullscreenChart?.options?.plugins?.zoom) {
        const zoomPlugin = this.fullscreenChart.options.plugins.zoom;
        
        if (zoomPlugin.zoom) {
          zoomPlugin.zoom.onZoomComplete = () => {
            this.saveChartState();
          };
        }

        if (zoomPlugin.pan) {
          zoomPlugin.pan.onPanComplete = () => {
            this.saveChartState();
          };
        }
      }

      // Ajouter des écouteurs d'événements pour le curseur
      let isDragging = false;

      ctx.addEventListener('mousedown', () => {
        isDragging = true;
        ctx.style.cursor = 'grabbing';
      });

      ctx.addEventListener('mousemove', () => {
        if (!isDragging) {
          ctx.style.cursor = 'grab';
        }
      });

      ctx.addEventListener('mouseup', () => {
        isDragging = false;
        ctx.style.cursor = 'grab';
        this.saveChartState();
      });

      ctx.addEventListener('mouseleave', () => {
        isDragging = false;
        ctx.style.cursor = 'default';
      });

      // Forcer une mise à jour du graphique
      this.fullscreenChart.update('none');
    }, 100);
  }

  closeFullscreenChart() {
    if (this.fullscreenChart) {
      this.saveChartState();
      this.fullscreenChart.destroy();
      this.fullscreenChart = null;
    }
    this.isFullscreenChart = false;
  }

  private initializeChart(): void {
    const chartContainer = document.querySelector('.chart-container') as HTMLElement;
    if (chartContainer) {
      chartContainer.addEventListener('mousedown', ((event: MouseEvent) => {
        this.startDragging(event);
      }) as EventListener);
      chartContainer.addEventListener('mousemove', ((event: MouseEvent) => {
        this.handleDrag(event);
      }) as EventListener);
      chartContainer.addEventListener('mouseup', (() => this.stopDragging()) as EventListener);
      chartContainer.addEventListener('mouseleave', (() => this.stopDragging()) as EventListener);
    }
  }

  private startDragging(event: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private handleDrag(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.chartTranslateX += deltaX;
    this.chartTranslateY += deltaY;

    this.updateChartTransform();

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private stopDragging(): void {
    this.isDragging = false;
  }

  private updateChartTransform(): void {
    const chartElement = document.querySelector('.chart-container svg') as HTMLElement;
    if (chartElement) {
      chartElement.style.transform = `translate(${this.chartTranslateX}px, ${this.chartTranslateY}px) scale(${this.chartZoomLevel})`;
    }
  }

  zoomIn(): void {
    this.chartZoomLevel *= this.ZOOM_FACTOR;
    this.updateChartTransform();
  }

  zoomOut(): void {
    this.chartZoomLevel /= this.ZOOM_FACTOR;
    this.updateChartTransform();
  }

  resetZoom(): void {
    this.chartZoomLevel = 1;
    this.chartTranslateX = 0;
    this.chartTranslateY = 0;
    this.updateChartTransform();
  }

  zoomInFullscreen(): void {
    this.zoomIn();
  }

  zoomOutFullscreen(): void {
    this.zoomOut();
  }

  resetZoomFullscreen(): void {
    this.resetZoom();
  }
} 