import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { switchMap } from 'rxjs/internal/operators';
import { ApiService } from 'src/app/services/api.service';
import { Meeting } from 'src/app/models/Meeting';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { AgoraService } from 'src/app/services/agora.service';
import { DOCUMENT } from '@angular/common';
import { FronteggAuthService } from '@frontegg/angular';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit {
  meetingId!: string;
  user:any;

  // For Full screen
  isFullScreen: boolean = false;
  elem:any;

  // For Toggling Chat and Videos
  vdStreamHeight:boolean = true;
  isInChat:boolean = false;
  msg:string = "";

  mikeOn:boolean = false;
  cameraOn:boolean = false;

  connectedUsers:any = []; // [{'id': 'name'}]

  // Total camera here
  cameras:number = 1;

  constructor( 
    private fronteggAuthService: FronteggAuthService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private api: ApiService,
    private router: Router,
    private modalService: NgbModal,
    private agoraService: AgoraService,
    config: NgbModalConfig,
    @Inject(DOCUMENT) private document: any
  ) {
    // Modal Configuration (Modal will on close when backdrop clicked)
    config.backdrop = 'static';
    config.keyboard = false;
  }

  @ViewChild('content') modalContent: any;

  ngOnInit(): void {
    // Getting Current user now
    this.fronteggAuthService?.user$.subscribe((user) => {
      this.user = user;
    })

    // Setting for use into full screen
    this.elem = document.documentElement;

    this.route.params.pipe(switchMap((params: Params) => {
      this.spinner.show();
      this.meetingId = params['id'];
      return this.api.getMeeting(params['id']);
    }))
    .subscribe((obj:Meeting) => {
      this.spinner.hide();
      
      if (obj.id === undefined || obj.id === null) {
        this.toastr.info("No Meeting Found", "Not Found");
        this.router.navigate(['/']);
      } else {
        if(this.checkIsExpired(obj)) {  
          this.toastr.warning("Meeting Link Expired", "Expired");
          this.router.navigate(['/']); 
        } else {
          if(this.checkIfBeforeMeetingTime(obj)) {
            this.toastr.info("Meeting is Not Started Yet", "Not Started");
            this.router.navigate(['/']); 
          } else {
            this.toastr.success('Room Joined!!', 'Success');
            this.setMeetingEndTimer(obj);
          }
        }
      }
      
    }, err => {
      this.spinner.hide();
      this.toastr.error(err, "Error");
      this.router.navigate(['/']);
    });


    this.agoraService.connectedUsers.subscribe(users => {
      this.connectedUsers = {};
      try {
        for (const [key, value] of Object.entries<any>(users)) {
          this.connectedUsers[key.toString()] = value.name; 
        }
      } catch(e) {
      }
    });

    this.agoraService.cameraLength.subscribe((l:number) => {
      this.cameras = l;
    });
  }

  // =======================================

  
  public toggleScreen():void {
    if (!this.isFullScreen) {
      this.openFullscreen();
    }
    else {
      this.closeFullscreen();
    }
    this.isFullScreen = !this.isFullScreen;
  }

  private openFullscreen() {
    if (this.elem.requestFullscreen) {
      this.elem.requestFullscreen();
    } else if (this.elem.mozRequestFullScreen) {
      /* Firefox */
      this.elem.mozRequestFullScreen();
    } else if (this.elem.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      this.elem.webkitRequestFullscreen();
    } else if (this.elem.msRequestFullscreen) {
      /* IE/Edge */
      this.elem.msRequestFullscreen();
    }
  }
  
  /* Close fullscreen */
  private closeFullscreen() {
    if (this.document.exitFullscreen) {
      this.document.exitFullscreen();
    } else if (this.document.mozCancelFullScreen) {
      /* Firefox */
      this.document.mozCancelFullScreen();
    } else if (this.document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      this.document.webkitExitFullscreen();
    } else if (this.document.msExitFullscreen) {
      /* IE/Edge */
      this.document.msExitFullscreen();
    }
  }

  public inHi(inChat:boolean):void {
    if(this.vdStreamHeight) {  
      if(!this.isInChat && inChat) {
        document.getElementById('video-streams')!.style.height = '13vh'
        document.getElementById('chat-streams')!.style.height = '65vh'
        this.isInChat = true;
      }
    } else {
      if(this.isInChat && !inChat) {
        document.getElementById('video-streams')!.style.height = '65vh'
        document.getElementById('chat-streams')!.style.height = '13vh'
        this.isInChat = false;
      }
    }
    this.vdStreamHeight = !this.vdStreamHeight;
  }

  public switchCamera():void {
    this.agoraService.switchDevice();
  }

  public selectUserToSend(data:any):void {
    console.log(data); 
  }

  public sendMessage(selectValue:any):void {
    // 0 means sent to all
    let sv = selectValue.value;

    if(this.msg.trim() !== "") {

      let t = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

      let msgDiv = `
      <div class="message-div text-white p-1 pb-2">
        <div class="d-flex">
          <div class="sender">You${sv.toString() === "0" ? "": (" sent to " + this.agoraService.remoteChatUsers[sv].name)} </div>
          <div class="msg-date"> ${t}</div>
        </div>
        <div class="message-text">${this.msg}</div>
      </div>`;

      // Append the message div to chat-streams div and scroll to the bottom
      document.getElementById('chats')!.innerHTML += msgDiv;
      document.getElementById('chats')!.scrollTop = document.getElementById('chats')!.scrollHeight;
      

      if(sv.toString() === "0") {
        this.agoraService.sendMessage(this.msg);
      } else {
        this.agoraService.sendMessageToPeer(this.msg, sv.toString())
      }

      // Clear the message input
      this.msg = "";
    }
    
  }

  public async leaveStream ():Promise<void> {
    this.agoraService.leaveCall();
  }

   // Turn on and off local mike
   public async toggleMic(e:any):Promise<void> {
    if (this.agoraService.localTracks[0].muted){      
      document.getElementById('mouser-ourself')!.style.display = 'block'
      document.getElementById('moffuser-ourself')!.style.display = 'none'
      await this.agoraService.localTracks[0].setMuted(false)
    }else{
      document.getElementById('mouser-ourself')!.style.display = 'none'
      document.getElementById('moffuser-ourself')!.style.display = 'block'
      await this.agoraService.localTracks[0].setMuted(true)
    }
    this.mikeOn = !this.mikeOn;
  }
  
  // Turn on and off local camera
  public async toggleCamera (e:any):Promise<void> {
    if(this.agoraService.localTracks[1].muted){
      document.getElementById('coffuser-ourself')!.style.display = 'none'
      await this.agoraService.localTracks[1].setMuted(false)
    }else{
      document.getElementById('coffuser-ourself')!.style.display = 'block'
      await this.agoraService.localTracks[1].setMuted(true)
    }
    this.cameraOn = !this.cameraOn;
  }

  // =========================================

  
  openSm(content:any) {
    this.modalService.open(content, { size: 'sm', centered: true });
  }

  private async setMeetingEndTimer(obj:Meeting):Promise<void> {
    let toTime = obj.toTime.split(":");
    let scheduleDate = obj.scheduleDate.split("-");

    let d1 = new Date(parseInt(scheduleDate[2]), (parseInt(scheduleDate[1]) - 1), parseInt(scheduleDate[0]), parseInt(toTime[0]), parseInt(toTime[1]));
    let d2 = new Date();
    
    const diff = d1.getTime() - d2.getTime();
    await this.agoraService.joinMeeting(this.meetingId, this.user);
    
    setTimeout(() => {
      this.openSm(this.modalContent);
      document.getElementById("timerId")!.innerHTML = `
      <div class="base-timer d-flex">
        <b><span>Meeting will end in </span>
        <span id="base-timer-label" class="base-timer__label">${this.formatTime(
          this.timeLeft
        )}</span><span> minutes.</span></b>
      </div>
      `;

      this.startTimer();

      setTimeout(async () => { // Will trigger after 10 minutes and then redirected to main page
        await this.agoraService.leaveCall();

        this.toastr.warning("Meeting Link Expired", "Expired");
        this.router.navigate(['/']); 
      }, (1000 * 60 * 5));
    }, diff);
  }

  // This will check if the person arrived before meeting
  private checkIfBeforeMeetingTime(obj:Meeting): boolean {
    try {
      let fromTime = obj.fromTime.split(":");
      let scheduleDate = obj.scheduleDate.split("-");

      // (parseInt(scheduleDate[1]) - 1) => we are decrementing 1 month because if you see in hoe.component in setInitialDateTime we increment extra by 1 to show in human format
      let d1 = new Date(parseInt(scheduleDate[2]), (parseInt(scheduleDate[1]) - 1), parseInt(scheduleDate[0]), parseInt(fromTime[0]), parseInt(fromTime[1]));
      let d2 = new Date();

      if(d1 < d2) {
        return false;
      } else {
        return true;
      }
    }
    catch(e) {
      return true;
    }
  }

  
  private checkIsExpired(obj:Meeting):boolean {
    try {
      let toTime = obj.toTime.split(":");
      let scheduleDate = obj.scheduleDate.split("-");
  
      // (parseInt(scheduleDate[1]) - 1) => we are decrementing 1 month because if you see in hoe.component in setInitialDateTime we increment extra by 1 to show in human format
      let d1 = new Date(parseInt(scheduleDate[2]), (parseInt(scheduleDate[1]) - 1), parseInt(scheduleDate[0]), parseInt(toTime[0]), parseInt(toTime[1]));
      let d2 = new Date();
  
      if(d1 > d2) {
        return false;
      } else {
        return true;
      }
    } catch(e) {
      return true;
    }
  }

  //  FOR TIMER
  private TIME_LIMIT:number = (60 * 5);
  private timePassed:number = 0;
  private timeLeft:number = this.TIME_LIMIT;
  private timerInterval:any = null;


  private onTimesUp():void {
    clearInterval(this.timerInterval);
  }

  private startTimer():void {
    this.timerInterval = setInterval(() => {
      this.timePassed = this.timePassed += 1;
      this.timeLeft = this.TIME_LIMIT - this.timePassed;
      try {
        document.getElementById("base-timer-label")!.innerHTML = this.formatTime(
          this.timeLeft
        );  
      } catch (error) {}

      if (this.timeLeft === 0) {
        this.onTimesUp();
      }
    }, 1000);
  }

  private formatTime(time:any):string {
    const minutes = Math.floor(time / 60);
    let seconds = time % 60;
    let assignS = seconds < 10 ? "0" + seconds : seconds;
    return `${minutes}:${assignS}`;
  }


}
