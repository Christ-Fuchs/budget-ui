import { DEFAULT_CURRENCY_CODE, enableProdMode, LOCALE_ID } from '@angular/core';

import { environment } from './environments/environment';
import locale from '@angular/common/locales/de-CH';
import { bootstrapApplication } from '@angular/platform-browser';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { PreloadAllModules, provideRouter, RouteReuseStrategy, TitleStrategy, withPreloading } from '@angular/router';
import appRoutes from './app/shared/app.routes';
import { registerLocaleData } from '@angular/common';
import { PageTitleStrategy } from './app/shared/service/page-title-strategy.service';
import AppComponent from './app/app.component';

// Firebase und HTTP Interceptors Imports
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/shared/interceptor/auth.interceptor';

if (environment.production) enableProdMode();

registerLocaleData(locale);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'CHF' },
    { provide: LOCALE_ID, useValue: 'de-CH' },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideIonicAngular(),
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),

    // Neuer Firebase Provider
    { provide: FIREBASE_OPTIONS, useValue: environment.firebaseConfig },

    // Neuer HTTP Client Provider mit Auth Interceptor
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
}).catch(err => console.error(err));
