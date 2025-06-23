import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private firebaseAuth: Auth) {
    onAuthStateChanged(this.firebaseAuth, (user) => {
      this.userSubject.next(user);
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.firebaseAuth, email, password);
    } catch (error) {
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<void> {
    try {
      await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
    } catch (error) {
      throw error;
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.firebaseAuth, provider);
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.firebaseAuth);
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get auth(): Auth {
    return this.firebaseAuth;
  }

  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }
}