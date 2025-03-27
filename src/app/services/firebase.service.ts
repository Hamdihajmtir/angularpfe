import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get,
  child,
  onValue,
  off
} from 'firebase/database';
import { BehaviorSubject } from 'rxjs';
import { catchError, of, map, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private user = new BehaviorSubject<any>(null);
  currentUser = this.user.asObservable();

  private firebaseConfig = {
    apiKey: "AIzaSyAy8YX8Gwd_yWoJtw0k-ukCOSF1b_Ip9jQ",
    databaseURL: "https://bbbbb-c684a-default-rtdb.firebaseio.com/",
    projectId: "bbbbb-c684a",
    authDomain: "bbbbb-c684a.firebaseapp.com",
    storageBucket: "bbbbb-c684a.appspot.com",
  };

  private app = initializeApp(this.firebaseConfig);
  private auth = getAuth(this.app);
  private db = getDatabase(this.app);

  constructor() {
    // Récupérer l'état de connexion au démarrage
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user.next(JSON.parse(userData));
    }
  }

  // Inscription d'un nouveau médecin
  async registerDoctor(email: string, password: string, userData: any) {
    try {
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Ajouter les données du médecin dans Realtime Database
      await set(ref(this.db, 'medecins/' + user.uid), {
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        uid: user.uid,
        patients: {}
      });
      
      return { success: true, user };
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      return { success: false, error: error.message };
    }
  }

  // Connexion d'un médecin
  async loginDoctor(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Récupérer les données complètes du médecin
      const snapshot = await get(child(ref(this.db), `medecins/${user.uid}`));
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        // Stocker les données utilisateur en local
        localStorage.setItem('user', JSON.stringify(userData));
        this.user.next(userData);
        return { success: true, user: userData };
      } else {
        throw new Error("Données utilisateur non trouvées");
      }
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      return { success: false, error: error.message };
    }
  }

  // Déconnexion
  async logout() {
    try {
      await signOut(this.auth);
      localStorage.removeItem('user');
      this.user.next(null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Ajouter un patient pour un médecin
  async addPatient(doctorId: string, patientData: any) {
    try {
      const patientId = new Date().getTime().toString(); // Génère un ID unique basé sur le timestamp
      await set(ref(this.db, `medecins/${doctorId}/patients/${patientId}`), {
        id: patientId,
        nom: patientData.nom,
        prenom: patientData.prenom,
        age: patientData.age,
        genre: patientData.genre,
        tel: patientData.phone || '',
        cin: patientData.cin,
        code: patientData.braceletCode,
        imageUrl: patientData.imageUrl || '',
        dateCreation: new Date().toISOString()
      });
      return { success: true, patientId };
    } catch (error: any) {
      console.error("Erreur lors de l'ajout du patient:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les patients d'un médecin
  async getPatientsForDoctor(doctorId: string) {
    try {
      const snapshot = await get(child(ref(this.db), `medecins/${doctorId}/patients`));
      if (snapshot.exists()) {
        return { success: true, patients: snapshot.val() };
      } else {
        return { success: true, patients: {} };
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des patients:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer l'utilisateur actuel
  getCurrentUser() {
    return this.user.value;
  }

  getMedecinByUid(uid: string) {
    return from(get(child(ref(this.db), `medecins/${uid}`))).pipe(
      map(snapshot => snapshot.exists() ? snapshot.val() : null),
      catchError(error => {
        console.error('Error fetching medecin data:', error);
        return of(null);
      })
    );
  }

  // Supprimer un patient
  async deletePatient(doctorId: string, patientId: string) {
    try {
      await set(ref(this.db, `medecins/${doctorId}/patients/${patientId}`), null);
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la suppression du patient:", error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour un patient existant
  async updatePatient(doctorId: string, patientId: string, patientData: any) {
    try {
      // Conserver l'ID du patient existant
      await set(ref(this.db, `medecins/${doctorId}/patients/${patientId}`), {
        id: patientId, // Crucial: garder le même ID
        nom: patientData.nom,
        prenom: patientData.prenom,
        age: patientData.age,
        genre: patientData.genre,
        tel: patientData.phone || '',
        cin: patientData.cin,
        code: patientData.braceletCode,
        imageUrl: patientData.imageUrl || '',
        dateModification: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du patient:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer un patient par son ID
  async getPatientById(doctorId: string, patientId: string) {
    try {
      const snapshot = await get(child(ref(this.db), `medecins/${doctorId}/patients/${patientId}`));
      if (snapshot.exists()) {
        return { success: true, patient: snapshot.val() };
      } else {
        return { success: false, error: 'Patient non trouvé' };
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération du patient:", error);
      return { success: false, error: error.message };
    }
  }


  // Ajouter un rendez-vous
  async addRendezvous(doctorId: string, patientId: string, rendezvousData: any) {
    try {
      const rendezvousId = new Date().getTime().toString(); // Génère un ID unique basé sur le timestamp
      await set(ref(this.db, `medecins/${doctorId}/rendez-vous/${rendezvousId}`), {
        id: rendezvousId,
        patientId: patientId,
        date: rendezvousData.date,
        heure: rendezvousData.heure,
        status: 'pending' // Par défaut, le rendez-vous est en attente
      });
      return { success: true, rendezvousId };
    } catch (error: any) {
      console.error("Erreur lors de l'ajout du rendez-vous:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les rendez-vous d'un patient
  async getRendezvousForPatient(doctorId: string, patientId: string) {
    try {
      const snapshot = await get(child(ref(this.db), `medecins/${doctorId}/rendez-vous/${patientId}`));
      if (snapshot.exists()) {
        return { success: true, rendezvous: snapshot.val() };
      } else {
        return { success: true, rendezvous: {} };
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des rendez-vous:", error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour un rendez-vous existant
  async updateRendezvous(doctorId: string, rendezvousId: string, rendezvousData: any) {
    try { 
      await set(ref(this.db, `medecins/${doctorId}/rendez-vous/${rendezvousId}`), {
        id: rendezvousId,
        patientId: rendezvousData.patientId,
        date: rendezvousData.date,
        heure: rendezvousData.heure,
        status: rendezvousData.status
      });
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du rendez-vous:", error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer un rendez-vous
  async deleteRendezvous(doctorId: string, rendezvousId: string) {
    try {
      await set(ref(this.db, `medecins/${doctorId}/rendez-vous/${rendezvousId}`), null);
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la suppression du rendez-vous:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer tous les rendez-vous d'un médecin
  async getAllRendezvous(doctorId: string) {
    try {
      const snapshot = await get(child(ref(this.db), `medecins/${doctorId}/rendez-vous`));
      if (snapshot.exists()) {
        return { success: true, rendezvous: snapshot.val() };
      } else {
        return { success: true, rendezvous: {} };
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des rendez-vous:", error);
      return { success: false, error: error.message };
    }
  }

  // Ajouter un rapport médical
  async addMedicalReport(doctorId: string, patientId: string, reportData: any) {
    try {
      const reportId = new Date().getTime().toString(); // Génère un ID unique basé sur le timestamp
      await set(ref(this.db, `medecins/${doctorId}/rapports/${patientId}/${reportId}`), {
        id: reportId,
        patientId: patientId,
        date: reportData.date,
        rapport: reportData.rapport
      });
      return { success: true, reportId };
    } catch (error: any) {
      console.error("Erreur lors de l'ajout du rapport médical:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer tous les rapports médicaux d'un patient
  async getAllMedicalReports(doctorId: string, patientId: string) {
    try {
      const snapshot = await get(child(ref(this.db), `medecins/${doctorId}/rapports/${patientId}`));
      if (snapshot.exists()) {
        return { success: true, reports: snapshot.val() };  
      } else {
        return { success: true, reports: {} };
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des rapports médicaux:", error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour un rapport médical existant
  async updateMedicalReport(doctorId: string, patientId: string, reportId: string, reportData: any) {
    try {
      await set(ref(this.db, `medecins/${doctorId}/rapports/${patientId}/${reportId}`), {
        id: reportId,
        patientId: patientId,
        date: reportData.date,
        rapport: reportData.rapport
      });
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du rapport médical:", error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer un rapport médical
  async deleteMedicalReport(doctorId: string, patientId: string, reportId: string) {
    try {
      await set(ref(this.db, `medecins/${doctorId}/rapports/${patientId}/${reportId}`), null);
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la suppression du rapport médical:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les mesures vitales par code bracelet
  async getMeasurementsByBraceletCode(braceletCode: string) {
    try {
      const snapshot = await get(child(ref(this.db), `Mesures/${braceletCode}`));
      if (snapshot.exists()) {
        return { success: true, measures: snapshot.val() };
      } else {
        return { success: false, measures: null };
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des mesures:", error);
      return { success: false, error: error.message, measures: null };
    }
  }

  // Observer les mesures vitales en temps réel par code bracelet
  observeMeasurementsByBraceletCode(braceletCode: string, callback: (measures: any) => void) {
    try {
      const measureRef = ref(this.db, `Mesures/${braceletCode}`);
      
      // Configurer l'écouteur pour les mises à jour en temps réel
      onValue(measureRef, (snapshot) => {
        if (snapshot.exists()) {
          callback({ success: true, measures: snapshot.val() });
        } else {
          callback({ success: false, measures: null });
        }
      });
      
      // Retourner une fonction pour arrêter l'écoute plus tard si nécessaire
      return () => off(measureRef);
    } catch (error: any) {
      console.error("Erreur lors de l'observation des mesures:", error);
      callback({ success: false, error: error.message, measures: null });
      return () => {}; // Fonction vide en cas d'erreur
    }
  }
  
} 