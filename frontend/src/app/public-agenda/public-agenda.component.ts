import { Input, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Location } from '@angular/common';

import { Session } from '../session/session';
import { Agenda } from '../agenda/agenda';
import { AgendaService } from '../agenda/agenda.service';
import { DashBoardService } from '../dash-board/dash-board.service';
import { PublicAgendaService } from './public-agenda.service';
import { GlobalVariable } from '../globals';
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { overlayConfigFactory } from 'angular2-modal';
import { Overlay } from 'angular2-modal';
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
  selector: 'public-agenda',
  templateUrl: './public-agenda.component.html',
  styleUrls: ['./public-agenda.component.css']
})


export class PublicAgendaComponent implements OnInit{
  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private agendaService: AgendaService,
    private dashBoardService: DashBoardService,
    private publicAgendaService: PublicAgendaService,
    private sanitizer: DomSanitizer,
    public modal: Modal,
  ) { }
  
  user = this.dashBoardService.currentUser;
  agenda: Agenda;
  email: string;
  agendaId: number;
  token : string;
  
  @ViewChild('infoRef') public infoRef: TemplateRef<any>;
  @ViewChild('bookmarkRef') public bookmarkRef: TemplateRef<any>;

  interestedSessionIds: number[];
  interestToggleModel = false;

  mapsEmbedUrl: SafeResourceUrl;
  
  ngOnInit() {
    this.route.params.forEach((params: Params) => {
      this.agendaId = params['id'];
      this.getAgendaById(this.agendaId);

      let token = params['token'];
      if (token) {
        this.getViewerByToken(token);
      }      
    });
  }

  showInfo() {
    this.modal.open(this.infoRef, overlayConfigFactory({ isBlocking: false }, VEXModalContext));

  }

  showBookmark() {
          this.modal.open(this.bookmarkRef, overlayConfigFactory({ isBlocking: false }, VEXModalContext));

  }

  getAgendaById(id: number) {
    this.agendaService.getAgendaById(id).subscribe(
        agenda => {
          if (!agenda.published) return;
          this.agenda = agenda;
          
          // Construct the iframe URL for the embedded Google Map
          if (agenda.location) {
            const url = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GlobalVariable.GOOGLE_MAP_API_KEY)}&q=${encodeURIComponent(this.agenda.location)}`;
            this.mapsEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          }
        },
        error => console.log(error)
    );
  }

  getViewerByToken(token: string) {
    this.publicAgendaService.getViewerByToken(this.agendaId, token).subscribe(
      (data: any) => {
        this.email = data.email;
        this.interestedSessionIds = data.sessions;
        this.token = token;
      },
      (error: any) => {
        this.location.go('/public/agenda/'+this.agendaId);
      }
    );
  }

  createToken() {
    this.publicAgendaService.createToken(this.agendaId, this.email).subscribe(
      (data: any) => this.router.navigate(['/public/agenda/' + this.agendaId + '/' + data.token]),
      (error: any) => console.log(error)
    );
  }
}
