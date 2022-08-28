import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { FronteggAppModule, FronteggComponent } from '@frontegg/angular';
import { NgxSpinnerModule } from "ngx-spinner";

import { environment } from '../environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HomeComponent } from './components/home/home.component';
import { RoomComponent } from './components/room/room.component';
import { ApiService } from './services/api.service';
import { PreviewComponent } from './components/preview/preview.component';
import { ScheduleListPipe } from './pipes/schedule-list.pipe';

@NgModule({
    declarations: [
        AppComponent,
        HomeComponent,
        RoomComponent,
        PreviewComponent,
        ScheduleListPipe
    ],
    imports: [
        CommonModule,
        FormsModule,
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        NgxSpinnerModule,
        ToastrModule.forRoot(),
        FronteggAppModule.forRoot({
            contextOptions: {
                baseUrl: environment.fronteggUrl
            },
        }),
        BrowserModule.withServerTransition({ appId: 'serverApp' }),
        NgbModule,
        HttpClientModule,
    ],
    entryComponents: [FronteggComponent],
    providers: [
        ApiService
    ],
    bootstrap: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
