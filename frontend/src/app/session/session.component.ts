import { Input, Component, OnInit, ViewContainerRef, ViewEncapsulation, ViewChild, TemplateRef, EventEmitter, Output} from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Location } from '@angular/common';

import { Session } from '../session/session';
import { Agenda } from '../agenda/agenda';
import { Speaker } from '../speaker/speaker';
import { Venue } from '../venue/venue';
import { Tag } from '../tag/tag';
import { BoardService } from '../board/board.service';

import { overlayConfigFactory } from 'angular2-modal';
import { GlobalVariable } from '../globals';

import * as moment from 'moment';
import * as _ from 'lodash';
import * as $ from 'jquery';

declare const FB: any;

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
  selector: 'my-session',
  templateUrl: './session.component.html',
  styleUrls: [
    './session.component.css'
  ],
  encapsulation: ViewEncapsulation.None
})
export class SessionComponent implements OnInit {
  constructor(
    private location:Location,
    private route: ActivatedRoute,
    public modal: Modal,
    private boardService: BoardService) {}
  @ViewChild('templateRef') public templateRef: TemplateRef<any>;
  @Input() session: Session;
  @Input() offsetDate: Date;
  @Input() agenda: Agenda;
  @Input() isPublic: boolean;

  @Input() token: string;

  @Input() interested: boolean;
  @Input() analyticsData: {};
  @Input() isAnalytics: boolean;

  @Input() isSessionInList: boolean = false;

  interestedButtonText: string;
  analyticsDataCombinedX: any[];
  analyticsDataCombinedY: any[];

  @Output() onSessionEdited = new EventEmitter<Session>();
  @Output() onSessionDeleted = new EventEmitter<Session>();
  @Output() onSessionInterestEdited = new EventEmitter<[number, boolean]>();
  @Output() onSpeakerEdited = new EventEmitter<Speaker>();
  @Output() onSpeakerAdded2 = new EventEmitter<Speaker>();
  @Output() onVenueEdited = new EventEmitter<Venue>();
  @Output() onVenueAdded2 = new EventEmitter<Venue>();

  speakersObj = {};
  trackObj = {};
  sessionTagsName: string[] = [];
  eventTags: Tag[] = [];
  eventTagsName: string[] = [];

  HEIGHT_PER_15_MINS = 20; // px
  VERTICAL_MARGIN = 4;
  LIST_SESSION_HEIGHT = 'initial';

  height: number | string;
  color: string;
  useDarkTheme: boolean; // Dark if lightness < 75%, Light otherwise 

  availableSpeakers: Speaker[] = [];
  selectedSpeaker: any = '';
  selectedVenue: any = '';

  // tag input logic
  tagInputString = '';
  isNewTagBtnDisabled = true;

  tagBtnText = GlobalVariable.TAG_INPUT_BTN_NO_TEXT;
  
  onTagTextChange(input: string) {
    this.tagInputString = input.trim();
    if(this.tagInputString == '') {
      this.isNewTagBtnDisabled = true;
      this.tagBtnText = GlobalVariable.TAG_INPUT_BTN_NO_TEXT;
    } else if(_.includes(this.sessionTagsName, this.tagInputString)) {
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
      this.sessionTagsName.push(text);
      this.addTag(text);
      $('input.ng2-tag-input__text-input').val('');
      this.tagInputString = '';
      this.isNewTagBtnDisabled = true;
      this.tagBtnText = GlobalVariable.TAG_INPUT_BTN_NO_TEXT;
    }
  }

  getVenue(): Venue {
    return _.find(this.agenda.session_venues, {id: this.session.venue});
  }

  updateInterest() {
    if (this.token){
      this.interested = !this.interested;
      this.updateInterestButtonText();
      this.onSessionInterestEdited.emit([this.session.id, this.interested]);
    } else {
      this.sendOpenBookmarkModalRqt();
    }
  }

  sendOpenBookmarkModalRqt(){
    this.boardService.sendOpenBookmark();
  }

  adjustSessionDuration(mins: number) {
    let newDuration = this.session.duration + mins;
    if(newDuration > 0) {
      this.updateSession({
        duration: newDuration
      });  
    }
  }

