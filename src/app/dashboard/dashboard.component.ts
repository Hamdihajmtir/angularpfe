import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';

// Define the Patient interface
interface Patient {
  id: any; // Peut être string ou number
  nom: string;
  prenom: string;
  phone: string;
  cin: string;
  braceletCode: string;
  imageUrl: string;
  age: number;
  genre: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class DashboardComponent implements OnInit {
  // Add missing properties
  isDarkMode = false;
  currentYear = new Date().getFullYear();
  currentTheme: string = 'theme-light';
  currentView: string = 'dashboard';
  days: {number: number, isWeekend: boolean}[] = [];
  currentDate: Date = new Date();
  daysInMonth: Date[] = [];
  isPatientModalOpen: boolean = false;
  patientForm!: FormGroup;
  imagePreview: string | null = null;
  patients: Patient[] = [];
  editingPatient: Patient | null = null;
  currentUser: any;
  imageFile: File | null = null;
  rendezvousList: any[] = [];
  tomorrowRendezvousList: any[] = [];

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit() {
    // Initialize the form
    this.patientForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      cin: ['', Validators.required],
      braceletCode: ['', Validators.required],
      age: ['', [Validators.required, Validators.min(0)]],
      genre: ['', Validators.required],
      imageUrl: ['']
    });

