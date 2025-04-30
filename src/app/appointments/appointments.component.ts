import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FirebaseService } from '../services/firebase.service';
import { TranslatePipe } from '../pipes/translate.pipe';

// Interface Appointment
interface Appointment {
  id: number;
  patientId: number;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  description?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

// Ajoutez cette interface pour les patients
interface Patient {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  cin?: string;
  codeBracelet?: string;
  image?: string;
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe, TranslatePipe],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.css'
})
export class AppointmentsComponent implements OnInit {
  // Propriétés pour le calendrier
  calendarDays: any[] = [];
  weekDays: any[] = [];
  calendarView: 'month' | 'week' | 'day' = 'month';
  selectedDate: Date = new Date();
  selectedDay: string = '';
  today: Date = new Date();
  
  // Propriétés pour les données
  patients: Patient[] = [];
  appointments: Appointment[] = [];
  selectedPatient: any = null;
  showAppointmentForm: boolean = false;
  appointmentForm: FormGroup;
  editingAppointmentId: number | null = null;
  
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {
    // Initialisation du formulaire de rendez-vous
    this.appointmentForm = this.fb.group({
      patientId: ['', Validators.required],
      title: ['', Validators.required],
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      description: [''],
      status: ['confirmed']
    });
    
    // Initialiser la date d'aujourd'hui
    this.today.setHours(0, 0, 0, 0);
  }
  
  ngOnInit() {
    // Initialiser les données du calendrier
    this.generateCalendarDays();
    this.generateWeekDays();
    this.loadFirebaseData();
  }
  