  confirmDelete(dialogRef: any) {
    let dialog = this.modal.confirm()
      .message('Confirm delete?')
      .okBtn('Delete')
      .cancelBtn('Cancel')
      .open();
    dialog.then((resultPromise) => {
      return resultPromise.result.then((result) => {
        this.deleteSession();
        dialogRef.close(true);
      }, () => {});
    });
  }

  deleteSession() {
    console.log('delete');
    this.onSessionDeleted.emit(this.session);
  }

  updateSession(event: any) {
    if(typeof event.description === 'string') {
      this.session.description = event.description;
      this.onSessionEdited.emit(this.session);
    } else if(typeof event.name === 'string') {
      this.session.name = event.name;
      this.onSessionEdited.emit(this.session);
    } else if(typeof event.duration === 'string' || typeof event.duration === 'number') {
      event.duration = +event.duration;
      if (this.isInt(event.duration)) {
        this.session.duration = event.duration;
        this.onSessionEdited.emit(this.session);
        this.updateHeight();
      }
    }
  }

  removeSessionSpeaker(speakerId: number) {
    this.session.speakers = _.without(this.session.speakers, speakerId);
    this.onSessionEdited.emit(this.session);
    this.availableSpeakers.push(this.speakersObj[speakerId]);
  }

  addSessionSpeaker(speakerId: number) {
    if (!this.speakersObj[speakerId]){
      this.speakersObj[speakerId] = _.find(this.agenda.speakers, ['id',speakerId]);
    }
    if (!this.session.speakers) {
      this.session.speakers = [];
    }
    this.session.speakers.push(speakerId);
    this.onSessionEdited.emit(this.session);
    _.remove(this.availableSpeakers, o => o.id === speakerId);
  }

  updateSpeaker(event: any, speakerId: number) {
    let newSpeaker = this.agenda.speakers.filter(function(speaker) {return speaker.id === speakerId})[0];
    console.log(event);
    if(typeof event.name === 'string') {
      newSpeaker.name = event.name;
      this.onSpeakerEdited.emit(newSpeaker);
    } else if(typeof event.position === 'string') {
      newSpeaker.position = event.position;
      this.onSpeakerEdited.emit(newSpeaker);
    } else if(typeof event.company === 'string') {
      newSpeaker.company = event.company;
      this.onSpeakerEdited.emit(newSpeaker);
    } else if(typeof event.profile === 'string') {
      newSpeaker.profile = event.profile;
      this.onSpeakerEdited.emit(newSpeaker);
    } else if(typeof event.email === 'string') {
      newSpeaker.email = event.email;
      this.onSpeakerEdited.emit(newSpeaker);
    } else if(typeof event.phone_number === 'string') {
      newSpeaker.phone_number = event.phone_number;
      this.onSpeakerEdited.emit(newSpeaker);
    }
  }

  onSpeakerAdded(newSpeaker: Speaker) {
    this.onSpeakerAdded2.emit(newSpeaker);
    if (!this.session.speakers) {
      this.session.speakers = [];
    }
    this.session.speakers.push(newSpeaker.id);
    //this.agenda.speakers.push(newSpeaker);
    this.onSessionEdited.emit(this.session);
    this.speakersObj[newSpeaker.id] = newSpeaker;
  }

  updateVenue(event: any) {
    console.log(event);
    let newVenue = this.getVenue();
    if(typeof event.unit === 'string') {
      newVenue.unit = event.unit;
      this.onVenueEdited.emit(newVenue);
    }
  }

  onVenueAdded(newVenue: Venue) {
    //this.onVenueAdded2.emit(newVenue);
    this.session.venue = newVenue.id;
   // this.onSessionEdited.emit(this.session);
    if (!this.agenda.session_venues) {
      this.agenda.session_venues = [];
    }
    this.agenda.session_venues.push(newVenue);
    this.selectedVenue = newVenue;
  }

  addSessionVenue(venueId: number) {
    this.session.venue = venueId;
    this.onSessionEdited.emit(this.session);
  }

