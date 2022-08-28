import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FronteggAuthGuard } from '@frontegg/angular';
import { HomeComponent } from './components/home/home.component';
import { RoomComponent } from './components/room/room.component';

const routes: Routes = [
  { path: ':id', canActivate: [FronteggAuthGuard], component: RoomComponent },
  { path: '**', component: HomeComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
