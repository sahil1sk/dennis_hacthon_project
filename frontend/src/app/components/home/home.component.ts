import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FronteggAuthService } from '@frontegg/angular';
import { NgbDateStruct, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { CMeeting, Meeting } from 'src/app/models/Meeting';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  id: string = "";
  user?: any;
  showShedule: boolean = false;

  // --- For Scheduling ---
  model!: NgbDateStruct;
  date!: { year: number, month: number };

  time1 = { hour: 13, minute: 1 };
  time2 = { hour: 13, minute: 30 };
  meridian1 = true;
  meridian2 = true;

  minDate!:NgbDateStruct;

  meetings:CMeeting[] = [];


  constructor(
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private fronteggAuthService: FronteggAuthService,   
    private api: ApiService,
    private modalService: NgbModal,
  ) { 
    
  }

  
  
  public openSm(content:any) {
    this.modalService.open(content, { size: 'sm', centered: true });
  }

  private setDates():void {
    try {
      let date:Date = new Date();
      let hours = date.getHours();
      let minutes = date.getMinutes();
      
      let ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      let mint = minutes < 10 ?  ("0" + minutes) : minutes.toString();
      
      let d = new Date().toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"});
      
      document.getElementById('time-pa')!.innerHTML = `${hours}:${mint} ${ampm}`; 
      document.getElementById('date-pa')!.innerHTML = d; 
    } catch(e) {}
  }

  // check id id is not empty and then push to another room page
  public joinRoom(): void {
    if (this.id.trim() === "") {
      this.toastr.error("Please fill the field", "Error");
    } else {
      let idOrLink = this.id;
      if (idOrLink.indexOf("http://") == 0 || idOrLink.indexOf("https://") == 0) {
        this.id = idOrLink.split("/").pop() ?? "";
      } else if (idOrLink.includes('/')) {
        this.id = idOrLink.split("/").pop() ?? "";
      }

      if(this.id == "") {
        this.toastr.error("Please fill the correct link", "Error");
        return;
      }
      
      this.modalService.dismissAll();
      this.router.navigate(['/', this.id]);
    }
  }

  // show loader and then create new instant meeting
  public createInstantMeeting(): void {
    this.spinner.show();
    this.createOrStartNewMeeting(true);
  }

  // show loader and then create new scheduled meeting
  public createScheduledMeeting(): void {
    this.showShedule = false;
    this.spinner.show();
    this.createOrStartNewMeeting();
  }
  
  private createOrStartNewMeeting(newM:boolean = false):void {
    let meetObj:any = {
      "createdBy":  this.user.email,
      "fromTime": this.time1.hour + ":" + this.time1.minute,
      "scheduleDate": this.model.day + "-" + this.model.month + "-" + this.model.year,
      "toTime": this.time2.hour + ":" + this.time2.minute
    };

    this.api.addMeeting(meetObj).subscribe(
      obj => {
        this.spinner.hide();
        this.id = obj["id"];

        // So her we putting new object in the meeting list
        meetObj["id"] = this.id;
        
        let mo = this.generateListTile(meetObj);
        if(mo !== null && mo !== undefined) {
          this.meetings.unshift(mo);
        }
        

        // If instant meeting then push to the screen
        if(newM) this.router.navigate(['/', this.id]);
        else this.toastr.success('Meeting created successfully.', 'Meeting Scheduled');
      }, 
      err => {
        this.spinner.hide();
        this.toastr.error(err, "Error");
    });
  }

  public setTime(): void {
    if (this.time1.hour > this.time2.hour || (this.time1.hour == this.time2.hour && this.time1.minute >= this.time2.minute)) {
      this.setInitialDateTime(new Date(), true);
    }
  }

  private setInitialDateTime(date:Date, onlyTime:boolean = false):void {
    if(!onlyTime) {
      let month = date.getUTCMonth() + 1; //months from 1-12
      let day = date.getUTCDate();
      let year = date.getUTCFullYear();
      
      // --- Set Model with Date of today
      this.model = {
        "year": year,
        "month": month,
        "day": day
      };
    }

    let hours = date.getHours();
    let minutes = date.getMinutes();

    // Set timings of meeting from time
    this.time1 = {
      hour: hours,
      minute: minutes 
    }

    // Incrementing 30 minutes total in it.
    let date2 = new Date(date.getTime() + 30 * 60000);
    let hours2 = date2.getHours();
    let minutes2 = date2.getMinutes();

    // Set timing of meeting to time
    this.time2 = {
      hour: hours2,
      minute: minutes2 
    }
    
  }

  
  public copyLink(id:string):void {
    navigator.clipboard.writeText(`${window.location.hostname}/${id}`);
    this.toastr.success('Meeting Link copied on clipboard.', 'Meeting Scheduled');
  }

  private generateListTile(obj:any):CMeeting|void {
    try {
      let scheduleDate = obj.scheduleDate.split("-");
      let fromTime = obj.fromTime.split(":");
      let toTime = obj.toTime.split(":");
  
      let fhours = parseInt(fromTime[0]);
      let fminutes = parseInt(fromTime[1]);
  
      let thours = parseInt(toTime[0]);
      let tminutes = parseInt(toTime[1]);
      
      let ftD = this.getHT(fhours, fminutes);
      let ttD = this.getHT(thours, tminutes);
  
      let sd = new Date(parseInt(scheduleDate[2]), (parseInt(scheduleDate[1]) - 1), parseInt(scheduleDate[0])).toLocaleDateString('en-us', { weekday:"long", year:"numeric", month:"short", day:"numeric"});
      let ft = `${ftD[0]}:${ftD[1]} ${ftD[2]}`;
      let tt = `${ttD[0]}:${ttD[1]} ${ttD[2]}`;
  
      return  {
        createdBy: obj.createdBy,
        id:obj.id,
        scheduleDate: sd, 
        fromTime: ft,
        toTime: tt,
        sd: new Date(parseInt(scheduleDate[2]), (parseInt(scheduleDate[1]) - 1), parseInt(scheduleDate[0]), fhours, fminutes)
      }
    } catch(err) {}
  }

  private getMeetingsDisplay():void {
    this.api.getScheduleMeetings(this.user.email).subscribe(
      obj => {
        let meetings:CMeeting[] = [];
        
        for (let i = 0; i<obj.length; i++) {
          let scheduleDate = obj[i].scheduleDate.split("-");
          let toTime = obj[i].toTime.split(":");
            
          let d1 = new Date(parseInt(scheduleDate[2]), (parseInt(scheduleDate[1]) - 1), parseInt(scheduleDate[0]), parseInt(toTime[0]), parseInt(toTime[1]));
          let d2 = new Date();
          
          if(d1 < d2) {
            continue;
          } 
          
          let meetObj = this.generateListTile(obj[i]);
          if(meetObj !== null && meetObj !== undefined) {
            meetings.push(meetObj);
          }
        }

        this.meetings = meetings;
      },
      err => {
        this.toastr.error("While Fetching Schedules", "Error");
      }
    )
  }

  
  private getHT(hours:number, minutes:number) {
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    let mint = minutes < 10 ?  ("0" + minutes) : minutes.toString();
    return [hours, mint, ampm];
  }

  ngOnInit(): void {
    this.setInitialDateTime(new Date());
    this.fronteggAuthService?.user$.subscribe((user) => {
      this.user = user;
      if(this.user) {
        localStorage.setItem("accessToken", this.user.accessToken);
        this.getMeetingsDisplay();
      }
    })

    
    // Set current date and time on meeting schedule
    let current = new Date();
    this.minDate = {
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      day: current.getDate()
    };
   
    // Setting the dates updates 
    this.setDates();
    setInterval(() => this.setDates(), 1000 * 60)
  }

}
