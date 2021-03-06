import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { HttpClient } from '../util/http.util.service';
import { GlobalVariable } from '../globals';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import {AgendaService} from "../agenda/agenda.service";
import { Session } from "../session/session";

export interface sessionRequest {
  name: string, 
  description: string, 
  duration: number, 
  speakers: number[], 
  tags: number[],
  venue: number,
  start_at?: number, 
  track?: number,
  tracks?: number[],
}

@Injectable()
export class BoardService {

  isBookmarkOpen = false;

  private openBookmarkModalSource = new Subject<boolean>();
  openBookmarkModal$ = this.openBookmarkModalSource.asObservable();

  sendOpenBookmark(){
    this.openBookmarkModalSource.next(true);
  }

  constructor (private httpClient: HttpClient) {
  }

  createSession(agendaId: number, session: sessionRequest): Observable<Session> {
    // TODO: Remove when multi-track sessions is implemented
    if (session.track) {
      session.tracks = [session.track];
    }
    
    return this.httpClient.post('/api/' + agendaId + '/sessions', JSON.stringify(session))
                    .map(this.extractData)
                    .map(AgendaService.extractSession)
                    .catch(this.handleError);
  }

  createSpeaker(agendaId: number, name: string, company: string, profile: string, position: string, email: string, phone_number: string, company_description: string, company_url: string): Observable<any> {
    const body = JSON.stringify({name, company, profile, position, email, phone_number, company_description, company_url});
    return this.httpClient.post('/api/' + agendaId + '/speakers', body)
                    .map(this.extractData)
                    .catch(this.handleError);
  }

  createCategory(agendaId: number, name: string): Observable<any> {
    let body = JSON.stringify({name: name});
    return this.httpClient.post('/api/' + agendaId + '/categories/', body)
                    .map(this.extractData)
                    .catch(this.handleError);
  }

  createTag(agendaId: number, categoryId: number, name: string): Observable<any> {
    let body = JSON.stringify({name: name});
    return this.httpClient.post('/api/' + agendaId + '/categories/' + categoryId + '/tags/', body)
                    .map(this.extractData)
                    .catch(this.handleError);
  }

  createVenue(agendaId: number, name: string, unit: string): Observable<any> {
    let body = JSON.stringify({name: name, unit: unit});
    return this.httpClient.post('/api/' + agendaId + '/venues', body)
                    .map(this.extractData)
                    .catch(this.handleError);
  }

  private extractStatus(res: Response) {
    console.log(res.status);
    return res.status;
  }
  private extractData(res: Response) {
    console.log(res.json());
    return res.json();
  }
  private handleError (error: any) {
    let errMsg = (error.message) ? error.message :
      error.status ? `${error.status} - ${error.statusText}` : 'Server error';
    console.error(errMsg);
    return Observable.throw(errMsg);
  }
}
