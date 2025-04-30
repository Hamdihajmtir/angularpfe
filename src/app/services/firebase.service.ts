import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
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
import { NotificationService } from './notification.service';

interface Secretaire {
  email: string;
  nom: string;
  prenom: string;
  doctorId: string;
  id?: string;
}

interface SecretaireDBData {
  email: string;
  nom: string;
  prenom: string;
  doctorId: string;
}

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

  constructor(private notificationService: NotificationService) {
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
      
      // Récupérer les informations du patient
      const patientResult = await this.getPatientById(doctorId, patientId);
      const patientInfo = patientResult.success ? patientResult.patient : null;
      
      await set(ref(this.db, `medecins/${doctorId}/rendez-vous/${rendezvousId}`), {
        id: rendezvousId,
        patientId: patientId,
        // Ajouter les informations du patient
        patientNom: patientInfo ? patientInfo.nom : '',
        patientPrenom: patientInfo ? patientInfo.prenom : '',
        // Ajouter toutes les informations du rendez-vous
        date: rendezvousData.date,
        heure: rendezvousData.heure,
        title: rendezvousData.title || 'Rendez-vous',
        description: rendezvousData.description || '',
        status: rendezvousData.status || 'pending', // Utiliser le statut fourni ou 'pending' par défaut
        dateCreation: new Date().toISOString()
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
      // Récupérer les informations du patient si patientId est fourni
      let patientInfo = null;
      if (rendezvousData.patientId) {
        const patientResult = await this.getPatientById(doctorId, rendezvousData.patientId);
        patientInfo = patientResult.success ? patientResult.patient : null;
      }
      
      await set(ref(this.db, `medecins/${doctorId}/rendez-vous/${rendezvousId}`), {
        id: rendezvousId,
        patientId: rendezvousData.patientId,
        // Mettre à jour les informations du patient si disponibles
        patientNom: patientInfo ? patientInfo.nom : rendezvousData.patientNom || '',
        patientPrenom: patientInfo ? patientInfo.prenom : rendezvousData.patientPrenom || '',
        // Mettre à jour toutes les informations du rendez-vous
        date: rendezvousData.date,
        heure: rendezvousData.heure,
        title: rendezvousData.title || 'Rendez-vous',
        description: rendezvousData.description || '',
        status: rendezvousData.status || 'pending',
        dateModification: new Date().toISOString()
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
  observeMeasurementsByBraceletCode(braceletCode: string, callback: (measures: any) => void): () => void {
    const measurementsRef = ref(this.db, `Mesures/${braceletCode}`);
    onValue(measurementsRef, async (snapshot) => {
      const measures = snapshot.val();
      
      // Récupérer les informations du patient une seule fois
      const patient = await this.getPatientByBraceletCode(braceletCode);
      if (!patient) {
        callback(measures);
        return;
      }
      
      // Vérification du BPM critique (> 120 ou < 60)
      if (measures.BPM > 120) {
        this.notificationService.addNotification({
          title: 'Alerte BPM Élevé',
          message: `Le patient ${patient.prenom} ${patient.nom} a un BPM de ${measures.BPM} (Tachycardie)`,
          type: 'heart-critical',
          patientId: patient.id,
          patientName: `${patient.prenom} ${patient.nom}`
        });
      } else if (measures.BPM < 60) {
        this.notificationService.addNotification({
          title: 'Alerte BPM Bas',
          message: `Le patient ${patient.prenom} ${patient.nom} a un BPM de ${measures.BPM} (Bradycardie)`,
          type: 'heart-critical',
          patientId: patient.id,
          patientName: `${patient.prenom} ${patient.nom}`
        });
      }
      
      // Vérification du SpO2 (< 95%)
      if (measures.SpO2 < 95) {
        this.notificationService.addNotification({
          title: 'Alerte SpO2 Bas',
          message: `Le patient ${patient.prenom} ${patient.nom} a un SpO2 de ${measures.SpO2}% (Hypoxie)`,
          type: 'oxygen-critical',
          patientId: patient.id,
          patientName: `${patient.prenom} ${patient.nom}`
        });
      }
      
      // Vérification de la température (> 38°C ou < 35°C)
      if (measures.temperature =38) {
        this.notificationService.addNotification({
          title: 'Alerte Fièvre',
          message: `Le patient ${patient.prenom} ${patient.nom} a une température de ${measures.temperature}°C (Hyperthermie)`,
          type: 'temperature-critical',
          patientId: patient.id,
          patientName: `${patient.prenom} ${patient.nom}`
        });
      } else if (measures.temperature < 35) {
        this.notificationService.addNotification({
          title: 'Alerte Hypothermie',
          message: `Le patient ${patient.prenom} ${patient.nom} a une température de ${measures.temperature}°C (Hypothermie)`,
          type: 'temperature-critical',
          patientId: patient.id,
          patientName: `${patient.prenom} ${patient.nom}`
        });
      }
      
      callback(measures);
    });
    
    // Retourner une fonction de nettoyage
    return () => {
      off(measurementsRef);
    };
  }

  // Récupérer un patient par son code de bracelet
  async getPatientByBraceletCode(braceletCode: string) {
    try {
      // Récupérer tous les médecins
      const doctorsSnapshot = await get(child(ref(this.db), 'medecins'));
      if (!doctorsSnapshot.exists()) {
        return null;
      }
      
      const doctors = doctorsSnapshot.val();
      
      // Parcourir tous les médecins et leurs patients
      for (const doctorId in doctors) {
        const doctor = doctors[doctorId];
        if (doctor.patients) {
          for (const patientId in doctor.patients) {
            const patient = doctor.patients[patientId];
            if (patient.code === braceletCode) {
              return {
                ...patient,
                id: patientId,
                doctorId: doctorId
              };
            }
          }
        }
      }
      
      return null;
    } catch (error: any) {
      console.error("Erreur lors de la récupération du patient par code de bracelet:", error);
      return null;
    }
  }

  // Inscription d'un administrateur
  async registerAdmin(email: string, password: string, userData: any) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      await set(ref(this.db, 'admins/' + user.uid), {
        nom: userData.nom,
        prenom: userData.prenom,
        email: userData.email,
        uid: user.uid
      });
      
      return { success: true, user }; 
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      return { success: false, error: error.message };
    }
  }

  // Connexion d'un administrateur
  async loginAdmin(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      const snapshot = await get(child(ref(this.db), `admins/${user.uid}`));
      if (snapshot.exists()) {
        return { success: true, user: snapshot.val() };
      } else {
        throw new Error("Données utilisateur non trouvées");  
      }
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer tous les médecins
  async getAllDoctors() {
    try {
      const snapshot = await get(child(ref(this.db), 'medecins'));
      if (snapshot.exists()) {
        return { success: true, doctors: snapshot.val() };
      } else {
        return { success: true, doctors: {} };
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des médecins:", error);
      return { success: false, error: error.message };
    }
  }

  // Supprimer un médecin
  async deleteDoctor(doctorId: string) {
    try {
      await set(ref(this.db, `medecins/${doctorId}`), null);
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la suppression du médecin:", error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour un médecin
  async updateDoctor(doctorId: string, doctorData: any) {
    try {
      await set(ref(this.db, `medecins/${doctorId}`), {
        ...doctorData,
        uid: doctorId
      });
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du médecin:", error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour le mot de passe
  async updatePassword(currentPassword: string, newPassword: string) {
    try {
      const user = this.auth.currentUser;
      if (!user || !user.email) throw new Error('Utilisateur non connecté');

      // Réauthentifier l'utilisateur avant de changer le mot de passe
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Mettre à jour le mot de passe
      await updatePassword(user, newPassword);
      
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du mot de passe:", error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour les paramètres
  async updateSettings(path: string, settings: any) {
    try {
      await set(ref(this.db, path), settings);
      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour des paramètres:", error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer les paramètres
  async getSettings(path: string) {
    try {
      const snapshot = await get(ref(this.db, path));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error: any) {
      console.error("Erreur lors de la récupération des paramètres:", error);
      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      return { success: false, error: error.message };
    }
  }

  // Connexion d'un secrétaire et récupération des informations du médecin associé
  async loginSecretaire(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Récupérer tous les médecins
      const medecinsRef = ref(this.db, 'medecins');
      const medecinsSnapshot = await get(medecinsRef);

      if (!medecinsSnapshot.exists()) {
        throw new Error("Compte secrétaire non trouvé");
      }

      const medecinsData = medecinsSnapshot.val();
      let secretaireData: any = null;
      let doctorId: string | null = null;

      // Parcourir tous les médecins et leurs secrétaires
      for (const [medId, medecin] of Object.entries(medecinsData) as [string, any][]) {
        if (medecin.secretaires) {
          for (const [secId, secretaire] of Object.entries(medecin.secretaires) as [string, any][]) {
            if (secretaire.email === email) {
              secretaireData = { ...secretaire, id: secId };
              doctorId = medId;
              break;
            }
          }
        }
        if (secretaireData) break;
      }

      if (!secretaireData || !doctorId) {
        throw new Error("Compte secrétaire non trouvé");
      }

      // Récupérer les données du médecin associé
      const medecinData = medecinsData[doctorId];

      // Créer les données de session
      const sessionData = {
        ...medecinData,
        isSecretaire: true,
        secretaireId: secretaireData.id,
        secretaireNom: secretaireData.nom,
        secretairePrenom: secretaireData.prenom,
        originalEmail: email
      };

      // 5. Sauvegarder les données de session
      localStorage.setItem('user', JSON.stringify(sessionData));
      this.user.next(sessionData);
      
      console.log("Connexion secrétaire réussie:", sessionData);
      return { success: true, user: sessionData };
    } catch (error: any) {
      console.error("Erreur de connexion secrétaire:", error);
      return { success: false, error: "Compte secrétaire non trouvé" };
    }
  }

  // Inscription d'un secrétaire
  async registerSecretaire(email: string, password: string, userData: any) {
    try {
      console.log("Début de l'inscription du secrétaire:", email);
      
      // Vérifier le format du CIN (exactement 8 chiffres)
      const cinRegex = /^[0-9]{8}$/;
      if (!cinRegex.test(userData.cin)) {
        console.log("Format CIN invalide. Le CIN doit contenir exactement 8 chiffres :", userData.cin);
        return { success: false, error: "Le CIN doit contenir exactement 8 chiffres." };
      }

      // Vérifier si le CIN existe déjà dans la base de données
      const medecinsRef = ref(this.db, 'medecins');
      const medecinsSnapshot = await get(medecinsRef);
      
      if (medecinsSnapshot.exists()) {
        const medecinsData = medecinsSnapshot.val();
        
        // Vérifier parmi les médecins
        for (const medecin of Object.values(medecinsData) as any[]) {
          if (medecin.cin === userData.cin) {
            console.log("Ce CIN existe déjà pour un médecin:", userData.cin);
            return { success: false, error: "Ce CIN existe déjà dans la base de données." };
          }

          // Vérifier parmi les secrétaires de chaque médecin
          if (medecin.secretaires) {
            for (const secretaire of Object.values(medecin.secretaires) as any[]) {
              if (secretaire.cin === userData.cin) {
                console.log("Ce CIN existe déjà pour un secrétaire:", userData.cin);
                return { success: false, error: "Ce CIN existe déjà dans la base de données." };
              }
            }
          }

          // Vérifier parmi les patients de chaque médecin
          if (medecin.patients) {
            for (const patient of Object.values(medecin.patients) as any[]) {
              if (patient.cin === userData.cin) {
                console.log("Ce CIN existe déjà pour un patient:", userData.cin);
                return { success: false, error: "Ce CIN existe déjà dans la base de données." };
              }
            }
          }
        }
      }

      // Vérifier si le médecin sélectionné a déjà un secrétaire (peu importe l'email)
      const medecinRef = ref(this.db, `medecins/${userData.doctorId}/secretaires`);
      const medecinSecretairesSnapshot = await get(medecinRef);
      if (medecinSecretairesSnapshot.exists()) {
        const secretairesData = medecinSecretairesSnapshot.val();
        if (Object.keys(secretairesData).length > 0) {
          console.log("Ce médecin a déjà un secrétaire !");
          return { success: false, error: "Ce médecin a déjà un secrétaire." };
        }
      }
      
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      console.log("Utilisateur créé avec succès:", user.uid);
      
      // Préparer les données du secrétaire
      const secretaireData = {
        nom: userData.nom,
        prenom: userData.prenom,
        email: email,
        telephone: userData.telephone,
        cin: userData.cin,
        doctorId: userData.doctorId,
        uid: user.uid,
        role: 'secretaire',
        dateCreation: new Date().toISOString()
      };
      
      console.log("Données du secrétaire à enregistrer:", secretaireData);
      
      // Stocker les données dans la collection 'secretaires'
      await set(ref(this.db, `medecins/${userData.doctorId}/secretaires/${user.uid}`), secretaireData);
      console.log("Données du secrétaire enregistrées avec succès");
      
      return { success: true, user };
    } catch (error: any) {
      console.error("Erreur d'inscription du secrétaire:", error);
      return { success: false, error: error.message };
    }
  }

  // Vérifier si un email correspond à un médecin
  async checkIfMedecin(email: string): Promise<boolean> {
    try {
      const snapshot = await get(ref(this.db, 'medecins'));
      if (!snapshot.exists()) {
        return false;
      }
      
      const medecins = snapshot.val();
      
      // Parcourir tous les médecins pour trouver l'email
      for (const medecinId in medecins) {
        const medecin = medecins[medecinId];
        if (medecin.email === email) {
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      console.error("Erreur lors de la vérification du médecin:", error);
      return false;
    }
  }
} 
