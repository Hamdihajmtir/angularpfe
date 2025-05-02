import { Component, OnInit, AfterViewInit, Renderer2, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ThemeService } from '../services/theme.service';
import { LanguageService } from '../services/language.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHeartPulse } from '@fortawesome/free-solid-svg-icons';
import { NotificationPanelComponent } from '../components/notification-panel/notification-panel.component';
import { FirebaseService } from '../services/firebase.service';
import { BraceletComponent } from '../bracelet/bracelet.component';

interface Patient {
  id: string;
  nom: string;
  prenom: string;
  age: number;
  genre: string;
  tel?: string;
  cin: string;
  code: string;
  imageUrl?: string;
}

// Nouvelle interface pour les rendez-vous
interface Appointment {
  id: string;
  patientId: string;
  date: Date;
  time: string;
  notes?: string;
  status?: 'confirmed' | 'waiting' | 'cancelled' | 'completed';
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TranslatePipe,
    NotificationPanelComponent,
    BraceletComponent
  ]
})
export class LayoutComponent implements OnInit, AfterViewInit {
  isDarkMode = false;
  currentYear = new Date().getFullYear();
  currentTheme: string = 'theme-light';
  currentView: string = 'dashboard';
  days: {number: number, isWeekend: boolean}[] = [];
  currentDate: Date = new Date();
  daysInMonth: Date[] = [];
  
  @ViewChild('sidebar') sidebar!: ElementRef;
  @ViewChild('menuBar') menuBar!: ElementRef;
  @ViewChild('searchForm') searchForm!: ElementRef;
  @ViewChild('searchIcon') searchIcon!: ElementRef;
  @ViewChild('switchMode') switchMode!: ElementRef;
  
  private _lastToggleTime: number = 0;
  
  // Modal et formulaire
  isPatientModalOpen: boolean = false;
  patientForm!: FormGroup;
  imagePreview: string | null = null;
  patients: Patient[] = [];
  
  editingPatient: Patient | null = null;
  
  // Nouvelles propriétés pour les rendez-vous
  appointments: Appointment[] = [];
  isAppointmentModalOpen: boolean = false;
  appointmentForm!: FormGroup;
  selectedDate: Date | null = null;
  
  isSidebarCollapsed = false;
  currentLanguage = 'fr';
  
  faHeartPulse = faHeartPulse;
  
  isRtl: boolean = false;
  
  isBraceletModalOpen = false;
  
  constructor(
    private themeService: ThemeService,
    private renderer: Renderer2,
    private formBuilder: FormBuilder,
    private languageService: LanguageService,
    private router: Router,
    private firebaseService: FirebaseService
  ) {}
  
  ngOnInit(): void {
    console.log('Component initialized');
    
    // Vérifier l'authentification
    const user = this.firebaseService.getCurrentUser();
    if (!user) {
      console.log('Utilisateur non connecté, redirection vers la page de login');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('Utilisateur connecté:', user);
    
    // Initialiser le formulaire de patient
    this.patientForm = this.formBuilder.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      age: ['', [Validators.required, Validators.min(0)]],
      genre: ['', Validators.required],
      tel: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      cin: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      code: ['', Validators.required],
      imageUrl: ['']
    });
    
    // Initialiser le formulaire de rendez-vous
    this.appointmentForm = this.formBuilder.group({
      patientId: ['', Validators.required],
      time: ['', Validators.required],
      notes: ['']
    });

