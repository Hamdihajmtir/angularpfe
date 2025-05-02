import { NgModule } from '@angular/core';
import { LayoutComponent } from './layout.component';
import { BraceletComponent } from '../bracelet/bracelet.component';

@NgModule({
  declarations: [
    LayoutComponent,
  ],
  imports: [
    BraceletComponent
  ],
})
export class LayoutModule { } 