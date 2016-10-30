import { Input, Component, OnInit, OnDestroy, ViewContainerRef, ViewEncapsulation, ViewChild, ContentChildren,QueryList,TemplateRef, Renderer, ElementRef, AfterViewInit } from '@angular/core';
import * as _ from 'lodash';
import * as moment from 'moment';
import { setImmediate } from 'core-js';

import { DragulaService } from 'ng2-dragula/ng2-dragula';

import { Session } from '../session/session';
import { Agenda } from '../agenda/agenda';
import { Track } from '../track/track';
import { Category} from '../category/category';
import { Tag } from '../tag/tag';
import { Speaker } from '../speaker/speaker';
import { Venue } from '../venue/venue';
import { AgendaService } from '../agenda/agenda.service';
import { BoardService } from './board.service';
import { GlobalVariable } from '../globals';

import { DOMUtilService } from '../util/dom.util.service';
import { overlayConfigFactory } from 'angular2-modal';
import { Overlay } from 'angular2-modal';
import { FormGroup, FormControl, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Observable } from 'rxjs/Rx';
import * as $ from 'jquery';
import { AbsoluteColumnComponent } from '../absolute-column/absolute-column.component';
import {
  VEXBuiltInThemes,
  Modal,
  DialogPreset,
  DialogFormModal,
  DialogPresetBuilder,
  VEXModalContext,
  VexModalModule,
  providers
} from 'angular2-modal/plugins/vex';