  // Navigation
  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }
  
  // Méthodes pour le calendrier
  getCurrentMonthYear() {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}`;
  }
  
  navigateToPreviousMonth() {
    this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() - 1, 1);
    this.generateCalendarDays();
  }
  
  navigateToNextMonth() {
    this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 1);
    this.generateCalendarDays();
  }
  
  goToCurrentMonth() {
    this.selectedDate = new Date();
    this.generateCalendarDays();
  }
  
  changeCalendarView(view: 'month' | 'week' | 'day') {
    this.calendarView = view;
    if (view === 'week') {
      this.generateWeekDays();
    }
  }
  
  generateCalendarDays() {
    // Logique pour générer les jours du mois en cours
    this.calendarDays = [];
    
    // Premier jour du mois
    const firstDay = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
    // Dernier jour du mois
    const lastDay = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 0);
    
    // Jours du mois précédent pour compléter la première semaine
    const firstDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // Lundi = 1, Dimanche = 7
    const daysFromPrevMonth = firstDayOfWeek - 1;
    
    // Date d'aujourd'hui pour la comparaison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ajouter les jours du mois précédent
    if (daysFromPrevMonth > 0) {
      const prevMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 0);
      for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
        const day = prevMonth.getDate() - i;
        const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day);
        this.calendarDays.push({
          day: day,
          month: prevMonth.getMonth(),
          year: prevMonth.getFullYear(),
          isCurrentMonth: false,
          isToday: this.isToday(day, prevMonth.getMonth(), prevMonth.getFullYear()),
          isPast: date < today,
          appointments: this.getAppointmentsForDay(day, prevMonth.getMonth(), prevMonth.getFullYear())
        });
      }
    }
    
    // Ajouter les jours du mois actuel
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), day);
      this.calendarDays.push({
        day: day,
        month: this.selectedDate.getMonth(),
        year: this.selectedDate.getFullYear(),
        isCurrentMonth: true,
        isToday: this.isToday(day, this.selectedDate.getMonth(), this.selectedDate.getFullYear()),
        isPast: date < today,
        appointments: this.getAppointmentsForDay(day, this.selectedDate.getMonth(), this.selectedDate.getFullYear())
      });
    }
    
    // Ajouter les jours du mois suivant pour compléter la dernière semaine
    const remainingDays = 42 - this.calendarDays.length; // 42 = 6 semaines * 7 jours
    
    if (remainingDays > 0) {
      const nextMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 1);
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
        this.calendarDays.push({
          day: day,
          month: nextMonth.getMonth(),
          year: nextMonth.getFullYear(),
          isCurrentMonth: false,
          isToday: this.isToday(day, nextMonth.getMonth(), nextMonth.getFullYear()),
          isPast: date < today,
          appointments: this.getAppointmentsForDay(day, nextMonth.getMonth(), nextMonth.getFullYear())
        });
      }
    }
  }
  
  generateWeekDays() {
    // Logique pour générer les jours de la semaine en cours
    this.weekDays = [];
    
    // Trouver le premier jour de la semaine (lundi)
    const currentDay = new Date(this.selectedDate);
    const dayOfWeek = currentDay.getDay() === 0 ? 7 : currentDay.getDay(); // Lundi = 1, Dimanche = 7
    currentDay.setDate(currentDay.getDate() - (dayOfWeek - 1));
    
    // Générer 7 jours à partir du lundi
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDay);
      date.setDate(date.getDate() + i);
      
      this.weekDays.push({
        date: date,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isToday: this.isToday(date.getDate(), date.getMonth(), date.getFullYear()),
        appointments: this.getAppointmentsForDay(date.getDate(), date.getMonth(), date.getFullYear())
      });
    }
  }
  
  isToday(day: number, month: number, year: number): boolean {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  }
  
  getHoursOfDay() {
    return ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  }
  
  getAppointmentsForDay(day: number, month: number, year: number): Appointment[] {
    const date = new Date(year, month, day);
    return this.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.getDate() === date.getDate() && 
             aptDate.getMonth() === date.getMonth() && 
             aptDate.getFullYear() === date.getFullYear();
    });
  }
  
  getAppointmentsForHour(day: number, month: number, year: number, hour: string): Appointment[] {
    const dayAppointments = this.getAppointmentsForDay(day, month, year);
    return dayAppointments.filter(apt => apt.startTime === hour);
  }
  
  hasAppointmentWithStatus(day: number, month: number, year: number, status: string) {
    const date = new Date(year, month, day);
    const dayAppointments = this.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.getDate() === date.getDate() && 
             aptDate.getMonth() === date.getMonth() && 
             aptDate.getFullYear() === date.getFullYear() &&
             apt.status === status;
    });
    return dayAppointments.length > 0;
  }
  
  getPatientForAppointment(patientId: number) {
    return this.patients.find(p => p.id === patientId);
  }
  
  getPatientAppointments(patientId: number | undefined): Appointment[] {
    if (!patientId) return [];
    return this.appointments.filter(apt => apt.patientId === patientId);
  }
  
  // Méthodes pour les rendez-vous
  async loadFirebaseData() {
    const currentUser = this.firebaseService.getCurrentUser();
    if (currentUser) {
      // Load patients from Firebase
      const patientsResult = await this.firebaseService.getPatientsForDoctor(currentUser.uid);
      if (patientsResult.success && patientsResult.patients) {
        this.patients = Object.values(patientsResult.patients).map((patient: any) => ({
          id: patient.id,
          nom: patient.nom,
          prenom: patient.prenom,
          telephone: patient.tel || '',
          cin: patient.cin || '',
          codeBracelet: patient.code || '',
          image: patient.imageUrl || ''
        }));
      }
      
      // Load appointments from Firebase
      const appointmentsResult = await this.firebaseService.getAllRendezvous(currentUser.uid);
      if (appointmentsResult.success && appointmentsResult.rendezvous) {
        this.appointments = Object.values(appointmentsResult.rendezvous).map((rdv: any) => ({
          id: rdv.id,
          patientId: rdv.patientId,
          patientNom: rdv.patientNom || '',
          patientPrenom: rdv.patientPrenom || '',
          title: rdv.title || 'Rendez-vous',
          date: new Date(rdv.date),
          startTime: rdv.heure.split('-')[0].trim(),
          endTime: rdv.heure.split('-')[1]?.trim() || '',
          description: rdv.description || '',
          status: rdv.status
        }));
      }
      
      // Refresh calendar views
      this.generateCalendarDays();
      if (this.calendarView === 'week') {
        this.generateWeekDays();
      }
    }
  }
  
  openAppointmentForm(day: number, month: number, year: number) {
    const date = new Date(year, month, day);
    
    // Vérifier si la date est dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      alert('Vous ne pouvez pas créer de rendez-vous sur une date déjà passée.');
      return;
    }
    
    // Définir l'heure de début par défaut en fonction de l'heure actuelle
    let defaultStartTime = '09:00';
    let defaultEndTime = '09:30';
    
    // Si la date est aujourd'hui, définir l'heure de début à la prochaine demi-heure disponible
    if (date.getDate() === today.getDate() && 
        date.getMonth() === today.getMonth() && 
        date.getFullYear() === today.getFullYear()) {
      
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();
      
      // Arrondir à la prochaine demi-heure
      if (currentMinute < 30) {
        defaultStartTime = `${currentHour.toString().padStart(2, '0')}:30`;
        defaultEndTime = `${(currentHour + 1).toString().padStart(2, '0')}:00`;
      } else {
        defaultStartTime = `${(currentHour + 1).toString().padStart(2, '0')}:00`;
        defaultEndTime = `${(currentHour + 1).toString().padStart(2, '0')}:30`;
      }
      
      // Vérifier si l'heure de début est après 17:30
      if (defaultStartTime > '17:30') {
        alert('Vous ne pouvez pas créer de rendez-vous après 17:30.');
        return;
      }
    }
    
    this.appointmentForm.patchValue({
      date: this.formatDate(date),
      startTime: defaultStartTime,
      endTime: defaultEndTime
    });
    this.showAppointmentForm = true;
  }
  
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  closeAppointmentForm() {
    this.showAppointmentForm = false;
    this.appointmentForm.reset();
    this.editingAppointmentId = null;
  }
  
  async saveAppointment() {
    if (this.appointmentForm.valid) {
      const formData = this.appointmentForm.value;
      
      // Vérifier si la date est dans le passé
      const appointmentDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        alert('Vous ne pouvez pas créer de rendez-vous sur une date déjà passée.');
        return;
      }
      
      // Vérifier si l'heure de fin est après 17:30
      if (formData.endTime > '17:30') {
        alert('Vous ne pouvez pas créer de rendez-vous après 17:30.');
        return;
      }
      
      // Si la date est aujourd'hui, vérifier si l'heure de début est déjà passée
      if (appointmentDate.getDate() === today.getDate() && 
          appointmentDate.getMonth() === today.getMonth() && 
          appointmentDate.getFullYear() === today.getFullYear()) {
        
        const currentHour = today.getHours().toString().padStart(2, '0');
        const currentMinute = today.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;
        
        if (formData.startTime < currentTime) {
          alert('Vous ne pouvez pas créer de rendez-vous à une heure déjà passée.');
          return;
        }
      }
      
      const currentUser = this.firebaseService.getCurrentUser();
      
      if (!currentUser) {
        console.error('User not logged in');
        return;
      }
      
      // Récupérer les informations du patient sélectionné
      const selectedPatient = this.patients.find(p => p.id === formData.patientId);
      
      const rendezvousData = {
        date: formData.date,
        heure: `${formData.startTime} - ${formData.endTime}`,
        description: formData.description || '',
        title: formData.title || 'Rendez-vous',
        status: formData.status || 'pending',
        // Ajouter les informations du patient pour référence
        patientNom: selectedPatient ? selectedPatient.nom : '',
        patientPrenom: selectedPatient ? selectedPatient.prenom : ''
      };
      
      let result;
      
      if (this.editingAppointmentId) {
        // Update existing appointment
        result = await this.firebaseService.updateRendezvous(
          currentUser.uid, 
          this.editingAppointmentId.toString(), 
          { 
            ...rendezvousData,
            patientId: formData.patientId
          }
        );
      } else {
        // Create new appointment
        result = await this.firebaseService.addRendezvous(
          currentUser.uid,
          formData.patientId,
          rendezvousData
        );
      }
      
      if (result.success) {
        this.closeAppointmentForm();
        this.loadFirebaseData(); // Reload data from Firebase
      } else {
        alert(`Erreur: ${result.error}`);
      }
    }
  }
  
  editAppointment(id: number) {
    const appointment = this.appointments.find(apt => apt.id === id);
    if (appointment) {
      this.editingAppointmentId = id;
      this.appointmentForm.patchValue({
        patientId: appointment.patientId,
        title: appointment.title,
        date: this.formatDate(new Date(appointment.date)),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        description: appointment.description || '',
        status: appointment.status
      });
      this.showAppointmentForm = true;
    }
  }
  
  async deleteAppointment(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ?')) {
      const currentUser = this.firebaseService.getCurrentUser();
      if (!currentUser) {
        console.error('User not logged in');
        return;
      }
      
      const result = await this.firebaseService.deleteRendezvous(
        currentUser.uid,
        id.toString()
      );
      
      if (result.success) {
        this.loadFirebaseData(); // Reload data from Firebase
      } else {
        alert(`Erreur: ${result.error}`);
      }
    }
  }
  
  async changeAppointmentStatus(id: number, newStatus: 'confirmed' | 'pending' | 'cancelled') {
    const currentUser = this.firebaseService.getCurrentUser();
    if (!currentUser) {
      console.error('User not logged in');
      return;
    }
    
    const appointment = this.appointments.find(apt => apt.id === id);
    if (!appointment) return;
    
    const result = await this.firebaseService.updateRendezvous(
      currentUser.uid,
      id.toString(),
      {
        patientId: appointment.patientId.toString(),
        date: appointment.date.toISOString().split('T')[0],
        heure: `${appointment.startTime} - ${appointment.endTime}`,
        status: newStatus,
        title: appointment.title,
        description: appointment.description
      }
    );
    
    if (result.success) {
      this.loadFirebaseData(); // Reload data from Firebase
    } else {
      alert(`Erreur: ${result.error}`);
    }
  }
  
  confirmAppointment(id: number) {
    this.changeAppointmentStatus(id, 'confirmed');
  }
  
  markAppointmentAsPending(id: number) {
    this.changeAppointmentStatus(id, 'pending');
  }
  
  cancelAppointment(id: number) {
    this.changeAppointmentStatus(id, 'cancelled');
  }
  
  // Méthode pour obtenir les heures disponibles pour le début d'un RDV
  getAvailableHours(): string[] {
    const hours = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30'
    ];
    
    // Si la date sélectionnée est aujourd'hui, filtrer les heures déjà passées
    const selectedDate = this.appointmentForm.get('date')?.value;
    if (selectedDate) {
      const today = new Date();
      const selected = new Date(selectedDate);
      
      // Vérifier si la date sélectionnée est aujourd'hui
      if (selected.getDate() === today.getDate() && 
          selected.getMonth() === today.getMonth() && 
          selected.getFullYear() === today.getFullYear()) {
        
        // Obtenir l'heure actuelle au format HH:MM
        const currentHour = today.getHours().toString().padStart(2, '0');
        const currentMinute = today.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;
        
        // Filtrer les heures déjà passées
        return hours.filter(hour => hour > currentTime);
      }
    }
    
    return hours;
  }
  
  // Méthode pour obtenir les heures disponibles pour la fin d'un RDV
  getAvailableEndHours(): string[] {
    const startTime = this.appointmentForm.get('startTime')?.value;
    if (!startTime) {
      return this.getAvailableHours().filter(time => time !== '08:00');
    }
    
    const availableHours = this.getAvailableHours();
    const startIndex = availableHours.indexOf(startTime);
    
    return availableHours.slice(startIndex + 1);
  }
}
