import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideServerRendering } from '@angular/platform-server';
import { provideRouter } from '@angular/router';

const bootstrap = () => bootstrapApplication(AppComponent, {
  providers: [
    provideServerRendering(),
    provideRouter([])
  ]
});

export default bootstrap;
