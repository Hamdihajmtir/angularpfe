import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'warning' | 'info' | 'error' | 'heart-critical' | 'oxygen-critical' | 'temperature-critical';
  patientId?: string;
  patientName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  constructor() {
    // Charger les notifications depuis le localStorage au démarrage
    this.loadNotifications();
  }

  private loadNotifications() {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      this.notifications = JSON.parse(savedNotifications);
      this.notificationsSubject.next(this.notifications);
    }
  }

  private saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification);
    this.notificationsSubject.next(this.notifications);
    this.saveNotifications();
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notificationsSubject.next(this.notifications);
      this.saveNotifications();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.notificationsSubject.next(this.notifications);
    this.saveNotifications();
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notificationsSubject.next(this.notifications);
    this.saveNotifications();
  }

  clearAll() {
    this.notifications = [];
    this.notificationsSubject.next(this.notifications);
    this.saveNotifications();
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  showInfo(message: string, title: string) {
    this.addNotification({
      title,
      message,
      type: 'info'
    });
  }
} 