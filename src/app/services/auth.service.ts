import { Injectable } from '@angular/core';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Add missing method
  getCurrentUser() {
    // Return the current user as an Observable
    return of(localStorage.getItem('user') ? 
      JSON.parse(localStorage.getItem('user')!) : null);
  }
  
  // Service implementation...
} 