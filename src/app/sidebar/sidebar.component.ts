import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe]
})
export class SidebarComponent {
  menuItems = [
    { path: '/dashboard', icon: 'bx-home', label: 'dashboard' },
    { path: '/patients', icon: 'bx-user', label: 'patients' },
    { path: '/appointments', icon: 'bx-calendar', label: 'appointments' },
    { path: '/settings', icon: 'bx-cog', label: 'settings' }
  ];
} 