  removeTag(name: string) {
    let tagId: number = _.find(this.eventTags, {name}).id;
    let defaultCategoryId: number = this.agenda.categories[0].id;
    this.session.categories[defaultCategoryId] = _.without(this.session.categories[defaultCategoryId], tagId);
    this.session.tags = this.session.categories[defaultCategoryId]; // api takes in an array of tag ids
    this.onSessionEdited.emit(this.session);
  }

  addTag(name: string) {
    let defaultCategoryId: number = this.agenda.categories[0].id;
    if (!this.session.categories) {
      this.session.categories = {};
      this.session.categories[defaultCategoryId] = [];
    }
    let tagId: number;
    if (_.includes(this.eventTagsName, name)) {
      tagId = _.find(this.eventTags, {name}).id;
      this.session.categories[defaultCategoryId].push(tagId);
      this.session.tags = this.session.categories[defaultCategoryId]; // api takes in an array of tag ids
      this.onSessionEdited.emit(this.session);
    }
    else {
      this.boardService.createTag(this.agenda.id, defaultCategoryId, name).subscribe(
        (data: Tag) => {
          console.log('new tag created: ' + data.name);
          tagId = data.id;
          this.session.categories[defaultCategoryId].push(tagId);
          this.session.tags = this.session.categories[defaultCategoryId]; // api takes in an array of tag ids
          this.onSessionEdited.emit(this.session);
          if (!this.agenda.categories[0].tags) {
            this.agenda.categories[0].tags = [];
          }
          this.agenda.categories[0].tags.push(data);
          // this.eventTags.push(data);
          // this.eventTagsName.push(data.name);
          // properly update event tags
          this.eventTags = this.getEventTags();
          this.eventTagsName = this.getEventTagsName();
        },
        error => {
          console.log(error);
        }
      );
    }
  }

  isInt(value: any) {
    return !isNaN(value) && 
           parseInt(value, 10) == value && 
           !isNaN(parseInt(value, 10));
  }
  
  displayField(field: any): boolean {
    // Only display a field if its value is non-empty and this is editor view
    return (!this.isPublic && !this.isAnalytics) || field;
  }
  
  agendaPath(): string {
    return GlobalVariable.PUBLIC_BASE_URL + 'agenda/' + this.agenda.id + (this.token?'/'+this.token:'');
  }
  
  sessionPath(): string {
    return this.agendaPath() + '/session/' + this.session.id;
  }
  
  permalink(): string {
    return GlobalVariable.BASE_URL + this.sessionPath();
  }
  
  calendarLink(): string {
    return GlobalVariable.API_BASE_URL + [this.agenda.id, 'sessions', this.session.id, 'calendar'].join('/');
  }

  updateSessionFields() {
    this.eventTags = this.getEventTags();
    this.eventTagsName = this.getEventTagsName();
    this.sessionTagsName = _.values(_.values(this.session.categories)[0])
        .map((id: number) => _.find(this.eventTags, {id}).name);
    if (this.session.venue) {
      this.selectedVenue = this.getVenue();
    }
    if (this.agenda.speakers) {
      this.availableSpeakers = this.agenda.speakers.slice();
    }
    _.forEach(this.session.speakers, id => _.remove(this.availableSpeakers, o => o.id === id));
  }

  clicked(firstOpen: boolean) {
    if(!firstOpen) {
      this.updateSessionFields();
    }
    
    this.modal.open(
      this.templateRef, 
      overlayConfigFactory({ isBlocking: false }, VEXModalContext)
    ).then(dialog => {
      // Set new permalink if this is public 
      if (this.isPublic && !this.isAnalytics && !this.location.path().includes(this.sessionPath())) {
        this.location.go(this.sessionPath());
      }
      
      // Stop click events from the dropdown menu created by the tag inputs from propagating 
      // to document body, which causes weird issues with the modal widget. We're using 
      // setTimeout here because we need to wait for the widgets in the modal to be 
      // rendered first
      setTimeout(() => {
        FB.XFBML.parse();

        _.each(document.getElementsByTagName("ng2-dropdown-menu"), (el: HTMLElement) => {
          el.addEventListener('click', evt => evt.stopPropagation());
        });
      }, 0);
      
      dialog.onDestroy.subscribe(() => {
        // Return to previous when the modal is closed (if this is public)
        if (this.isPublic) {
          this.location.go(this.agendaPath());
        }

        // Clean up dropdown menus that were left behind by the widget 
        // see https://github.com/Gbuomprisco/ng2-material-dropdown/issues/9
        // TODO: Remove this once the patch from the above issue has been merged into the ng2-tag-input package 
        // querySelectorAll uses a frozen NodeList
        _.each(document.querySelectorAll("ng2-dropdown-menu"), (el: HTMLElement) => {
          el.parentNode.removeChild(el);
        });
      });
    });
  }

