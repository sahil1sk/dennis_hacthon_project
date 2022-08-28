import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from "rxjs";
import { FronteggAppService, FronteggAuthService } from "@frontegg/angular";
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  isLoading = true;
  loadingSubscription: Subscription;
  user?: any;

  constructor(
    private fronteggAuthService: FronteggAuthService, 
    private fronteggAppService: FronteggAppService,
    private router: Router,
  ) {
    this.loadingSubscription = fronteggAppService.isLoading$.subscribe((isLoading) => this.isLoading = isLoading)
  }

  public logout(): void {
    this.router.navigate(['/account/logout']); 
  }

  showApp(): void {
    this.fronteggAppService?.showAdminPortal()
  }

  ngOnInit(): void {
    this.fronteggAuthService?.user$.subscribe((user) => {
      this.user = user;
    })

  }

  login(): void {
    this.router.navigate(['/account/login']); 
  }

  ngOnDestroy(): void {
    this.loadingSubscription.unsubscribe()
  }
}