    this.languageService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
      this.isRtl = lang === 'ar';
      this.adjustLayout();
    });
  }
  
  ngAfterViewInit() {
    this.initSidebar();
    this.setupMenuListeners();
    this.adjustSidebar();
    this.setupDarkModeToggle();
    
    // Initialize all menus to be closed
    document.querySelectorAll('.menu').forEach(menu => {
      this.renderer.setStyle(menu, 'display', 'none');
    });
  }
  
  // Active menu item selection
  setActiveMenuItem(event: Event, menuItem: HTMLElement) {
    // Remove active class from all menu items
    const allMenuItems = document.querySelectorAll('#sidebar .side-menu.top li');
    allMenuItems.forEach(item => {
      this.renderer.removeClass(item, 'active');
    });
    
    // Add active class to clicked menu item parent (li)
    const li = menuItem.parentElement;
    if (li) {
      this.renderer.addClass(li, 'active');
    }
  }
  
  // Toggle sidebar visibility
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
  
  // Adjust sidebar based on window size
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.adjustSidebar();
  }
  
  @HostListener('window:load', ['$event'])
  onLoad() {
    this.adjustSidebar();
  }
  
  adjustSidebar() {
    if (!this.sidebar?.nativeElement) return;
    
    const isMobile = window.innerWidth <= 576;
    if (isMobile) {
      this.sidebar.nativeElement.classList.add('hide');
      this.sidebar.nativeElement.classList.remove('show');
    } else {
      this.sidebar.nativeElement.classList.remove('hide');
      this.sidebar.nativeElement.classList.add('show');
    }
  }
  
  // Toggle search form on mobile
  toggleSearchForm(event: Event, searchForm: HTMLElement, searchIcon: HTMLElement) {
    if (window.innerWidth < 768) {
      event.preventDefault();
      
      searchForm.classList.toggle('show');
      if (searchForm.classList.contains('show')) {
        searchIcon.classList.replace('bx-search', 'bx-x');
      } else {
        searchIcon.classList.replace('bx-x', 'bx-search');
      }
    }
  }
  
  // Dark mode setup and toggle
  setupDarkModeToggle() {
    if (this.switchMode?.nativeElement) {
      this.switchMode.nativeElement.checked = this.isDarkMode;
      
      this.renderer.listen(this.switchMode.nativeElement, 'change', () => {
        this.toggleDarkMode();
      });
    }
  }
  
  // Toggle dark mode
  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }
  
  // Toggle notification menu
  toggleNotificationMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    const notificationMenu = document.querySelector('.notification-menu');
    const profileMenu = document.querySelector('.profile-menu');
    
    if (notificationMenu) {
      notificationMenu.classList.toggle('show');
    }
    
    if (profileMenu && profileMenu.classList.contains('show')) {
      profileMenu.classList.remove('show');
    }
  }
  
  // Toggle profile menu
  toggleProfileMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    const profileMenu = document.querySelector('.profile-menu');
    const notificationMenu = document.querySelector('.notification-menu');
    
    if (profileMenu) {
      profileMenu.classList.toggle('show');
    }
    
    if (notificationMenu && notificationMenu.classList.contains('show')) {
      notificationMenu.classList.remove('show');
    }
  }
  
  // Close menus when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const targetElement = event.target as HTMLElement;
    
    if (!targetElement.closest('.notification') && !targetElement.closest('.profile')) {
      const notificationMenu = document.querySelector('.notification-menu');
      const profileMenu = document.querySelector('.profile-menu');
      
      if (notificationMenu && notificationMenu.classList.contains('show')) {
        notificationMenu.classList.remove('show');
      }
      
      if (profileMenu && profileMenu.classList.contains('show')) {
        profileMenu.classList.remove('show');
      }
    }
  }
  
  // Toggle specific menu
  toggleMenu(menuId: string) {
    const menu = document.getElementById(menuId);
    const allMenus = document.querySelectorAll('.menu');
    
    // Close all other menus
    allMenus.forEach(m => {
      if (m.id !== menuId) {
        this.renderer.setStyle(m, 'display', 'none');
      }
    });
    
    // Toggle requested menu
    if (menu) {
      const display = window.getComputedStyle(menu).display;
      if (display === 'none' || display === '') {
        this.renderer.setStyle(menu, 'display', 'block');
      } else {
        this.renderer.setStyle(menu, 'display', 'none');
      }
    }
  }
  
  // Setup sidebar event listeners 
  private initSidebar() {
    if (this.menuBar?.nativeElement) {
      this.renderer.listen(this.menuBar.nativeElement, 'click', () => {
        this.toggleSidebar();
      });
    }
  }
  
  // Setup listeners for all menu items
  private setupMenuListeners() {
    const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');
    allSideMenu.forEach(item => {
      this.renderer.listen(item, 'click', (event) => {
        // Empêcher la navigation par défaut pour les liens
        event.preventDefault();
        
        // Supprimer la classe active de tous les éléments
        allSideMenu.forEach(i => {
          const parentLi = i.parentElement;
          if (parentLi) {
            this.renderer.removeClass(parentLi, 'active');
          }
        });
        
        // Ajouter la classe active au parent du lien cliqué
        const li = item.parentElement;
        if (li) {
          this.renderer.addClass(li, 'active');
        }
      });
    });
  }
  
  // Méthodes pour la modale
  openPatientModal(patient?: Patient) {
    if (patient) {
      this.editingPatient = patient;
      this.patientForm.patchValue({
        nom: patient.nom,
        prenom: patient.prenom,
        age: patient.age,
        genre: patient.genre
      });
      this.imagePreview = patient.imageUrl || null;
    } else {
      this.editingPatient = null;
      this.patientForm.reset();
      this.imagePreview = null;
    }
    
    this.isPatientModalOpen = true;
    document.body.style.overflow = 'hidden'; // Empêcher le défilement
  }

  closePatientModal(event: Event) {
    if (
      event.target === event.currentTarget || 
      (event.currentTarget as HTMLElement).classList.contains('modal-close')
    ) {
      this.isPatientModalOpen = false;
      document.body.style.overflow = ''; // Réactiver le défilement
      this.patientForm.reset();
      this.imagePreview = null;
      this.editingPatient = null;
    }
  }

  onImagePicked(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Stocker le fichier dans le formulaire
    this.patientForm.patchValue({ imageUrl: file });
    
    // Créer un aperçu de l'image
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  addPatient() {
    if (this.patientForm.invalid) return;

    const formValues = this.patientForm.value;
    
    // Créer un nouvel objet patient
    const newPatient: Patient = {
      id: this.patients.length + 1 + '',
      nom: formValues.nom,
      prenom: formValues.prenom,
      age: formValues.age,
      genre: formValues.genre,
      tel: formValues.tel,
      cin: formValues.cin,
      code: formValues.code,
      imageUrl: this.imagePreview || 'https://placehold.co/600x400/png'
    };

    // Ajouter le patient à la liste
    this.patients.unshift(newPatient);

    // Fermer la modale et réinitialiser le formulaire
    this.isPatientModalOpen = false;
    this.patientForm.reset();
    this.imagePreview = null;
    document.body.style.overflow = ''; // Réactiver le défilement
  }

  updatePatient() {
    if (this.patientForm.invalid || !this.editingPatient) return;

    const formValues = this.patientForm.value;
    
    // Trouver l'index du patient dans le tableau
    const index = this.patients.findIndex(p => p.id === this.editingPatient!.id);
    
    if (index !== -1) {
      // Mettre à jour le patient avec les nouvelles valeurs
      this.patients[index] = {
        ...this.patients[index],
        nom: formValues.nom,
        prenom: formValues.prenom,
        age: formValues.age,
        genre: formValues.genre,
        tel: formValues.tel,
        cin: formValues.cin,
        code: formValues.code,
        imageUrl: this.imagePreview || this.patients[index].imageUrl
      };
    }

    // Fermer la modale et réinitialiser
    this.isPatientModalOpen = false;
    this.patientForm.reset();
    this.imagePreview = null;
    this.editingPatient = null;
    document.body.style.overflow = ''; // Réactiver le défilement
  }

  editPatient(patient: Patient) {
    this.openPatientModal(patient);
  }

  deletePatient(id: string) {
    // Confirmer la suppression
    if (confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
      this.patients = this.patients.filter(patient => patient.id !== id);
    }
  }

  private applyTheme(): void {
    if (this.isDarkMode) {
      document.body.classList.add('dark');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.remove('dark');
      document.body.classList.remove('dark-theme');
    }
  }

  loadThemePreference(): void {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      this.isDarkMode = true;
      document.body.classList.add('dark');
      document.body.classList.remove('dark-theme');
    } else {
      this.isDarkMode = false;
      document.body.classList.remove('dark');
      document.body.classList.remove('dark-theme');
    }
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'theme-light' ? 'theme-dark' : 'theme-light';
    // Enregistrer la préférence
    localStorage.setItem('theme', this.currentTheme);
    // Appliquer le thème au document
    document.body.className = this.currentTheme;
  }

  initCalendarDays() {
    // Créer 31 jours pour le mois
    for (let i = 1; i <= 31; i++) {
      // Les jours 6, 7, 13, 14, etc. sont des week-ends
      const isWeekend = i % 7 === 6 || i % 7 === 0;
      this.days.push({ number: i, isWeekend });
    }
  }
  
  setView(view: string, event: Event) {
    event.preventDefault();
    this.currentView = view;
    
    // Si vous avez besoin de code spécifique lors du changement de vue, 
    // vous pouvez le placer ici, mais le router va maintenant gérer 
    // la navigation et l'affichage du composant approprié
  }

  generateCalendarDays() {
    this.daysInMonth = [];
    
    // Obtenir le premier jour du mois
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    
    // Obtenir le dernier jour du mois
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    
    // Ajuster pour que la semaine commence le lundi (1) au lieu du dimanche (0)
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    // Ajouter les jours du mois précédent
    for (let i = startingDayOfWeek; i > 0; i--) {
      const prevDate = new Date(firstDay);
      prevDate.setDate(prevDate.getDate() - i);
      this.daysInMonth.push(prevDate);
    }
    
    // Ajouter tous les jours du mois courant
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), i);
      this.daysInMonth.push(date);
    }
    
    // Compléter les jours du mois suivant
    const endingDayOfWeek = lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay();
    
    for (let i = 1; i <= endingDayOfWeek; i++) {
      const nextDate = new Date(lastDay);
      nextDate.setDate(nextDate.getDate() + i);
      this.daysInMonth.push(nextDate);
    }
    
    console.log('Jours générés:', this.daysInMonth.length, this.daysInMonth);
  }

  isCurrentDay(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentDate.getMonth();
  }

  // Ajouter ces méthodes pour la navigation du calendrier
  previousMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendarDays();
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendarDays();
  }

  currentMonth() {
    this.currentDate = new Date();
    this.generateCalendarDays();
  }

  // Méthode pour gérer le clic sur un jour du calendrier
  onDayClick(date: Date) {
    this.selectedDate = new Date(date);
    this.openAppointmentModal();
  }

  // Méthodes pour la gestion des rendez-vous
  openAppointmentModal() {
    this.isAppointmentModalOpen = true;
    this.appointmentForm.reset();
    document.body.style.overflow = 'hidden';
  }

  closeAppointmentModal(event: Event) {
    if (
      event.target === event.currentTarget || 
      (event.currentTarget as HTMLElement).classList.contains('modal-close')
    ) {
      this.isAppointmentModalOpen = false;
      document.body.style.overflow = '';
      this.appointmentForm.reset();
      this.selectedDate = null;
    }
  }

  addAppointment() {
    if (this.appointmentForm.invalid || !this.selectedDate) return;

    const formValues = this.appointmentForm.value;
    const selectedPatient = this.patients.find(p => p.id === formValues.patientId);
    
    if (!selectedPatient) return;

    const newAppointment: Appointment = {
      id: Date.now() + '',
      patientId: formValues.patientId,
      date: new Date(this.selectedDate),
      time: formValues.time,
      notes: formValues.notes
    };

    this.appointments.push(newAppointment);
    this.isAppointmentModalOpen = false;
    document.body.style.overflow = '';
    this.appointmentForm.reset();
  }

  // Méthodes pour gérer les actions sur les rendez-vous
  editAppointment(appointment: Appointment) {
    this.selectedDate = new Date(appointment.date);
    
    this.appointmentForm.patchValue({
      patientId: appointment.patientId,
      time: appointment.time,
      notes: appointment.notes
    });
    
    // Stocker l'ID du rendez-vous pour la mise à jour
    this.appointmentForm.addControl('appointmentId', this.formBuilder.control(appointment.id));
    
    this.isAppointmentModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  updateAppointmentStatus(appointmentId: string, status: 'confirmed' | 'waiting' | 'cancelled' | 'completed') {
    const index = this.appointments.findIndex(a => a.id === appointmentId);
    if (index !== -1) {
      this.appointments[index].status = status;
    }
  }

  deleteAppointment(appointmentId: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ?')) {
      this.appointments = this.appointments.filter(a => a.id !== appointmentId);
    }
  }

  // Récupérer les rendez-vous pour une date spécifique
  getAppointmentsForDate(date: Date): Appointment[] {
    return this.appointments.filter(a => 
      a.date.getDate() === date.getDate() && 
      a.date.getMonth() === date.getMonth() && 
      a.date.getFullYear() === date.getFullYear()
    );
  }

  // Vérifier si une date a des rendez-vous
  hasEvent(date: Date): boolean {
    return this.getAppointmentsForDate(date).length > 0;
  }

  // Méthode pour obtenir la classe CSS en fonction du statut du rendez-vous
  getAppointmentStatusClass(status: string): string {
    switch (status) {
      case 'waiting': return 'appointment-waiting';
      case 'cancelled': return 'appointment-cancelled';
      case 'completed': return 'appointment-completed';
      default: return 'appointment-confirmed';
    }
  }

  updateAppointment() {
    if (this.appointmentForm.invalid || !this.selectedDate) return;

    const formValues = this.appointmentForm.value;
    const appointmentId = formValues.appointmentId;
    const selectedPatient = this.patients.find(p => p.id === formValues.patientId);
    
    if (!selectedPatient) return;

    // Trouver l'index du rendez-vous à mettre à jour
    const index = this.appointments.findIndex(a => a.id === appointmentId);
    
    if (index !== -1) {
      this.appointments[index] = {
        ...this.appointments[index],
        patientId: formValues.patientId,
        date: new Date(this.selectedDate),
        time: formValues.time,
        notes: formValues.notes
      };
    }

    this.isAppointmentModalOpen = false;
    document.body.style.overflow = '';
    this.appointmentForm.removeControl('appointmentId');
    this.appointmentForm.reset();
  }

  translate(key: string): string {
    return this.languageService.translate(key);
  }

  logout(event: Event) {
    event.preventDefault();
    // Déconnexion de Firebase
    this.firebaseService.logout().then(() => {
      // Clear auth data
      localStorage.removeItem('user');
      // Navigate to login page
      this.router.navigate(['/login']);
    });
  }

  private adjustLayout(): void {
    if (this.isRtl) {
      document.body.classList.add('rtl-layout');
    } else {
      document.body.classList.remove('rtl-layout');
    }
  }

  openBraceletModal(event: Event): void {
    event.preventDefault();
    this.isBraceletModalOpen = true;
  }

  closeBraceletModal(event: Event): void {
    event.preventDefault();
    this.isBraceletModalOpen = false;
  }
}
