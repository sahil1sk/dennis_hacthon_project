import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FronteggAuthService } from '@frontegg/angular';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import AgoraRTC, { IAgoraRTCClient, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import AgoraRTM, { RtmChannel, RtmClient } from 'agora-rtm-sdk';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiService } from './api.service';


enum USER_INFO {
  AUDIO_MUTED = "mute-audio",
  AUDIO_UNMUTED = "unmute-audio",
  VIDEO_MUTED = "mute-video",
  VIDEO_UNMUTED = "unmute-video",
}


@Injectable({
  providedIn: 'root'
})
export class AgoraService {

  public connectedUsers:BehaviorSubject<any> = new BehaviorSubject<any>({});
  public cameraLength:BehaviorSubject<number> = new BehaviorSubject<number>(1);

  public localTracks:any = [];
  public remoteUsers:any = {};

  private rtmClient!:RtmClient;
  private rtmChannel!:RtmChannel;
  private rtcClient!:IAgoraRTCClient;


  private isMeetingJoined:boolean = false;
  user?: any; // This contains user data like name, email, etc
  focusedUser:any; // this contains Agora RTC user of video

  // Just reusable strings
  mo:string = "mo";
  moff:string = "moff";
  camff:string = "camoff";


  public remoteChatUsers:any = {};

  // Contains list of cameras available for use
  private cameras:any;
  private cameraIndex:number = 1;

  constructor(
    private fronteggAuthService: FronteggAuthService, 
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private api: ApiService,
    private modalService: NgbModal,
  ) {
    // Getting Current user now
    this.fronteggAuthService?.user$.subscribe((user) => {
      this.user = user;

      if(this.user == null && this.isMeetingJoined) {
        this.leaveCall();
      }
    })

    this.rtmClient = AgoraRTM.createInstance(environment.agoraAppId, { enableLogUpload: false }); // Pass your App ID here.
    this.rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Get available devices with camera input
    try {
      AgoraRTC.getDevices().then(devices => {
        this.cameras = devices.filter(device => device.kind === 'videoinput');
        this.cameraLength.next(this.cameras.length); // setting camera length
       });

    }catch(e) {}

  }

  // Generating Integered String because our Unique ID string having character
  private getUserId():number {
    let randomNumber = Math.floor(Math.random() * Math.floor(1000000000));

    let userId = localStorage.getItem('userId') ?? randomNumber.toString();
    if(userId == randomNumber.toString()) {
      localStorage.setItem('userId', randomNumber.toString());
    }

    return parseInt(userId);
  }

  public async joinMeeting(meetingId:string, userData:any): Promise<void> {
    let userId = this.getUserId();
    
    this.spinner.show();
    this.api.generateChatToken(userId).subscribe(
      async (data:any) => {
        try {
          await this.startChatCall(userId.toString(), meetingId, data.token, userData);
          this.api.generateVideoCallToken(userId, meetingId).subscribe(
            async (data:any) => {
              try {
                await this.startVideoCall(userId.toString(), meetingId, data.token);
                // For Responsiveness and full screen effect
                document.getElementById("navbarId")!.style.display = 'none';
                this.isMeetingJoined = true;          
                this.spinner.hide();
              }catch(e) {
                this.goOut();
              }
            },
            err => {
              this.goOut();
            });
        } catch(e) {
          this.goOut();
        }
      },
      err => {
        this.goOut();
    });
  }

  private async goOut():Promise<void> {
    this.spinner.hide();
    await this.leaveCall();
    this.toastr.error('Error joining meeting (Another Meeting in Progress ?)', 'Error');
    this.router.navigate(['/']);
  }

  public async switchDevice():Promise<void> {
    try {
      this.cameraIndex = (++this.cameraIndex) % this.cameras.length;
   
      let id = this.cameras[this.cameraIndex].deviceId;
      await this.rtcClient.unpublish([this.localTracks[0], this.localTracks[1]]);

      
      this.localTracks[1].stop()
      this.localTracks[1].close()

      this.localTracks[1] = await AgoraRTC.createCameraVideoTrack({cameraId: id});  
      await this.rtcClient.publish([this.localTracks[0], this.localTracks[1]]);
      this.localTracks[1].play(`user-ourself`);
    } catch(e) {
    }
  }

