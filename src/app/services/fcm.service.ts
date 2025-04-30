import { Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { BehaviorSubject } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class FCMService {
  private messaging = getMessaging();
  private currentToken = new BehaviorSubject<string | null>(null);
  currentToken$ = this.currentToken.asObservable();

  constructor(private firebaseService: FirebaseService, private notificationService: NotificationService) {
    this.requestPermission();
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await this.getToken();
        this.currentToken.next(token);
        this.saveTokenToFirebase(token);
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
    }
  }

  private async getToken() {
    try {
      const token = await getToken(this.messaging, {
        vapidKey: 'VOTRE_CLE_VAPID',
        serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          messagingSenderId: '66910013812'
        })
      });
      return token;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  private async saveTokenToFirebase(token: string | null) {
    if (!token) return;
    
    const currentUser = this.firebaseService.getCurrentUser();
    if (currentUser && currentUser.uid) {
      try {
        await this.firebaseService.updateSettings(
          `users/${currentUser.uid}/fcmToken`,
          token
        );
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du token:', error);
      }
    }
  }

  onMessage() {
    return onMessage(this.messaging, (payload) => {
      console.log('Message reçu:', payload);
      // Créer une notification
      const notification = new Notification(payload.notification?.title || '', {
        body: payload.notification?.body,
        icon: '/assets/icons/icon-128x128.png'
      });

      // Ajouter la notification au service de notification
      this.notificationService.addNotification({
        title: payload.notification?.title || '',
        message: payload.notification?.body || '',
        type: 'info',
        patientId: payload.data?.['patientId'],
        patientName: payload.data?.['patientName']
      });
    });
  }
} 