@Component({
  selector: 'board',
  templateUrl: './board.component.html',
  styleUrls: [
  './board.component.css',
  '../session/css/vex.css',
  '../session/css/vex-theme-default.css',
  ],
  encapsulation: ViewEncapsulation.None
})
export class BoardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('templateRef') public templateRef: TemplateRef<any>;
  @ViewChild(AbsoluteColumnComponent) private absCol: AbsoluteColumnComponent;
  @Input()
  agenda: Agenda;
  @Input()
  isPublic: boolean;
  @Input()
  isAnalytics: boolean;
  @Input()
  token: string;
  @Input()
  interestedSessionIds: number[];

  offsetDate: Date;
  eventDates: Date[];
  eventTracks: Track[];
  eventCategories: Category[];
  eventTags: Tag[];
  eventTagsName: string[];
  eventSpeakers: Speaker[];
  eventSpeakersName: string[];
  eventVenues: Venue[];
  eventVenuesName: string[];

  allSessions: Session[];
  pendingSessions: Session[];
  nonPendingSessions: Session[];

  dayTitleWidth: string;
  columnWidth = 200;
  columnGap = 10;

  dragging: boolean = false;


  //for adding new session by clicking on abs-col
  addingSessionWithStart = false;
  sessionStartTime:number;

  dropSub: any;
  dragSub: any;
  cancelSub: any;

  hours = ['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

  private PLACEHOLDER_DURATION: number = 15;

  globalListenFunc: Function;

  constructor(private dragulaService: DragulaService,
    private agendaService: AgendaService,
    private boardService: BoardService,
    private domUtilService: DOMUtilService,
    public modal: Modal,
    private _fb: FormBuilder,
    private elementRef: ElementRef, 
    private renderer: Renderer) {
    console.log('board constructor');
    this.dropSub = dragulaService.dropModel.subscribe((value: any) => {
      console.log('drop event in board');
      // console.log(`drop: ${value}`);
      this.dragging = false;
      this.onDrop(value.slice(1));
    });

    this.dragSub = dragulaService.drag.subscribe((value: any) => {
      this.dragging = true;
    });

    this.cancelSub = dragulaService.cancel.subscribe((value: any) => {
      this.dragging = false;
    });

    dragulaService.setOptions('column', {
      // copy: true,
      // copySortSource: true
      accepts: this.canDropSession.bind(this)
    });
  }

  ngAfterViewInit() {
    $('.schedule').on('scroll', this.keepfix);
  }

  keepfix() {
    var $w = $('.schedule');
    var nowTop = $w.scrollTop();
    $('.position-fixed-x').css('left', $w.scrollLeft());
    $('.position-fixed-y').css('top', $w.scrollTop());   
  }

  ngOnDestroy() {
    console.log('ondestroy board');
    this.dropSub.unsubscribe();
    this.dragSub.unsubscribe();
    this.cancelSub.unsubscribe();
    this.dragulaService.destroy('column');
  }

  canDropSession(el: HTMLElement, target: HTMLElement): boolean {
    // only accept when the slot container is empty
    // or the slot is for pending session
    return this.domUtilService.hasClass(target, 'pending-session-list') 
      || this.canContainerAcceptNewSession(el, target);
  }

  canContainerAcceptNewSession(sessionEl: HTMLElement, target: HTMLElement): boolean {
    if(target.children.length !== 0) {
      return false;
    } else {
      let sessionId = this.domUtilService.getSessionIdFromDOM(sessionEl);
      let containerTrackId = this.domUtilService.getContainerTrack(target);
      let globalStartAt = this.domUtilService.getContainerGlobalStartAt(target);
      return !this.isThereCollision(sessionId, globalStartAt, containerTrackId);
    }
  }

  isThereCollision(draggingSessionId: number, startAt: number, trackId: number): boolean {
    let draggingSession = this.getSessionById(draggingSessionId);
    if(draggingSession == null) {
      console.error('Session not found in board for id: ' + draggingSessionId);
    }
    let draggingDuration = draggingSession.duration;
    // use default new duration is session does not have duration
    if(draggingDuration == null) {
      draggingDuration = GlobalVariable.DEFAULT_NEW_DURATION;
    }
    for (var i = 0; i < this.allSessions.length; i++) {
      // skip pending session
      if(this.allSessions[i].start_at == null) {
        continue;
      }
      // no collision with itself
      if(this.allSessions[i].id !== draggingSessionId
        // same track
        && this.allSessions[i].track === trackId
        // existing session starts before the dragging session ends
        && this.allSessions[i].start_at < (startAt + draggingDuration)
        // existing session ends after the dragging session start
        && (this.allSessions[i].start_at + this.allSessions[i].duration) > startAt) {
        console.log('collision with');
        console.log(this.allSessions[i]);
        return true;
      }
    }
    return false;
  }

  onCreateSessionWithStart(startTime: number) {
    //console.log('in board '+startTime);
    this.addingSessionWithStart = true;
    this.sessionStartTime = startTime;
    this.createSessionModal();
  }

  onSessionChanged(changedSession: Session) {
    console.log('session changed in board');
    console.log(changedSession);
    this.agendaService.updateSession(this.agenda.id, changedSession);
  }

  onSessionDeletedColumn(deletedSession: Session) {
    console.log('session delete in board');
    console.log(deletedSession);
    this.agendaService.deleteSession(this.agenda.id, deletedSession);
    _.remove(this.allSessions, (s: Session) => s.id === deletedSession.id);
    if(deletedSession.start_at == null) {
      _.remove(this.pendingSessions, (s: Session) => s.id === deletedSession.id);
    } else {
      _.remove(this.nonPendingSessions, (s: Session) => s.id === deletedSession.id);
    }
  }

  onSessionInterestChanged(event: [number, boolean]) {
    console.log('session ' + event[0] + ' changed to ' + event[1]);
    this.agendaService.updateSessionInterest(this.agenda.id, event[0], event[1], this.token);
  }

  onSessionMovedFromPending(sessionFromPending: Session) {
    console.log('session from pending in board');
    console.log(sessionFromPending);
    this.agendaService.updateSession(this.agenda.id, sessionFromPending);
  }

  onSpeakerChanged(changedSpeaker: Speaker) {
    console.log('speaker changed in board');
    console.log(changedSpeaker);
    this.agendaService.updateSpeaker(this.agenda.id, changedSpeaker);
    this.eventSpeakers = this.getEventSpeakers();
    this.eventSpeakersName = this.getEventSpeakersName();
  }

  private onDrop(args: [HTMLElement, HTMLElement]) {
    let [e, el] = args;
    // console.log('drop board');
    // console.log(e);
    // console.log(el);
    let sessionId = e.getAttribute('data-session-id');
    let columnType = el.getAttribute('data-column-type');
    if(columnType === 'relative') {
      this.changeSessionToPending(parseInt(sessionId));
    }
  }

  getSessionsForColumn(columnDate: Date, columnTrack: number): Session[] {
    let sessions:Session[] = [];
    for (let session of this.nonPendingSessions) {
      if (
        //add session to every track if it doesn't have a specific track
        (!session.track || session.track === columnTrack) 
        && this.isOnSameDay(this.addMinToDate(session.start_at, this.agenda.start_at) ,columnDate))
        sessions.push(session);
    }

    return sessions;
  }

  //return the calculated time as a Date
  addMinToDate(minute: number, date: string) {
    let minToMs = 60000;
    let baseMs = new Date(date).getTime();
    return new Date(baseMs + minToMs * minute);
  }

  isOnSameDay(day1: Date, day2: Date) {
    return day1.getUTCFullYear() === day2.getUTCFullYear() 
           && day1.getUTCMonth() === day2.getUTCMonth() 
           && day1.getUTCDate() === day2.getUTCDate();
  }

  changeSessionToPending(sessionId: number) {
    let session: Session = this.getSessionById(sessionId);
    if(session) {
      delete session.start_at;
      console.log('session to pending in board');
      console.log(session);
      this.agendaService.updateSession(this.agenda.id, session);
    } else {
      console.error('Session not found for id=' + sessionId + '.');
    }
  }

  getSessionById(sessionId: number): Session {
    for (var i = 0; i < this.allSessions.length; ++i) {
      if(this.allSessions[i].id === sessionId) {
        return this.allSessions[i];
      }
    }
    return null;
  }

  getEventDates(): Date[] {
    let dates: Date[] = [];
    let endDate: Date;
    // duration has higher precedence of end_date
    console.log(this.agenda);
    if(!(this.agenda.duration == null) && this.agenda.duration > 0) {
      console.log('Using duration: ' + this.agenda.duration);
      endDate = moment.utc(this.agenda.start_at).add(this.agenda.duration - 1, 'd').toDate();
      console.log('End date: ' + endDate.toISOString());
    } else if(this.agenda.end_at == null) {
      console.log('No duration or end date, use 3 days default.');
      // initial deafult duration 3 days for empty agenda
      // endDate is the last day of the event
      endDate = moment.utc(this.agenda.start_at).add(2, 'd').toDate();
    } else {
      endDate = moment.utc(this.agenda.end_at).toDate();  
      console.log('Using end date: ' + endDate.toISOString());
    }
    let tempDate: Date = moment.utc(this.agenda.start_at).toDate();
    
    while (tempDate <= endDate) {
      // create cloned Date to avoid mutating start date
      dates.push(new Date(tempDate.getTime()));
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return dates;
  }

  getEventTracks(): Track[] {
    if (!this.agenda.tracks || this.agenda.tracks.length === 0) {
      this.dayTitleWidth = '0px';
      return [];
    } else {
      this.dayTitleWidth = ((this.columnWidth +this.columnGap) * this.agenda.tracks.length - this.columnGap) + 'px';
      return this.agenda.tracks;
    }
  }

  getEventCategories(): Category[] {
    if (!this.agenda.categories || this.agenda.categories.length === 0) {
      let defaultCategoryName: string = 'Tags';
      this.boardService.createCategory(this.agenda.id, defaultCategoryName).subscribe(
        data => { 
          console.log('created default category: ' + defaultCategoryName);
          return [data];
        },
        error =>  console.log('error creating default category')
      );
    } else {
      return this.agenda.categories;
    }
  }

  getEventTags(): Tag[] { // only from first (default) category for now
    if (!this.eventCategories[0].tags || this.eventCategories[0].tags.length === 0) {
      return [];
    } else {
      return this.eventCategories[0].tags;
    }
  }

  getEventTagsName(): string[] {
    if (!this.eventTags || this.eventTags.length === 0) {
      return [];
    } else {
      return this.eventTags.map(tag => tag.name);
    }
  }

  getEventSpeakers(): Speaker[] {
    if (!this.agenda.speakers || this.agenda.speakers.length === 0) {
      return [];
    } else {
      return this.agenda.speakers;
    }
  }

  getEventSpeakersName(): string[] {
    if (!this.eventSpeakers || this.eventSpeakers.length === 0) {
      return [];
    } else {
      return this.eventSpeakers.map(speaker => speaker.name);
    }
  }

  getEventVenues(): Venue[] {
    if (!this.agenda.session_venues || this.agenda.session_venues.length === 0) {
      return [];
    } else {
      return this.agenda.session_venues;
    }
  }

  getEventVenuesName(): string[] {
    if (!this.eventVenues || this.eventVenues.length === 0) {
      return [];
    } else {
      return this.eventVenues.map(venue => venue.name);
    }
  }

  sessionForm: FormGroup;
  formMsg: string;
  showVenueForm: boolean = false;

  ngOnInit(): void {
    this.offsetDate = new Date(this.agenda.start_at);
    this.eventDates = this.getEventDates();
    this.eventTracks = this.getEventTracks();
    this.eventCategories = this.getEventCategories();
    this.eventTags = this.getEventTags();
    this.eventTagsName = this.getEventTagsName();
    this.eventSpeakers = this.getEventSpeakers();
    this.eventSpeakersName = this.getEventSpeakersName();
    this.eventVenues = this.getEventVenues();
    this.eventVenuesName = this.getEventVenuesName();
    
    if (this.agenda.sessions == null) {
      this.agenda.sessions = [];
    }
    
    this.allSessions = this.agenda.sessions;
    
    const partitioned = _.partition(this.allSessions, (o:Session) => o.hasOwnProperty('start_at'));
    this.pendingSessions = partitioned[1];
    this.nonPendingSessions = partitioned[0];
  }

  refreshAgenda(newAgenda: Agenda) {
    this.agenda = newAgenda;
    this.eventDates = this.getEventDates();
  }

  createSessionModal() {
    console.log("session modal");
    this.sessionForm = this._fb.group({
      name: ['', [<any>Validators.required]],
      description: [''],
      duration: [null],
      existingSpeakers: [[]],
      newSpeakers: this._fb.array([]),
      tags: [[]],
      existingVenue: [[]],
      newVenue: this._fb.group({
        name: [''],
        unit: ['']
      })
    });
    this.formMsg = "";
    
    this.modal.open(
      this.templateRef, 
      overlayConfigFactory({ isBlocking: false }, VEXModalContext)
    ).then(dialog => {
      // Stop click events from the dropdown menu created by the tag inputs from propagating 
      // to document body, which causes weird issues with the modal widget
      // We're using setImmediate here because we need to wait for the widgets in the modal to be 
      // rendered first
      setImmediate(() => {
        _.each(document.getElementsByTagName("ng2-dropdown-menu"), el => {
          el.addEventListener('click', evt => evt.stopPropagation());
        });
      });
      
      // Clean up dropdown menus that were left behind by the widget
      dialog.onDestroy.subscribe(() => {
        // querySelectorAll uses a frozen NodeList
        _.each(document.querySelectorAll("ng2-dropdown-menu"), el => {
          el.parentNode.removeChild(el);
        });
      });
    });
  }

  initSpeaker() {
    return this._fb.group({
        name: ['', Validators.required],
        company: ['', Validators.required],
        position: '',
        profile: '',
        email: '',
        phone_number: '',
        company_description: '',
        company_url: '',
    });
  }

  addSpeaker() {
    const control = <FormArray>this.sessionForm.controls['newSpeakers'];
    control.push(this.initSpeaker());
  }

  removeSpeaker(i: number) {
    const control = <FormArray>this.sessionForm.controls['newSpeakers'];
    control.removeAt(i);
  }

  addVenue() {
    this.showVenueForm = true;
  }

  removeVenue() {
    this.showVenueForm = false;
  }
  
  submitAndContinueSessionForm(evt: any) {
    evt.preventDefault();
    this.submitSessionForm();
  }

  submitSessionForm(dialog: any = null) {
    if (!this.sessionForm.valid) { 
      this.formMsg = "Please fill in all required information.";
      return;
    }
    
    console.log(this.sessionForm);

    _.defaults(this.sessionForm.value, {
      existingSpeakers: [],
      tags: [],
      existingVenue: []
    });

    // Construct new speakers and tags 
    // TODO: Error handling - this is problematic right now because of transactions. 
    const requests: Promise<any>[] = [];
    
    requests.push(...this.sessionForm.value.newSpeakers.map((speaker:any) => { 
        const request = this.boardService.createSpeaker(
        this.agenda.id, 
        speaker.name, 
        speaker.company, 
        speaker.profile,
        speaker.position, 
        speaker.email, 
        speaker.phone_number, 
        speaker.company_description, 
        speaker.company_url,
      ).toPromise();
      
      request.then(data => {
        console.log('new speaker created: ' + data.name);
        this.eventSpeakers.push(data);
        this.eventSpeakersName.push(data.name);
        this.sessionForm.value.existingSpeakers.push(data.name);
        if (!this.agenda.speakers) {
          this.agenda.speakers = [];
        }
        this.agenda.speakers.push(data);
      });
      requests.push(request);
    }));

    requests.push(..._.difference(this.sessionForm.value.tags, this.eventTagsName).map((tag:string) => {
      const request = this.boardService.createTag(this.agenda.id, this.eventCategories[0].id, tag)
        .toPromise();

      request.then(data => {
        console.log('new tag created: ' + data.name);
        this.eventTags.push(data);
        this.eventTagsName.push(data.name);
      });
      
      return request;
    }));

    if (this.showVenueForm) {
      const request = this.boardService.createVenue(
        this.agenda.id, 
        this.sessionForm.value.newVenue.name, 
        this.sessionForm.value.newVenue.unit,
      ).toPromise();
      
      request.then(data => {
        console.log('new venue created: ' + data.name);
        this.eventVenues.push(data);
        this.eventVenuesName.push(data.name);
        this.sessionForm.value.existingVenue.pop();
        this.sessionForm.value.existingVenue.push(data.name);
      });
      requests.push(request);
    }
    
    // After all speakers and tags have been created, create the session 
    Promise.all(requests)
      .then(() => this.createSession())
      .then(() => {
        // Handle closing the dialog 
        if (dialog) {
          dialog.close(true);
        } else {
          // Have to reset to empty strings because reset uses 'null' by default, which is not what we need
          // Should see if there is any way to deduplicate this code with the form default declared during 
          // init
          this.sessionForm.reset({
            name: '',
            description: '',
            duration: null,
            existingSpeakers: [],
            newSpeakers: [],
            tags: [],
            existingVenue: [],
            newVenue: this._fb.group({
              name: ['', [<any>Validators.required]],
              unit: ['']
            })
          });
        }
      });
  }

  createSession(): Observable<any> {
    const speakersId: number[] = this.sessionForm.value.existingSpeakers
        .map((name: string) => _.find(this.eventSpeakers, {name}).id);
    
    const tagsId: number[] = this.sessionForm.value.tags
        .map((name: string) => _.find(this.eventTags, {name}).id);

    const venueId: number[] = this.sessionForm.value.existingVenue
        .map((name: string) => _.find(this.eventVenues, {name}).id);
    
    console.log(speakersId);
    console.log(tagsId);
    console.log(venueId);
    var request:Observable<any>;
    if(this.addingSessionWithStart){
      if(!this.sessionForm.value.duration){
        this.sessionForm.value.duration = 60;
      }
      request = this.boardService.createSession(
        this.agenda.id, 
        this.sessionForm.value.name, 
        this.sessionForm.value.description, 
        this.sessionForm.value.duration, 
        speakersId, 
        tagsId, 
        venueId[0],
        this.sessionStartTime
      );
    }else{ 
      request = this.boardService.createSession(
        this.agenda.id, 
        this.sessionForm.value.name, 
        this.sessionForm.value.description, 
        this.sessionForm.value.duration, 
        speakersId, 
        tagsId, 
        venueId[0]
      );
     }
        
    request.subscribe(
      data => { 
        this.formMsg = 'New session created!';
        this.allSessions.push(data);
        if(!this.addingSessionWithStart){
        this.pendingSessions.push(data);
        }else{
          this.absCol.addInNewSession(data);
          this.addingSessionWithStart = false;
        }

      },
      error => this.formMsg = <any>error
    );
    
    return request;
  }
}