  // Starting video call
  private async startVideoCall(userId:string, channelName:string, callToken:string):Promise<void> {
    try {
      this.rtcClient.on('user-published', (user:IAgoraRTCRemoteUser, mediaType:string) => this.handleUserPublished(user, mediaType, this.rtcClient));
      this.rtcClient.on('user-joined', (user:IAgoraRTCRemoteUser) => {
        this.remoteUsers[user.uid] = user; // setting remote new user
        
        this.remoteUserJoined(user, (uid:any) => {
          this.focusPointedVideo(uid);    
        }, this.remoteChatUsers[user.uid].color, this.remoteChatUsers[user.uid].name);

      });
      
      this.rtcClient.on('user-left', (user:IAgoraRTCRemoteUser) =>  {
        this.handleUserLeft(user, (focusUser:any)=> {
          this.triggerAudioVideo(focusUser);
        });
      });

      this.rtcClient.on('user-info-updated',  this.userInfoUpdated);

      // When token previlage is going to expire renew them // Call before 60 Seconds of expire time
      this.rtcClient.on('token-privilege-will-expire', () => {
        this.toastr.info("Renewoing your session", "Renewing Token");
        this.spinner.show();

        this.api.generateVideoCallToken(parseInt(userId), channelName).subscribe(
          async (data:any) => {
            try {
              await this.rtcClient.renewToken(data.token);
              this.spinner.hide();
            }catch(e) {
              this.goOut();
            }
          },
          err => {
            this.goOut();
          });
      });
      
      this.rtcClient.on('exception', (evt:any) => {
        // console.log("Exception occured in start Basic call =========>");
        // console.log(evt);
        // alert(evt.msg);
      })

      await this.rtcClient.join(environment.agoraAppId, channelName, callToken, userId);
      this.localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
    

      // Getting attributes of local user which we added while joining from chat
      let userData = await this.rtmClient.getUserAttributes(userId)

      document.getElementById('coffuser-ourself')!.style.background = userData.color;
      document.getElementById('coffuser-ourself')!.innerText = 'You';
  
      this.localTracks[1].play(`user-ourself`);
      await this.localTracks[0].setMuted(true)
      await this.localTracks[1].setMuted(true)
        
      await this.rtcClient.publish([this.localTracks[0], this.localTracks[1]]);
  
      document.getElementById('mouser-ourself')!.style.display = 'none';
      document.getElementById('moffuser-ourself')!.style.display = 'block';
      document.getElementById('coffuser-ourself')!.style.display = 'block';
    } catch(e:any) {
      if(e.message === 'AgoraRTCError PERMISSION_DENIED: NotAllowedError: Permission denied') {
        alert('Please allow the browser to access your microphone and camera');
      } else {
        throw e;
      }
    }
  }

  // This is when remote user turned on or off his video or mike
  private async userInfoUpdated(uid:any, msg:any):Promise<void> {
    if(USER_INFO.AUDIO_MUTED == msg) {
      document.getElementById(`mo${uid}`)!.style.display = 'none';
      document.getElementById(`moff${uid}`)!.style.display = 'block';
    } else if (USER_INFO.VIDEO_MUTED == msg) {
      document.getElementById(`camoff${uid}`)!.style.display = 'block';
    } else if (USER_INFO.AUDIO_UNMUTED == msg) {
      document.getElementById(`mo${uid}`)!.style.display = 'block';
      document.getElementById(`moff${uid}`)!.style.display = 'none';
    } else if (USER_INFO.VIDEO_UNMUTED == msg) {
      document.getElementById(`camoff${uid}`)!.style.display = 'none';
    }
  }

