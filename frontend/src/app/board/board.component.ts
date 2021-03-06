import { Input, Component, OnInit, OnDestroy, ViewContainerRef, ViewEncapsulation, ViewChild,
 ViewChildren, QueryList,TemplateRef, Renderer, ElementRef } from '@angular/core';
import * as _ from 'lodash';
import * as moment from 'moment';

import { DragulaService } from 'ng2-dragula/ng2-dragula';

import { Session } from '../session/session';
import { Agenda } from '../agenda/agenda';
import { Track } from '../track/track';
import { Category} from '../category/category';
import { Tag } from '../tag/tag';
import { Speaker } from '../speaker/speaker';
import { Venue } from '../venue/venue';
import { AgendaService } from '../agenda/agenda.service';
import {BoardService, sessionRequest} from './board.service';
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
  ],
  encapsulation: ViewEncapsulation.None
})
export class BoardComponent implements OnInit, OnDestroy {
  @ViewChild('templateRef') public templateRef: TemplateRef<any>;
  @ViewChildren('absCol') absCol: QueryList<AbsoluteColumnComponent>;
   // absCol: QueryList<AbsoluteColumnComponent>;
  
  @ViewChild('scheduleRef') scheduleRef: ElementRef;
  scheduleLeft: string;
  scheduleTop: string;
  scrollingFrameId: number; 

  @Input() agenda: Agenda;
  @Input() isPublic: boolean;
  @Input() isAnalytics: boolean;
  @Input() token: string;
  @Input() interestedSessionIds: number[];
  @Input() analyticsData: {};
  @Input() isListView: boolean;

  offsetDate: Date;
  eventDates: Date[];
  eventTracks: Track[];
  eventCategories: Category[];
  eventTags: Tag[];
  eventTagsName: string[];
  eventSpeakersName: string[];
  eventVenues: Venue[];
  eventVenuesName: string[];
  
  changedSessions: Session[];

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
  sessionDateIndex:number;
  sessionTrackIndex:number;

  dropSub: any;
  dragSub: any;
  cancelSub: any;

  hours = GlobalVariable.HOURS;

