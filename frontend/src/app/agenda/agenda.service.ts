import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import * as _ from 'lodash';

import { HttpClient } from '../util/http.util.service';
import { Session } from '../session/session';
import { Speaker } from '../speaker/speaker';
import { Venue } from '../venue/venue';
import { Agenda } from './agenda';
import { GlobalVariable } from '../globals';

export interface DirtySession {
  id: number, 
  popularity: number,
  name: string,
}

@Injectable()
export class AgendaService {

  constructor (private httpClient: HttpClient) {}

  static agendaEndpoint(id: number, path: string = ''): string {
      return _.trimEnd(GlobalVariable.API_BASE_URL + id + '/' + path, '/');
  }
  
  static sessionEndpoint(agendaId: number, sessionId: number) {
      return AgendaService.agendaEndpoint(agendaId, 'sessions/' + sessionId);
  }

  getAgendaAnalytics(id: number): Observable<any> {
    return this.httpClient.get(AgendaService.agendaEndpoint(id, 'data'))
                    .map(AgendaService.extractData)
                    .catch(AgendaService.handleError);
  }

  getAgendaById(id: number): Observable<Agenda> {
    return this.httpClient.get(AgendaService.agendaEndpoint(id))
                    .map(AgendaService.extractData)
                    .map(AgendaService.extractAgenda)
                    .catch(AgendaService.handleError);
  }
  
  getDirtySessions(id: number): Observable<DirtySession[]> {
    return this.httpClient.get(AgendaService.agendaEndpoint(id, 'dirty'))
      .map(AgendaService.extractData)
      .catch(AgendaService.handleError);
  }
  
  sendViewerEmail(id: number): Observable<any> {
    return this.httpClient.post(AgendaService.agendaEndpoint(id, 'dirty'), '')
      .catch(AgendaService.handleError);
  }

  setPublished(id: number, status: boolean) {
    return this.updateAgenda(id, {published: status});
  }

  updateAgenda(id: number, data: {}): Observable<Agenda> {
    return this.httpClient.patch(AgendaService.agendaEndpoint(id), JSON.stringify(data))
                    .map(AgendaService.extractData)
                    .map(AgendaService.extractAgenda)
                    .catch(AgendaService.handleError);
  }

  private static extractData(res: Response) {
    // console.log(res.json());
    return res.json();
  }

  static extractSession(session: any): Session {
    // TODO: Remove this when multi-track session is ready
    session.track = session.tracks[0];
    // display session by default
    session.toggle = true;
    return <Session>_.defaults(session, new Session());
  }

  private static extractAgenda(agenda: any): Agenda {
    agenda = _.defaults(agenda, new Agenda());
    
    // Map extract session
    agenda.sessions = agenda.sessions.map(AgendaService.extractSession);
    
    // Check if there are any dirty sessions
    agenda.hasDirtySession = agenda.sessions.some((session: Session) => session.is_dirty);
    
    // Calculate max and min popularity 
    const popularityCount = agenda.sessions.map((session: Session) => session.popularity);
    agenda.maxPopularity = _.max(popularityCount) || 0;
    agenda.minPopularity = _.min(popularityCount)|| 0;
    
    return agenda;
  }

  private static handleError (error: any) {
    let errMsg = (error.message) ? error.message :
      error.status ? `${error.status} - ${error.statusText}` : 'Server error';
    console.error(errMsg);
    return Observable.throw(errMsg);
  }

  updateSession(agendaId: number, session: Session): Observable<Session> {
    // TODO: Remove when multi-track sessions is implemented
    if (session.track) {
      session.tracks = [session.track];
    }

    return this.httpClient
        .put(AgendaService.sessionEndpoint(agendaId, session.id), JSON.stringify(session))
        .map(AgendaService.extractData) 
        .map(AgendaService.extractSession)
        .catch(AgendaService.handleError);
  }

  deleteSession(agendaId: number, session: Session) {
    this.httpClient
        .delete(AgendaService.sessionEndpoint(agendaId, session.id))
        .catch(AgendaService.handleError)
        .subscribe(
          res => {
            // console.log(res)
          },
          err => console.error(err)
        );
  }

  updateSessionInterest(agendaId: number, sessionId: number, interested: boolean, token: string) {
    const method = interested ? 'put' : 'delete';
    const url = AgendaService.agendaEndpoint(agendaId, ['viewers', token, sessionId].join('/'));
      
    this.httpClient[method](url, '')
        .catch(AgendaService.handleError)
        .subscribe(
            (res : any) => {
              // console.log(res);
            },
            (err : any) => console.error(err),
        );
  }

  updateSpeaker(agendaId: number, speaker: Speaker) {
    const url = AgendaService.agendaEndpoint(agendaId, 'speakers/' + speaker.id);
    
    this.httpClient
        .put(url, JSON.stringify(speaker))
        .catch(AgendaService.handleError)
        .subscribe(
          res => {
            // console.log(res)
          },
          err => console.error(err)
        );
  }

  updateVenue(agendaId: number, venue: Venue) {
    const url = AgendaService.agendaEndpoint(agendaId, 'venues/' + venue.id);
    
    this.httpClient
        .put(url, JSON.stringify(venue))
        .catch(AgendaService.handleError)
        .subscribe(
          res => {
            // console.log(res)
          },
          err => console.error(err)
        );
  }

  getEventHours(sessions: Session[]): number[] {
    const hours: number[] = [];
    const hoursBetween: number[] = [];

    sessions.forEach((session) => {
      if (session.start_at != null) {
        hours.push(Math.floor(session.start_at % (24 * 60) / 60));
        hours.push(Math.ceil((session.start_at + session.duration) % (24 * 60) / 60) + 1);
      }
    });

    for (let hour = Math.min(...hours), max = Math.max(...hours); hour < max; hour++) {
      hoursBetween.push(hour);
    }

    return hoursBetween;
  }
}