  // When remote user Joined
  private async remoteUserJoined(user:IAgoraRTCRemoteUser, focusPointUserFunction:any, randomColor:string, name:string):Promise<void> {
    let player:any = document.getElementById(`user-container-${user.uid}`);
    if(player != null) { // If there is already user with this id then remove that one user div
      player.remove();
    }


    player = `<div class="video-container col-12 col-xs-6 col-sm-6 col-md-12 col-lg-6" id="user-container-${user.uid}">
    <div class="video-player cp" id="user-${user.uid}"></div>
    <div class="text-white mikeOn" id="mo${user.uid}"><i class="fa fa-microphone" aria-hidden="true"></i></div>
    <div class="text-white mikeOFF" id="moff${user.uid}"><i class="fa fa-microphone-slash" aria-hidden="true"></i></div>
    <div class="text-white cameraOff" id="camoff${user.uid}" style="background: ${randomColor};">${name}</div>
    </div>`;
    
    document.getElementById('video-streams')!.insertAdjacentHTML('beforeend', player);
    document.getElementById(`mo${user.uid}`)!.style.display = 'block';
    document.getElementById(`camoff${user.uid}`)!.style.display = 'block';
    
    // playing directly the div of user-{userid} video (video-player div)    
    document.getElementById(`user-${user.uid}`)!.addEventListener('click', () => this.focusPointedVideo(user.uid));
    document.getElementById(`camoff${user.uid}`)!.addEventListener('click', () => this.focusPointedVideo(user.uid));
    
    
    if(this.focusedUser == null) {
      await focusPointUserFunction(user.uid);
    }
  }

  
  // This will trigger when the user audio or video is published
  private async handleUserPublished(user:IAgoraRTCRemoteUser, mediaType:string, client:any):Promise<void> {
    this.remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType); // add to the local client object
    
    if(mediaType === 'video'){
      try {
        user.videoTrack!.play(`user-${user.uid}`);   
      } catch(e) {}
    }

