import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FlabirdComponent } from './components/flabird/flabird.component';
import { CookieService } from 'ngx-cookie-service';

const routes: Routes = [
  {
    path: '',
    component: FlabirdComponent
  }
]

@NgModule({
  imports: [
    CommonModule, RouterModule.forChild(routes)
  ],
  declarations: [FlabirdComponent],
  providers: [CookieService]
})

export class GameModule { }