    this.currentUser = this.firebaseService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadPatients();
    this.loadTodaysAppointments();
  }

  async loadPatients() {
    if (this.currentUser && this.currentUser.uid) {
      const result = await this.firebaseService.getPatientsForDoctor(this.currentUser.uid);
      if (result.success && result.patients) {
        // Convertir l'objet en tableau
        this.patients = Object.values(result.patients).map((patient: any) => ({
          id: patient.id, // Conserver l'ID comme une chaîne
          nom: patient.nom,
          prenom: patient.prenom,
          age: patient.age,
          genre: patient.genre,
          phone: patient.tel,
          cin: patient.cin,
          braceletCode: patient.code,
          imageUrl: patient.imageUrl || 'assets/images/default-avatar.png'
        }));
      }
    }
  }

  openPatientModal(patient?: Patient) {
    if (patient) {
      this.editingPatient = patient;
      this.patientForm.setValue({
        nom: patient.nom,
        prenom: patient.prenom,
        phone: patient.phone,
        cin: patient.cin,
        braceletCode: patient.braceletCode,
        age: patient.age,
        genre: patient.genre,
        imageUrl: ''
      });
      this.imagePreview = patient.imageUrl;
    } else {
      this.editingPatient = null;
      this.patientForm.reset();
      this.imagePreview = null;
    }
    
    this.isPatientModalOpen = true;
  }

  closePatientModal(event: Event) {
    if (
      event.target === event.currentTarget || 
      (event.currentTarget as HTMLElement).classList.contains('modal-close')
    ) {
      this.isPatientModalOpen = false;
      this.patientForm.reset();
      this.imagePreview = null;
      this.editingPatient = null;
    }
  }

  onImagePicked(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.imageFile = file;
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async addPatient() {
    if (this.patientForm.valid && this.currentUser && this.currentUser.uid) {
      try {
        // Désactiver les interactions UI pendant le traitement
        const submitButton = document.querySelector('.btn-primary') as HTMLButtonElement;
        if (submitButton) submitButton.disabled = true;
        
        // Préparation des données du patient
        const patientData = this.patientForm.value;
        
        if (this.imagePreview) {
          patientData.imageUrl = this.imagePreview;
        }
        
        // Appel du service pour ajouter le patient dans Firebase
        const result = await this.firebaseService.addPatient(this.currentUser.uid, patientData);
        
        if (result.success) {
          // Fermer le modal
          this.isPatientModalOpen = false;
          
          // Réinitialiser le formulaire et les états AVANT de recharger les patients
          this.patientForm.reset();
          this.imagePreview = null;
          this.imageFile = null;
          
          // Recharger les patients après une courte pause
          setTimeout(() => {
            this.loadPatients();
          }, 300);
        } else {
          alert(`Erreur lors de l'ajout du patient: ${result.error}`);
        }
      } finally {
        // Réactiver les interactions UI
        const submitButton = document.querySelector('.btn-primary') as HTMLButtonElement;
        if (submitButton) submitButton.disabled = false;
      }
    }
  }

  async updatePatient() {
    if (this.patientForm.valid && this.editingPatient && this.currentUser && this.currentUser.uid) {
      // Préparation des données du patient
      const patientData = {
        ...this.patientForm.value
      };
      
      // Si une image a été choisie, on utilise l'aperçu comme URL de l'image
      if (this.imagePreview) {
        patientData.imageUrl = this.imagePreview;
      }
      
      // Utiliser la méthode updatePatient pour mettre à jour le patient existant
      const result = await this.firebaseService.updatePatient(
        this.currentUser.uid,
        this.editingPatient.id.toString(), // Assurez-vous que l'ID est une chaîne
        patientData
      );
      
      if (result.success) {
        // Fermer le modal et recharger la liste des patients
        this.isPatientModalOpen = false;
        this.loadPatients();
        
        // Réinitialiser le formulaire et les états
        this.patientForm.reset();
        this.imagePreview = null;
        this.imageFile = null;
        this.editingPatient = null;
      } else {
        alert(`Erreur lors de la mise à jour du patient: ${result.error}`);
      }
    }
  }

  editPatient(patient: Patient, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    this.editingPatient = patient;
    this.patientForm.setValue({
      nom: patient.nom,
      prenom: patient.prenom,
      phone: patient.phone,
      cin: patient.cin,
      braceletCode: patient.braceletCode,
      age: patient.age,
      genre: patient.genre,
      imageUrl: ''  // Ce champ est un champ caché qui stocke l'URL de l'image
    });
    
    this.imagePreview = patient.imageUrl;
    this.isPatientModalOpen = true;
  }

  async deletePatient(id: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    // Confirmer la suppression
    if (confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
      if (this.currentUser && this.currentUser.uid) {
        // Convertir l'ID numérique en chaîne si nécessaire
        const patientId = id.toString();
        
        const result = await this.firebaseService.deletePatient(this.currentUser.uid, patientId);
        
        if (result.success) {
          // Mise à jour locale du tableau de patients
          this.patients = this.patients.filter(patient => patient.id !== id);
        } else {
          alert(`Erreur lors de la suppression du patient: ${result.error}`);
        }
      }
    }
  }

  viewPatientDetails(patient: Patient) {
    this.router.navigate(['/patient-detail', patient.id]);
  }

  async loadTodaysAppointments() {
    const currentUser = this.firebaseService.getCurrentUser();
    if (!currentUser) return;

    const result = await this.firebaseService.getAllRendezvous(currentUser.uid);
    if (result.success && result.rendezvous) {
      // Obtenir les dates d'aujourd'hui et de demain au format YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      
      // Calculer la date de demain
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      // Traiter tous les rendez-vous pour récupérer les détails des patients
      const processedAppointments = await Promise.all(
        Object.values(result.rendezvous).map(async (rdv: any) => {
          // Récupérer les détails du patient
          const patientResult = await this.firebaseService.getPatientById(
            currentUser.uid, 
            rdv.patientId
          );
          return {
            ...rdv,
            patient: patientResult.success ? patientResult.patient : { nom: 'Patient', prenom: 'Inconnu' }
          };
        })
      );
      
      // Filtrer pour aujourd'hui
      this.rendezvousList = processedAppointments.filter((rdv: any) => rdv.date === today);
      
      // Filtrer pour demain
      this.tomorrowRendezvousList = processedAppointments.filter((rdv: any) => rdv.date === tomorrowStr);
    }
  }
} 