  getDisplayedDate(): string {
    if (this.session.start_at == null) {
      return '';
    }
    
    const startMs = this.offsetDate.getTime() + 60000 * this.session.start_at;
    return moment(startMs).utc().format("ddd, MMMM Do");
  }

  getDisplayedTime(): string {
    if (this.session.start_at == null) {
      return '';
    }
    
    const startMs = this.offsetDate.getTime() + 60000 * this.session.start_at;
    const startDate = new Date(startMs);
    const endDate = new Date(startMs + 60000 * this.session.duration);
    return `${this.getFormattedTime(startDate)}–${this.getFormattedTime(endDate)}`;
  }

  getFormattedTime(date: Date): string {
    return date.getUTCHours() + ':' + (date.getUTCMinutes() < 10 ? '0' : '') + date.getUTCMinutes();
  }

  getAltFormattedTime(date: Date): string {
    return moment(date).utc().format("hA");
  }

  updateInterestButtonText() {
    this.interestedButtonText = this.interested ? 'Bookmarked' : 'Bookmark';
  }

  updateHeight() {
    if(this.isSessionInList) {
      this.height = this.LIST_SESSION_HEIGHT;
      return;
    }
    this.height = Math.ceil(this.session.duration / 15) * this.HEIGHT_PER_15_MINS - this.VERTICAL_MARGIN;
  }

  getEventTags(): Tag[] { // only from first (default) category for now
    if (!this.agenda.categories[0].tags || this.agenda.categories[0].tags.length === 0) {
      return [];
    } else {
      return this.agenda.categories[0].tags;
    }
  }

  getEventTagsName(): string[] {
    if (!this.eventTags || this.eventTags.length === 0) {
      return [];
    } else {
      return this.eventTags.map(tag => tag.name);
    }
  }

  ngOnInit(): void {
    // Update analytics data
    this.analyticsDataCombinedY = _.values(this.analyticsData);
    this.analyticsDataCombinedX = _.keys(this.analyticsData);

    // TODO: move this logic up to agenda/board component to avoid repeated operations
    this.speakersObj = _.keyBy(this.agenda.speakers, 'id');
    this.trackObj = _.keyBy(this.agenda.tracks, 'id');
    
    // Update bookmark button status text
    this.updateInterestButtonText();
    
    // Update height 
    if (this.session.start_at != null) {
      this.updateHeight();
    }
    
    this.updateSessionFields();

    // Updates coloring
    let popularityRatio = 0;
    
    if (this.isAnalytics) {
      popularityRatio = (this.session.popularity - this.agenda.minPopularity) / 
          (this.agenda.maxPopularity - this.agenda.minPopularity);
    }

    const primary = GlobalVariable.COLOR_PRIMARY;
    const l = primary.l + (100 - primary.l) * Math.sqrt(1 - popularityRatio);
    this.color = `hsl(${primary.h}, ${primary.s}%, ${l}%)`;
    this.useDarkTheme = l < 75;
    
    // If the current route is a session route, open the modal automatically 
    setTimeout(()=>{
      this.route.params.forEach((params: Params) => {
        // (+) converts string 'id' to a number
        if (params['sessionId']){
          const id = +params['sessionId'];
          if (this.session.id === id) {
            this.clicked(true);
          }      
        }
      });
    }, 0);
  }
}
