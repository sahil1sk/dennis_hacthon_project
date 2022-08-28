import { Pipe, PipeTransform } from '@angular/core';
import { CMeeting } from '../models/Meeting';

@Pipe({
  name: 'scheduleList'
})
export class ScheduleListPipe implements PipeTransform {

  transform(value: CMeeting[], ...args: unknown[]): CMeeting[] {
    
    return value.sort((a:CMeeting, b:CMeeting) => {
      if(a.sd < b.sd) {
        return -1;
      } else if (a.sd > b.sd) {
        return 1;
      } else {
        return 0;
      }
    });
  }

}
