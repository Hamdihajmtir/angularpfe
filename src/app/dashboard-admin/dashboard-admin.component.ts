import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUserMd, faUsers, faCalendarAlt, faSignOutAlt, faUserShield, faIdCard, faCode, faPlus, faEdit, faTrash, faCog, faPalette, faUserPlus, faCheck, faTimes, faUserNurse, faPhone } from '@fortawesome/free-solid-svg-icons';
import { FirebaseService } from '../services/firebase.service';
import { Router, RouterModule } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';

interface Patient {
  id: string;
  age: number;
  cin: string;
  code: string;
  dateCreation: string;
  genre: string;
  nom: string;
  prenom: string;
  imageUrl?: string;
  tel?: string;
}

interface Doctor {
  email: string;
  nom: string;
  prenom: string;
  tel?: string;
  uid: string;
  patients?: { [key: string]: Patient };
  etat: number;
  source?: string;
  secretaires?: { [key: string]: any };
}

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, RouterModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.css'
})
export class DashboardAdminComponent implements OnInit {
  faUserMd = faUserMd;
  faUsers = faUsers;
  faCalendarAlt = faCalendarAlt;
  faSignOutAlt = faSignOutAlt;
  faUserShield = faUserShield;
  faIdCard = faIdCard;
  faCode = faCode;
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faCog = faCog;
  faPalette = faPalette;
  faUserPlus = faUserPlus;
  faCheck = faCheck;
  faTimes = faTimes;
  faUserNurse = faUserNurse;
  faPhone = faPhone;
  doctors: { [key: string]: Doctor } = {};
  loading: boolean = true;
  error: string = '';
  isDarkMode = false;

  doctorForm: FormGroup;
  patientForm: FormGroup;

  isDoctorModalOpen = false;
  isPatientModalOpen = false;
  editingDoctor: Doctor | null = null;
  editingPatient: Patient | null = null;
  selectedDoctorId: string | null = null;

  isSecretaireModalOpen = false;
  editingSecretaire: any = null;
  secretaireForm: FormGroup;

