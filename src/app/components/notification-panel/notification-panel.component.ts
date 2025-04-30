import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBell, faTimes, faCheck, faHeartbeat, faLungs, faThermometerHalf, faExclamationTriangle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  template: `
    <div class="notification-icon" (click)="toggleNotificationMenu($event)">
      <fa-icon [icon]="faBell"></fa-icon>
      <span class="notification-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
    </div>

    <div class="notification-panel" *ngIf="isOpen">
      <div class="notification-header">
        <h3>Notifications</h3>
        <button class="close-btn" (click)="toggleNotificationMenu($event)">
          <fa-icon [icon]="faTimes"></fa-icon>
        </button>
      </div>

      <div class="notification-actions">
        <button class="mark-all-read" (click)="markAllAsRead()" *ngIf="unreadCount > 0">
          Tout marquer comme lu
        </button>
      </div>

      <div class="notification-list">
        <div *ngIf="notifications.length === 0" class="no-notifications">
          Aucune notification
        </div>
        
        <div *ngFor="let notification of notifications" 
             class="notification-item" 
             [class.unread]="!notification.read"
             (click)="markAsRead(notification)">
          <div class="notification-icon">
            <fa-icon [icon]="getIconForType(notification.type)" 
                    [class]="notification.type"></fa-icon>
          </div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-time">
              {{ notification.timestamp | date:'short' }}
            </div>
          </div>
          <button class="delete-btn" (click)="removeNotification(notification)">
            <fa-icon [icon]="faTimes"></fa-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-icon {
      position: relative;
      cursor: pointer;
      padding: 8px;
    }

    .notification-badge {
      position: absolute;
      top: 0;
      right: 0;
      background-color: #ff4444;
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 12px;
      min-width: 18px;
      text-align: center;
    }

    .notification-panel {
      position: absolute;
      top: 60px;
      right: 20px;
      width: 350px;
      max-height: 500px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      overflow: hidden;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border-bottom: 1px solid #eee;
    }

    .notification-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #666;
    }

    .notification-actions {
      padding: 10px 15px;
      border-bottom: 1px solid #eee;
    }

    .mark-all-read {
      background: none;
      border: none;
      color: #1E5F74;
      cursor: pointer;
      font-size: 14px;
    }

    .notification-list {
      max-height: 350px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      padding: 15px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .notification-item:hover {
      background-color: #f9f9f9;
    }

    .notification-item.unread {
      background-color: #f0f7ff;
    }

    .notification-icon {
      margin-right: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 50%;
    }

    .notification-icon .warning {
      color: #ff9800;
    }

    .notification-icon .info {
      color: #2196f3;
    }

    .notification-icon .error {
      color: #f44336;
    }

    .notification-content {
      flex: 1;
    }

    .notification-title {
      font-weight: 600;
      margin-bottom: 5px;
    }

    .notification-message {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .notification-time {
      font-size: 12px;
      color: #999;
    }

    .delete-btn {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 5px;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .notification-item:hover .delete-btn {
      opacity: 1;
    }

    .no-notifications {
      padding: 20px;
      text-align: center;
      color: #999;
    }
  `],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ]),
    trigger('notificationItem', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateX(10px)' }))
      ])
    ])
  ]
})
export class NotificationPanelComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  isOpen = false;
  
  // Icônes FontAwesome
  faBell = faBell;
  faTimes = faTimes;
  faCheck = faCheck;
  faHeartbeat = faHeartbeat;
  faLungs = faLungs;
  faThermometerHalf = faThermometerHalf;
  faExclamationTriangle = faExclamationTriangle;
  faInfoCircle = faInfoCircle;

  private subscription: Subscription;

  constructor(private notificationService: NotificationService) {
    this.subscription = new Subscription();
  }

  ngOnInit() {
    this.subscription.add(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.unreadCount = notifications.filter(n => !n.read).length;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  toggleNotificationMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  markAsRead(notification: Notification) {
    this.notificationService.markAsRead(notification.id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  removeNotification(notification: Notification) {
    this.notificationService.removeNotification(notification.id);
  }

  clearAll() {
    this.notificationService.clearAll();
  }

  getIconForType(type: string) {
    switch (type) {
      case 'heart-critical':
        return this.faHeartbeat;
      case 'oxygen-critical':
        return this.faLungs;
      case 'temperature-critical':
        return this.faThermometerHalf;
      case 'warning':
        return this.faExclamationTriangle;
      case 'info':
        return this.faInfoCircle;
      default:
        return this.faBell;
    }
  }

  getColorForType(type: string) {
    switch (type) {
      case 'heart-critical':
        return '#ff4757';
      case 'oxygen-critical':
        return '#2e86de';
      case 'temperature-critical':
        return '#ff9f43';
      case 'warning':
        return '#ffa502';
      case 'info':
        return '#1e5f74';
      default:
        return '#1e5f74';
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-container')) {
      this.isOpen = false;
    }
  }
} 