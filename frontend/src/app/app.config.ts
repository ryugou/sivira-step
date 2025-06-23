import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFunctions, getFunctions, connectFunctionsEmulator } from '@angular/fire/functions';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideFirebaseApp(() => {
      const app = initializeApp(environment.firebase);
      console.log('Firebase app initialized:', app.name, app.options.projectId);
      return app;
    }),
    provideAuth(() => {
      const auth = getAuth();
      console.log('Firebase Auth initialized:', auth.app.name);
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      console.log('Firestore initialized:', firestore.app.name);
      return firestore;
    }),
    provideFunctions(() => {
      const functions = getFunctions(undefined, 'us-central1');
      console.log('Firebase Functions initialized:', functions.app.name, functions.region);
      return functions;
    })
  ]
};
