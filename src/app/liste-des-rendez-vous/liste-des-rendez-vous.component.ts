import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch, faCalendar, faEdit, faTrash, faUser, faIdCard, faPhone } from '@fortawesome/free-solid-svg-icons';

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: Date;
  title: string;
  description: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  patient?: {
    nom: string;
    prenom: string;
    cin: string;
    phone: string;
  };
}

@Component({
  selector: 'app-liste-des-rendez-vous',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './liste-des-rendez-vous.component.html',
  styleUrls: ['./liste-des-rendez-vous.component.css']
})
export class ListeDesRendezVousComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  isLoading = true;
  error: string | null = null;
  
  // Icônes FontAwesome
  faSearch = faSearch;
  faCalendar = faCalendar;
  faEdit = faEdit;
  faTrash = faTrash;
  faUser = faUser;
  faIdCard = faIdCard;
  faPhone = faPhone;
  
  // Formulaire de filtrage
  filterForm: FormGroup;
  
  constructor(
    private firebaseService: FirebaseService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      startDate: [''],
      endDate: [''],
      status: ['']
    });
    
    // Écouter les changements de filtres
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }
  
  ngOnInit(): void {
    this.loadAppointments();
  }
  
  async loadAppointments(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;
      
      const currentUser = this.firebaseService.getCurrentUser();
      if (!currentUser?.uid) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Récupérer tous les rendez-vous
      const result = await this.firebaseService.getAllRendezvous(currentUser.uid);
      
      if (result.success && result.rendezvous) {
        // Convertir l'objet en tableau et ajouter les informations des patients
        this.appointments = await Promise.all(
          Object.values(result.rendezvous).map(async (rdv: any) => {
            const patientResult = await this.firebaseService.getPatientById(currentUser.uid, rdv.patientId);
            return {
              id: rdv.id,
              patientId: rdv.patientId,
              doctorId: currentUser.uid,
              date: new Date(rdv.date),
              title: rdv.title || 'Rendez-vous',
              description: rdv.description || '',
              status: rdv.status || 'pending',
              patient: patientResult.success ? {
                nom: patientResult.patient.nom,
                prenom: patientResult.patient.prenom,
                cin: patientResult.patient.cin,
                phone: patientResult.patient.tel || ''
              } : undefined
            };
          })
        );
        
        // Appliquer les filtres initiaux
        this.applyFilters();
      }
    } catch (err) {
      console.error('Erreur lors du chargement des rendez-vous:', err);
      this.error = 'Une erreur est survenue lors du chargement des rendez-vous.';
    } finally {
      this.isLoading = false;
    }
  }
  
  applyFilters(): void {
    const { search, startDate, endDate, status } = this.filterForm.value;
    
    this.filteredAppointments = this.appointments.filter(appointment => {
      // Filtre de recherche (nom, prénom, CIN)
      if (search) {
        const searchLower = search.toLowerCase();
        const patient = appointment.patient;
        if (!patient) return false;
        
        const matchesSearch = 
          patient.nom.toLowerCase().includes(searchLower) ||
          patient.prenom.toLowerCase().includes(searchLower) ||
          patient.cin.toLowerCase().includes(searchLower);
          
        if (!matchesSearch) return false;
      }
      
      // Filtre de date
      if (startDate) {
        const start = new Date(startDate);
        if (appointment.date < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (appointment.date > end) return false;
      }
      
      // Filtre de statut
      if (status && appointment.status !== status) return false;
      
      return true;
    });
    
    // Trier par date
    this.filteredAppointments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  
  resetFilters(): void {
    this.filterForm.reset();
  }
  
  async deleteAppointment(appointmentId: string): Promise<void> {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      return;
    }
    
    try {
      const currentUser = this.firebaseService.getCurrentUser();
      if (!currentUser?.uid) {
        throw new Error('Utilisateur non connecté');
      }
      
      const result = await this.firebaseService.deleteRendezvous(currentUser.uid, appointmentId);
      if (result.success) {
        this.appointments = this.appointments.filter(a => a.id !== appointmentId);
        this.applyFilters();
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Erreur lors de la suppression du rendez-vous:', err);
      alert('Une erreur est survenue lors de la suppression du rendez-vous.');
    }
  }
  
  editAppointment(appointment: Appointment): void {
    // TODO: Implémenter la modification du rendez-vous
    console.log('Modifier le rendez-vous:', appointment);
  }
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }
  
  getStatusText(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