  constructor(
    private firebaseService: FirebaseService,
    public router: Router,
    private library: FaIconLibrary,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService
  ) {
    library.addIcons(faUserMd, faUsers, faCalendarAlt, faSignOutAlt, faUserShield, faIdCard, faCode, faPlus, faEdit, faTrash, faCog, faPalette, faUserPlus, faCheck, faTimes, faUserNurse, faPhone);

    this.doctorForm = this.formBuilder.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      tel: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
    });

    this.patientForm = this.formBuilder.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      age: ['', [Validators.required, Validators.min(0)]],
      genre: ['', Validators.required],
      cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      code: ['', Validators.required]
    });

    this.secretaireForm = this.formBuilder.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]]
    });
  }

  async ngOnInit() {
    await this.loadDoctors();
    this.loadThemePreference();
  }

  async loadDoctors() {
    try {
      this.loading = true;
      const result = await this.firebaseService.getAllDoctors();
      if (result.success) {
        this.doctors = result.doctors;
      } else {
        this.error = 'Erreur lors du chargement des médecins';
      }
    } catch (error) {
      this.error = 'Une erreur est survenue';
    } finally {
      this.loading = false;
    }
  }

  getPatientCount(doctor: Doctor): number {
    return doctor.patients ? Object.keys(doctor.patients).length : 0;
  }

  getPatients(doctor: Doctor): Patient[] {
    if (!doctor.patients) return [];
    return Object.values(doctor.patients);
  }

  getDoctors(): Doctor[] {
    return Object.values(this.doctors);
  }

  getDoctorKey(doctor: Doctor): string {
    for (const key in this.doctors) {
      if (this.doctors[key].email === doctor.email) {
        return key;
      }
    }
    return '';
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

  addDoctor() {
    console.log('Ajout d\'un nouveau médecin');
    this.editingDoctor = null;
    this.doctorForm.reset();
    this.isDoctorModalOpen = true;
  }

  async editDoctor(doctor: Doctor) {
    console.log('Édition du médecin:', doctor);
    this.editingDoctor = doctor;
    this.doctorForm.setValue({
      nom: doctor.nom,
      prenom: doctor.prenom,
      email: doctor.email,
      tel: doctor.tel || ''
    });
    this.isDoctorModalOpen = true;
  }

  async deleteDoctor(doctorId: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce médecin ? Cette action est irréversible.')) {
      try {
        const result = await this.firebaseService.deleteDoctor(doctorId);
        if (result.success) {
          // Supprimer le médecin de la liste locale
          delete this.doctors[doctorId];
          alert('Médecin supprimé avec succès');
        } else {
          this.error = "Erreur lors de la suppression du médecin: " + result.error;
          alert(this.error);
        }
      } catch (error: any) {
        this.error = error.message;
        alert('Erreur: ' + this.error);
      }
    }
  }

  async editPatient(doctorId: string, patient: Patient) {
    console.log('Édition du patient:', patient, 'pour le médecin:', doctorId);
    this.selectedDoctorId = doctorId;
    this.editingPatient = patient;
    this.patientForm.setValue({
      nom: patient.nom,
      prenom: patient.prenom,
      age: patient.age,
      genre: patient.genre,
      cin: patient.cin,
      code: patient.code
    });
    this.isPatientModalOpen = true;
  }

  async deletePatient(doctorId: string, patientId: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
      try {
        const result = await this.firebaseService.deletePatient(doctorId, patientId);
        if (result.success) {
          // Mettre à jour la liste des patients localement
          const doctor = this.doctors[doctorId];
          if (doctor.patients) {
            delete doctor.patients[patientId];
          }
        } else {
          this.error = "Erreur lors de la suppression du patient";
        }
      } catch (error: any) {
        this.error = error.message;
      }
    }
  }

  loadThemePreference() {
    const darkMode = localStorage.getItem('darkMode');
    this.isDarkMode = darkMode === 'true';
    this.applyTheme();
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }

  closeDoctorModal() {
    console.log('Fermeture de la modale médecin');
    this.isDoctorModalOpen = false;
    this.doctorForm.reset();
    this.editingDoctor = null;
  }

  async updateDoctor() {
    if (this.doctorForm.valid) {
      try {
        const doctorData = this.doctorForm.value;
        
        if (this.editingDoctor) {
          // Mise à jour d'un médecin existant
          const result = await this.firebaseService.updateDoctor(this.editingDoctor.uid, doctorData);
          if (result.success) {
            // Mettre à jour la liste des médecins
            this.doctors[this.editingDoctor.uid] = {
              ...this.editingDoctor,
              ...doctorData
            };
            alert('Médecin mis à jour avec succès');
            this.closeDoctorModal();
          } else {
            alert('Erreur lors de la mise à jour du médecin: ' + result.error);
          }
        } else {
          // Ajout d'un nouveau médecin
          const result = await this.firebaseService.registerDoctor(
            doctorData.email,
            'password123', // Mot de passe temporaire
            doctorData
          );
          if (result.success) {
            // Recharger la liste des médecins
            await this.loadDoctors();
            alert('Médecin ajouté avec succès');
            this.closeDoctorModal();
          } else {
            alert('Erreur lors de l\'ajout du médecin: ' + result.error);
          }
        }
      } catch (error: any) {
        alert('Erreur: ' + error.message);
      }
    }
  }

  closePatientModal() {
    console.log('Fermeture de la modale patient');
    this.isPatientModalOpen = false;
    this.patientForm.reset();
    this.editingPatient = null;
    this.selectedDoctorId = null;
  }

  async updatePatient() {
    if (this.patientForm.valid && this.selectedDoctorId) {
      try {
        const patientData = this.patientForm.value;
        
        // Vérifier si le CIN existe déjà
        const cinExists = await this.checkCinExists(patientData.cin, this.editingPatient?.id);
        if (cinExists) {
          alert('Ce numéro de CIN existe déjà dans la base de données.');
          return;
        }
        
        if (this.editingPatient) {
          // Mise à jour d'un patient existant
          console.log('Mise à jour du patient:', this.editingPatient.id, patientData);
          
          // Vérifier si l'ID du patient est une chaîne
          const patientId = typeof this.editingPatient.id === 'string' 
            ? this.editingPatient.id 
            : String(this.editingPatient.id);
          
          const result = await this.firebaseService.updatePatient(
            this.selectedDoctorId,
            patientId,
            patientData
          );
          
          if (result.success) {
            // Mettre à jour la liste des patients localement
            if (this.doctors[this.selectedDoctorId]?.patients) {
              this.doctors[this.selectedDoctorId].patients![patientId] = {
                ...this.editingPatient,
                ...patientData
              };
            }
            alert('Patient mis à jour avec succès');
            this.closePatientModal();
          } else {
            alert('Erreur lors de la mise à jour du patient: ' + result.error);
          }
        } else {
          // Ajout d'un nouveau patient
          const result = await this.firebaseService.addPatient(
            this.selectedDoctorId,
            patientData
          );
          if (result.success) {
            // Recharger la liste des médecins pour obtenir le nouveau patient
            await this.loadDoctors();
            alert('Patient ajouté avec succès');
            this.closePatientModal();
          } else {
            alert('Erreur lors de l\'ajout du patient: ' + result.error);
          }
        }
      } catch (error: any) {
        console.error('Erreur lors de la mise à jour du patient:', error);
        alert('Erreur: ' + (error.message || 'Une erreur est survenue'));
      }
    }
  }

  // Méthode pour vérifier si un CIN existe déjà
  async checkCinExists(cin: string, currentPatientId?: string): Promise<boolean> {
    try {
      // Vérifier dans tous les médecins
      for (const doctorId in this.doctors) {
        const doctor = this.doctors[doctorId];
        if (doctor.patients) {
          for (const patientId in doctor.patients) {
            const patient = doctor.patients[patientId];
            // Ignorer le patient actuel lors de la vérification
            if (currentPatientId && patient.id === currentPatientId) {
              continue;
            }
            if (patient.cin === cin) {
              return true; // CIN trouvé
            }
          }
        }
      }
      return false; // CIN non trouvé
    } catch (error) {
      console.error('Erreur lors de la vérification du CIN:', error);
      return false;
    }
  }

  async AcceptMedecin(doctorId: string) {
    try {
      await this.firebaseService.acceptDoctor(doctorId);
      this.notificationService.showSuccess('Médecin accepté avec succès');
      await this.loadDoctors();
    } catch (error) {
      console.error('Erreur lors de l\'acceptation du médecin:', error);
      this.notificationService.showError('Erreur lors de l\'acceptation du médecin');
    }
  }

  async RefuseMedecin(doctorId: string) {
    try {
      await this.firebaseService.refuseDoctor(doctorId);
      this.notificationService.showSuccess('Médecin refusé avec succès');
      await this.loadDoctors();
    } catch (error) {
      console.error('Erreur lors du refus du médecin:', error);
      this.notificationService.showError('Erreur lors du refus du médecin');
    }
  }

  getSecretaires(doctor: Doctor): any[] {
    if (!doctor.secretaires) return [];
    return Object.values(doctor.secretaires);
  }

  async addSecretaire(doctor: Doctor) {
    this.router.navigate(['/dashboard-admin/generate-secretaire'], {
      queryParams: { doctorId: doctor.uid }
    });
  }

  async editSecretaire(doctorId: string, secretaire: any) {
    try {
      const result = await this.firebaseService.getSecretaireById(doctorId, secretaire.uid);
      if (result.success) {
        this.editingSecretaire = result.secretaire;
        this.secretaireForm.setValue({
          nom: this.editingSecretaire.nom,
          prenom: this.editingSecretaire.prenom,
          email: this.editingSecretaire.email,
          telephone: this.editingSecretaire.telephone,
          cin: this.editingSecretaire.cin
        });
        this.isSecretaireModalOpen = true;
      } else {
        this.notificationService.showError('Impossible de récupérer les informations du secrétaire');
      }
    } catch (error: any) {
      this.notificationService.showError(error.message);
    }
  }

  async updateSecretaire() {
    if (this.secretaireForm.valid && this.editingSecretaire) {
      try {
        const doctorId = this.editingSecretaire.doctorId;
        const secretaireId = this.editingSecretaire.uid;
        const secretaireData = {
          ...this.secretaireForm.value,
          uid: secretaireId,
          doctorId: doctorId,
          role: 'secretaire'
        };

        const result = await this.firebaseService.updateSecretaire(doctorId, secretaireId, secretaireData);
        if (result.success) {
          // Mettre à jour la liste des secrétaires localement
          if (this.doctors[doctorId]?.secretaires) {
            this.doctors[doctorId].secretaires![secretaireId] = secretaireData;
          }
          this.notificationService.showSuccess('Secrétaire mis à jour avec succès');
          this.closeSecretaireModal();
        } else {
          this.notificationService.showError(result.error);
        }
      } catch (error: any) {
        this.notificationService.showError(error.message);
      }
    }
  }

  closeSecretaireModal() {
    this.isSecretaireModalOpen = false;
    this.secretaireForm.reset();
    this.editingSecretaire = null;
  }

  async deleteSecretaire(doctorId: string, secretaireId: string) {
    try {
      const confirmed = confirm('Êtes-vous sûr de vouloir supprimer ce secrétaire ?');
      if (!confirmed) return;

      const result = await this.firebaseService.deleteSecretaire(doctorId, secretaireId);
      if (result.success) {
        // Mettre à jour la liste des secrétaires localement
        if (this.doctors[doctorId]?.secretaires) {
          delete this.doctors[doctorId].secretaires![secretaireId];
        }
        this.notificationService.showSuccess('Secrétaire supprimé avec succès');
      } else {
        this.notificationService.showError(result.error);
      }
    } catch (error: any) {
      this.notificationService.showError(error.message);
    }
  }
}
