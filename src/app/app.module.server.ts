import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppComponent } from './app.component';
import { LayoutComponent } from './layout/layout.component';
import { provideServerRendering } from '@angular/platform-server';
import { provideRouter } from '@angular/router';
import { serverRoutes } from './app.routes.server';

@NgModule({
  imports: [
    ServerModule,
    LayoutComponent
  ],
  providers: [
    provideServerRendering(),
    provideRouter(serverRoutes)
  ]
})
export class AppServerModule {}