  constructor(
    private dragulaService: DragulaService,
    private agendaService: AgendaService,
    private boardService: BoardService,
    private domUtilService: DOMUtilService,
    public modal: Modal,
    private _fb: FormBuilder,
    private elementRef: ElementRef, 
    private renderer: Renderer
  ) {
    this.dropSub = dragulaService.dropModel.subscribe((value: any) => {
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

  // tag input logic
  tagInputString = '';
  isNewTagBtnDisabled = true;
  tagBtnText = GlobalVariable.TAG_INPUT_BTN_NO_TEXT;
  
  onTagTextChange(input: string) {
    this.tagInputString = input.trim();
    if(this.tagInputString == '') {
      this.isNewTagBtnDisabled = true;
      this.tagBtnText = GlobalVariable.TAG_INPUT_BTN_NO_TEXT;
    } else if(_.includes(this.sessionForm.value.tags, this.tagInputString)) {
      this.isNewTagBtnDisabled = true;
      this.tagBtnText = GlobalVariable.TAG_INPUT_BTN_EXIST_TAG;
    } else {
      this.isNewTagBtnDisabled = false;
      this.tagBtnText = GlobalVariable.TAG_INPUT_BTN_WITH_TEXT;
    }
  }

  addTagFromInput() {
    let text = this.tagInputString.trim();
    if(text != '') {
      // need any additional logic?
      // this.addTag(text);
      this.sessionForm.value.tags.push(text);
      $('input.ng2-tag-input__text-input').val('');
      this.tagInputString = '';
      this.isNewTagBtnDisabled = true;
      this.tagBtnText = GlobalVariable.TAG_INPUT_BTN_NO_TEXT;
    }
  }

  keepfix() {
    window.cancelAnimationFrame(this.scrollingFrameId);
    this.scrollingFrameId = window.requestAnimationFrame(() => {
      this.scheduleTop = this.scheduleRef.nativeElement.scrollTop + 'px';
      this.scheduleLeft = this.scheduleRef.nativeElement.scrollLeft + 'px';
    });
  }

  ngOnDestroy() {
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
    if (target.children.length !== 0) {
      return false;
    }
    
    const sessionId = this.domUtilService.getSessionIdFromDOM(sessionEl);
    const draggingSession = this.getSessionById(sessionId);
    const container = this.domUtilService.getContainerData(target);
    const draggingDuration = draggingSession.duration || GlobalVariable.DEFAULT_NEW_DURATION;

    if (draggingSession == null) {
      console.error('Session not found in board for id: ' + sessionId);
    }

    return this.nonPendingSessions.filter(session => {
      // Only check against sessions on the same track
      return session.start_at && session.track === container.trackId;
    }).every(session => {
      return session.id === sessionId
        // existing session starts before the dragging session ends
        || (session.start_at + session.duration) <= container.startAt
        // existing session ends after the dragging session start
        || session.start_at >= (container.startAt + draggingDuration)
    });
  }

  onCreateSessionWithStart(event: [number,number,number]) {
    this.addingSessionWithStart = true;
    [this.sessionStartTime, this.sessionDateIndex, this.sessionTrackIndex] = event;
    this.createSessionModal();
  }

  onSessionChanged(changedSession: Session) {
    this.agendaService.updateSession(this.agenda.id, changedSession)
      .subscribe(session => {
        if (session.is_dirty) {
          this.agenda.hasDirtySession = true;
        }
      }); 
  }

  onSessionDeletedColumn(deletedSession: Session) {
    this.agendaService.deleteSession(this.agenda.id, deletedSession);
    _.remove(this.allSessions, (s: Session) => s.id === deletedSession.id);
    if(deletedSession.start_at == null) {
      _.remove(this.pendingSessions, (s: Session) => s.id === deletedSession.id);
    } else {
      _.remove(this.nonPendingSessions, (s: Session) => s.id === deletedSession.id);
    }
  }

  onSessionInterestChanged(event: [number, boolean]) {
    this.agendaService.updateSessionInterest(this.agenda.id, event[0], event[1], this.token);
  }

  onSessionMovedFromPending(sessionFromPending: Session) {
    this.agendaService.updateSession(this.agenda.id, sessionFromPending)
      .subscribe(session => {
        console.log(session);
        if (session.is_dirty) {
          this.agenda.hasDirtySession = true;
        }
      });
  }

  onSpeakerChanged(changedSpeaker: Speaker) {
    this.agendaService.updateSpeaker(this.agenda.id, changedSpeaker);
    this.eventSpeakersName = this.getEventSpeakersName();
  }

  onVenueChanged(changedVenue: Venue) {
    this.agendaService.updateVenue(this.agenda.id, changedVenue);
    this.eventVenues = this.getEventVenues();
    this.eventVenuesName = this.getEventVenuesName();
  }

  private onDrop(args: [HTMLElement, HTMLElement]) {
    let [e, el] = args;
    if (el.dataset['columnType'] === 'relative') {
      const sessionId = this.domUtilService.getSessionIdFromDOM(e);
      const session = this.getSessionById(sessionId);
      
      if (session) {
        delete session.start_at;
        this.agendaService.updateSession(this.agenda.id, session).subscribe();
      } else {
        console.error('Session not found for id=' + sessionId + '.');
      }
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
    if(!(this.agenda.duration == null) && this.agenda.duration > 0) {
      endDate = moment.utc(this.agenda.start_at).add(this.agenda.duration - 1, 'd').toDate();
    } else if(this.agenda.end_at == null) {
      // initial deafult duration 3 days for empty agenda
      // endDate is the last day of the event
      endDate = moment.utc(this.agenda.start_at).add(2, 'd').toDate();
    } else {
      endDate = moment.utc(this.agenda.end_at).toDate();
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
          return [data];
        },
        error => console.error('error creating default category')
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

  getEventSpeakersName(): string[] {
    return this.agenda.speakers.map(speaker => speaker.name);
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
    this.eventSpeakersName = this.getEventSpeakersName();
    this.eventVenues = this.getEventVenues();
    this.eventVenuesName = this.getEventVenuesName();
    
    this.allSessions = this.agenda.sessions;
    [this.nonPendingSessions, this.pendingSessions] = _.partition(this.allSessions, 
      (o:Session) => o.hasOwnProperty('start_at'));
    
    if (this.isPublic) {
      this.hours = this.agendaService.getEventHours(this.agenda.sessions);
    }
  }

  createSessionModal() {
    this.showVenueForm = false;
    this.eventTags = this.getEventTags(); // update autocomplete when tags are added through the session modal
    this.eventTagsName = this.getEventTagsName();
    this.sessionForm = this._fb.group({
      name: ['', [<any>Validators.required]],
      description: [''],
      duration: [60],
      existingSpeakers: [[]],
      tags: [[]],
      existingVenue: [[]]
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
      setTimeout(() => {
        _.each(document.getElementsByTagName("ng2-dropdown-menu"), el => {
          el.addEventListener('click', evt => evt.stopPropagation());
        });
      }, 0);
      
      // Clean up dropdown menus that were left behind by the widget
      dialog.onDestroy.subscribe(() => {
        // querySelectorAll uses a frozen NodeList
        _.each(document.querySelectorAll("ng2-dropdown-menu"), el => {
          el.parentNode.removeChild(el);
        });
      });
    });
  }
  
  submitAndContinueSessionForm(evt: any) {
    this.showVenueForm = false;
    evt.preventDefault();
    this.submitSessionForm();
  }

  submitSessionForm(dialog: any = null) {
    if (!this.sessionForm.valid) { 
      this.formMsg = "Please fill in all required information.";
      return;
    }

    _.defaults(this.sessionForm.value, {
      existingSpeakers: [],
      tags: [],
      existingVenue: []
    });

    const requests: Promise<any>[] = [];

    requests.push(..._.difference(this.sessionForm.value.tags, this.eventTagsName).map((tag:string) => {
      const request = this.boardService.createTag(this.agenda.id, this.eventCategories[0].id, tag)
        .toPromise();

      request.then(data => {
        this.eventTags.push(data);
        this.eventTagsName.push(data.name);
        if (!this.agenda.categories[0].tags) {
          this.agenda.categories[0].tags = [];
        }
        this.agenda.categories[0].tags.push(data);
      });
      
      return request;
    }));

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
            duration: 60,
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

  getDisplayedTime(start:number,duration:number): string {
    if (start == null) {
      return '';
    }
    if(duration == null || !duration) {
      duration = 0;
    }  
    const startMs = this.offsetDate.getTime() + 60000 * start;
    const startDate = new Date(startMs);
    const endDate = new Date(startMs + 60000 * duration);
    return 'On '+moment(startMs).utc().format("ddd, MMMM Do")+ ', ' + `${this.getFormattedTime(startDate)}–${this.getFormattedTime(endDate)}`;
  }

  getFormattedTime(date: Date): string {
    return date.getUTCHours() + ':' + (date.getUTCMinutes() < 10 ? '0' : '') + date.getUTCMinutes();
  }

  createSession(): Observable<any> {
    const speakersId: number[] = this.sessionForm.value.existingSpeakers
        .map((name: string) => _.find(this.agenda.speakers, {name}).id);
    
    const tagsId: number[] = this.sessionForm.value.tags
        .map((name: string) => _.find(this.eventTags, {name}).id);

    const venueId: number[] = this.sessionForm.value.existingVenue
        .map((name: string) => _.find(this.eventVenues, {name}).id);
    
    var request:Observable<any>;

    if (!this.sessionForm.value.duration) {
      this.sessionForm.value.duration = 60;
    }
    
    const newSession = <sessionRequest> {
      name: this.sessionForm.value.name, 
      description: this.sessionForm.value.description, 
      duration: this.sessionForm.value.duration,
      speakers: speakersId, 
      tags: tagsId, 
      venue: venueId[0],
    };
    
    if (this.addingSessionWithStart) {
      newSession.start_at = this.sessionStartTime; 
      newSession.track = this.eventTracks[this.sessionTrackIndex].id;
    }
        
    this.boardService.createSession(this.agenda.id, newSession).subscribe(
      data => { 
        this.formMsg = 'New session created!';
        this.allSessions.push(data);
        if (!this.addingSessionWithStart) {
          this.pendingSessions.push(data);
        } else {
          this.absCol.toArray()[this.sessionDateIndex * this.eventTracks.length + this.sessionTrackIndex].addInNewSession(data);
          this.addingSessionWithStart = false;
        }
      },
      error => {
        this.formMsg = <any>error;
        this.addingSessionWithStart = false;
      }
    );

    return request;
  }

  onVenueAdded(newVenue: Venue, isForm: boolean) {
    this.eventVenues.push(newVenue);
    this.eventVenuesName.push(newVenue.name);
    if (!this.agenda.session_venues) {
      this.agenda.session_venues = [];
    }
    this.agenda.session_venues.push(newVenue);
    if (isForm) {
      this.sessionForm.value.existingVenue.pop();
      this.sessionForm.value.existingVenue.push(newVenue.name);
    }
  }

  onSpeakerAdded(newSpeaker: Speaker, isForm: boolean) {
    this.agenda.speakers.push(newSpeaker);
    this.eventSpeakersName.push(newSpeaker.name);
    if (isForm) {
      this.sessionForm.value.existingSpeakers.push(newSpeaker.name);
    }
  }
}
