import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/internal/operators';
import { environment } from 'src/environments/environment';
import { Meeting } from '../models/Meeting';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
 
  constructor(
    private http: HttpClient
  ) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      "Authorization": "Bearer " + localStorage.getItem('accessToken')
    });
  }

  public generateChatToken(userId: number): Observable<any> {    
    return this.http.post<any>(environment.tokenGenURL, {'uid': userId}).pipe(catchError(this.handleError));
  }
  
  public generateVideoCallToken(userId: number, channelName:string): Observable<any> {    
    return this.http.post<any>(
      environment.tokenGenURL, 
      {
        'uid': userId,
        'channelName': channelName,
        'role': 101
      }
    ).pipe(catchError(this.handleError));
  }

  public getScheduleMeetings(id:string): Observable<any> {
    return this.http.get<any>(environment.baseUrl + "meetings/" + id, {headers: this.getHeaders()}).pipe(catchError(this.handleError));
  }

  public getMeeting(id: string): Observable<Meeting> {
    return this.http.get<Meeting>(environment.baseUrl + id, {headers: this.getHeaders()}).pipe(catchError(this.handleError));
  }

  public addMeeting(obj: any): Observable<any> {
    return this.http.post(environment.baseUrl + 'add', obj, {headers: this.getHeaders()}).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any) {
    let errMsg: string;

    if(error.error instanceof ErrorEvent) {
      errMsg = `${error.error.message} - INSIDE FIRST - ${JSON.stringify(error.error)}` ;
    }else {
      errMsg = `${error.status} - INSIDE SECOND - ${error.statusText || ''} ${JSON.stringify(error)}`;
    }
    return throwError(errMsg);
  }
}
