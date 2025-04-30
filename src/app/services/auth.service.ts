import { Injectable } from '@angular/core';
import { of } from 'rxjs';
// Import Firebase authentication with the specific function
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Add Firebase auth property
  private auth = getAuth();
  
  // Add missing method
  getCurrentUser() {
    // Return the current user as an Observable
    return of(localStorage.getItem('user') ? 
      JSON.parse(localStorage.getItem('user')!) : null);
  }
  
  /**
   * Sends a password reset email to the specified email address
   * @param email The user's email address
   */
  sendPasswordResetEmail(email: string): Promise<void> {
    // Use the standalone function with auth instance
    return sendPasswordResetEmail(this.auth, email);
  }
  
  // Service implementation...
} 