﻿import { Component, Input, EventEmitter, ElementRef } from '@angular/core';


@Component({
    selector: 'ndv-area',
    styles: [`
       #ndv-ic {
        margin-left: 10px;
        color: #d9d9d9;
        }

        .ndv-comp {
            padding:6px;
            border-radius: 3px;
        }
        .active-ndv {
            background-color: #f0f0f0;
            border: 1px solid #d9d9d9;
        }
        input {
            border-radius: 5px;
            box-shadow: none;
            border: 1px solid #dedede;
            min-width: 5px;
        }
        .ndv-buttons {
            background-color: white;
            border: 1px solid #ccc;
            border-top: none;
            border-radius: 0 0 3px 3px;
            box-shadow: 0 3px 6px rgba(111,111,111,0.2);
            outline: none;
            padding: 8px 5px;
            position: absolute;
            margin-left: 6px;
            z-index: 1;
            font-size: 1.1rem;
            line-height: 1.5rem;
        }
        .ndv-comp:hover {
            border: 1px solid grey;
        }
        .ndv-comp:hover > ndv-ic {
            display:block;
        }

        .ndv-save {
            margin-right:3px;
        }
        .ndv-active {
            background-color: #f0f0f0;
            border: 1px solid #d9d9d9;
        }
    `],
    template: `<span *ngIf="!permission">{{text}}</span><form *ngIf="permission" class='ndv-comp' [ngClass]="{'ndv-active':show}"><span>
                    <textarea rows="6" cols="55" *ngIf='show' [(ngModel)]='text' [ngModelOptions]='{standalone: true}'></textarea>
                    <i id='ndv-ic' *ngIf='!show'>✎</i>
                    <span *ngIf='!show' style='line-height:1.5em;word-wrap: break-word;' (click)='makeEditable()'>{{text || '-Empty Field-'}}</span>
                </span>
                <div class='ndv-buttons' *ngIf='show'>
                    <a class='button primary button-symbol' (click)='callSave()'><i class="fa fa-check fa-fw" aria-hidden="true"></i></a>
                    <a class='button secondary button-symbol' (click)='cancelEditable()'><i class="fa fa-times fa-fw" aria-hidden="true"></i></a>
                </div></form>`,
    host: {
        "(document: click)": "compareEvent($event)",
        "(click)": "trackEvent($event)"
    },
    outputs: ['save : onSave']
})

export class NdvEditAreaComponent {
    @Input('placeholder') text: any;
    @Input('title') fieldName: any;
    @Input() permission = true;
    originalText: any;
    tracker: any;
    el: ElementRef;
    show = false;
    save = new EventEmitter;

    constructor(el: ElementRef) {
        this.el = el;
    }
    
    ngOnInit() {
        this.originalText = this.text;    //Saves a copy of the original field info.
    }

    makeEditable() {
        if (this.show == false) {
            this.show = true;
        }
    }

    compareEvent(globalEvent: any) {
        if (this.tracker != globalEvent && this.show) {
            this.cancelEditable();
        }
    }

    trackEvent(newHostEvent: any) {
        this.tracker = newHostEvent;
    }

    cancelEditable() {
        this.show = false;
        this.text = this.originalText;
    }

    callSave() {
        var data = {};  //BUILD OBJ FOR EXPORT.
        data["" + this.fieldName] = this.text;
        var oldText = this.text;
        setTimeout(() => { this.originalText = oldText; this.text = oldText }, 0);  //Sets the field with the new text;
        this.save.emit(data);
        this.show = false;
        
    }
}