    try {
      if (mediaType === 'audio') {
        user.audioTrack!.play();
      }
    } catch(e) {}
  }

  
  private async handleUserLeft(user:any, triggerAudioVideo:Function):Promise<void> {
    delete this.remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`)!.remove();

    if(this.focusedUser != null && this.focusedUser.uid === user.uid) {
      this.focusedUser = null;
    }
    

    // From Library function Angular function not accessbale that's why done in this way
    if(this.focusedUser == null) {
      if(Object.keys(this.remoteUsers).length > 0) {
        let focusUser:any = Object.values(this.remoteUsers)[0];

        document.getElementById(`user-container-${focusUser.uid}`)!.remove();
        this.focusedUser = focusUser;
        let userData = await this.remoteChatUsers[focusUser.uid];

        let player = `<div class="video-container" style="height: 100%;" id="user-container-${focusUser.uid}">
            <div class="video-player" style="height: 100%;" id="user-${focusUser.uid}"></div>
            <div class="text-white mikeOn" id="mo${focusUser.uid}" style="left:25px;"><i class="fa fa-microphone" aria-hidden="true"></i></div>
            <div class="text-white mikeOFF" id="moff${focusUser.uid}" style="left:25px;"><i class="fa fa-microphone-slash" aria-hidden="true"></i></div>
            <div class="text-white mainCameraOff" id="camoff${focusUser.uid}" style="background: ${userData.color};">${userData.name}</div>
        </div>`;

        
        document.getElementById('main-video')!.innerHTML = player; 
        triggerAudioVideo(focusUser);
      }
    }
  }

  // This is for playing the video if it is not playing but the status is of playing
  private triggerAudioVideo(user:any):void {
    if(user._video_muted_) {
      document.getElementById(`camoff${user.uid}`)!.style.display = 'block';
    } else {
      try{
        user.videoTrack.play(`user-${user.uid}`);
      }catch(e){}
      document.getElementById(`camoff${user.uid}`)!.style.display = 'none';
    }
    
    if(user._audio_muted_) {
      document.getElementById(`mo${user.uid}`)!.style.display = 'none';
      document.getElementById(`moff${user.uid}`)!.style.display = 'block';
    } else {
      document.getElementById(`mo${user.uid}`)!.style.display = 'block';
      document.getElementById(`moff${user.uid}`)!.style.display = 'none';
      // user.audioTrack.play();
    }
  }

  // This function is to set the user at the Big screen
  public async focusPointedVideo(uid:any):Promise<void> {
    // First remove the dive where user clicked
    document.getElementById(`user-container-${uid}`)!.remove();
    
    // Set the user at the big screen
    window.scrollTo(0, 0);

    try {
    // If already there is user on focus then check
    if(this.focusedUser != null) {
      // Now check if the focus user is still in stream or not
      for(let key in this.remoteUsers) {
        if(this.remoteUsers[key].uid === this.focusedUser.uid) {
          
          // Remove last focused user from the big screen
          document.getElementById(`user-container-${this.focusedUser.uid}`)!.remove();
          
          // let user = this.remoteUsers[this.remoteUsers[key].uid];
          let user = this.remoteUsers[this.remoteUsers[key].uid];
          // Means there is still that one last user in stream
          let player = `<div class="video-container col-12 col-xs-6 col-sm-6 col-md-12 col-lg-6" id="user-container-${user.uid}">
            <div class="video-player cp" id="user-${user.uid}"></div>
            <div class="text-white mikeOn" id="${this.mo}${user.uid}"><i class="fa fa-microphone" aria-hidden="true"></i></div>
            <div class="text-white mikeOFF" id="${this.moff}${user.uid}"><i class="fa fa-microphone-slash" aria-hidden="true"></i></div>
            <div class="text-white cameraOff" id="${this.camff}${user.uid}" style="background: ${this.remoteChatUsers[uid].color};">${this.remoteChatUsers[uid].name}</div>
          </div>`;
          document.getElementById('video-streams')!.insertAdjacentHTML('beforeend', player);

          this.triggerAudioVideo(user);
          
          document.getElementById(`user-${user.uid}`)!.addEventListener('click', this.focusPointedVideo.bind(this, user.uid));
          document.getElementById(`camoff${user.uid}`)!.addEventListener('click', this.focusPointedVideo.bind(this, user.uid));
          
          // break;
        }
      }
    }
    } catch {}

    
    let focusUser = this.remoteUsers[uid]; 
    this.focusedUser = focusUser;
    
    
    let player = `<div class="video-container" style="height: 100%;" id="user-container-${focusUser.uid}">
        <div class="video-player" style="height: 100%;" id="user-${focusUser.uid}"></div>
            <div class="text-white mikeOn" id="${this.mo}${focusUser.uid}" style="left:25px;"><i class="fa fa-microphone" aria-hidden="true"></i></div>
            <div class="text-white mikeOFF" id="${this.moff}${focusUser.uid}" style="left:25px;"><i class="fa fa-microphone-slash" aria-hidden="true"></i></div>
            <div class="text-white mainCameraOff" id="${this.camff}${focusUser.uid}" style="background: ${this.remoteChatUsers[focusUser.uid].color};">${this.remoteChatUsers[focusUser.uid].name}</div>
    </div>`;

    document.getElementById('main-video')!.innerHTML = player;
    this.triggerAudioVideo(this.focusedUser);
  }

  // Starting Chat Function

  private async startChatCall(userId:string, channelName:string, chatToken:string, userData:any):Promise<void> {
    this.rtmClient.on('ConnectionStateChanged', (state, reason) => {
      // console.log('Connection state changed: ' + state);
    });

    this.rtmClient.on('MessageFromPeer', (message, peerId) => {
      this.receivedMessage(true, message.text ?? "", peerId);
    });


    // Regenerate chat token here and call renewToken() to update the token. // Call before 60 seconds of expire time
    this.rtmClient.on("TokenPrivilegeWillExpire", () => {
      this.toastr.info("Renewoing your session", "Renewing Token");
        this.spinner.show();

        this.api.generateChatToken(parseInt(userId)).subscribe(
          async (data:any) => {
            try {
              await this.rtmClient.renewToken(data.token);
              this.spinner.hide();
            }catch(e) {
              this.goOut();
            }
          },
          err => {
            this.goOut();
          });
    });

    await this.rtmClient.login({
      uid: userId,
      token: chatToken,
    });

    
    // Create channel set it's events and then join.
    this.rtmChannel = this.rtmClient.createChannel(channelName);
    this.rtmChannel.on('ChannelMessage', (message, peerId) => {
      this.receivedMessage(false, message.text ?? "", peerId);
    });

    this.rtmChannel.on('MemberJoined', async (memberId) => {
      this.remoteChatUsers[memberId] = await this.rtmClient.getUserAttributes(memberId);
      this.connectedUsers.next(this.remoteChatUsers);  // adding new connected user;
      this.toastr.success(this.remoteChatUsers[memberId].name  + " joined the call.", "Joined")
    });

    this.rtmChannel.on('MemberLeft', (memberId) => {
      try {
        this.toastr.info(this.remoteChatUsers[memberId].name  + " left the call.", "Leave")
        delete this.remoteChatUsers[memberId];
        this.connectedUsers.next(this.remoteChatUsers);  // removing disconnected user;
      } catch(e) {}
    });

    await this.rtmChannel.join();
    await this.rtmClient.addOrUpdateLocalUserAttributes({
      name: userData.name,
      // color: '#' + Math.floor(Math.random() * 16777215).toString(16) // setting random color for user
      color: "hsl(" + Math.random() * 360 + ", 100%, 75%)" // setting random color for user
    });

    
    // Get already Joined members in the chat and then add them into our remoteChatUsers object.
    let joinedMembers = await this.rtmChannel.getMembers();
    for(let i = 0; i < joinedMembers.length; i++) {
      if(joinedMembers[i].toString() != userId.toString()) {
        this.remoteChatUsers[joinedMembers[i]] = await this.rtmClient.getUserAttributes(joinedMembers[i]);
      }
    }
    this.connectedUsers.next(this.remoteChatUsers);

  }

  private async receivedMessage(youOnly:boolean, msg:string, peerId:string):Promise<void> {
    
    let t = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    let msgDiv = `
    <div class="message-div text-white p-1 pb-2">
      <div class="d-flex">
        <div class="sender">${this.remoteChatUsers[peerId].name}${youOnly ? " sent to you": " "} </div>
        <div class="msg-date"> ${t}</div>
      </div>
      <div class="message-text">${msg}</div>
    </div>`;

    // Append the message div to chat-streams div and scroll to the bottom
    document.getElementById('chats')!.innerHTML += msgDiv;
    document.getElementById('chats')!.scrollTop = document.getElementById('chats')!.scrollHeight;
  }

  public async sendMessage(message:string):Promise<void> {
    await this.rtmChannel.sendMessage({text: message}); 
  }

  public async sendMessageToPeer(message:string, peerId:string):Promise<void> {
    await this.rtmClient.sendMessageToPeer({ text: message }, peerId);
  }

  //  ========= Leave meeting =========
  public async leaveCall():Promise<void> {
    this.spinner.show();
    try {
      // If any modal open then please dismiss
      this.modalService.dismissAll();
    } catch(err) {}

    try {
      await this.rtmChannel.leave();
      await this.rtmClient.logout();
    }catch(e) {}

    try {
      await this.leaveVideos();
    } catch(e) {}

    try {
      this.remoteChatUsers = {};
      this.connectedUsers.next({});
    } catch(e) {}

    
    // Setting empty camera list now
    this.cameras = [];
    this.cameraLength.next(1);

    // Getting back our navbar to return from full screen
    document.getElementById("navbarId")!.style.display = 'block';


    this.spinner.hide();
    this.isMeetingJoined = false;
    this.router.navigate(['/']);
  }

  private async leaveVideos():Promise<void> {
    for(let i = 0; this.localTracks.length > i; i++){
      this.localTracks[i].stop()
      this.localTracks[i].close()
    }
    await this.rtcClient.leave();
    
    this.localTracks = [];
    this.remoteUsers = {};
    document.getElementById('video-streams')!.innerHTML = ''
  }

}
