package com.frontegg.springbootwebfluxsample.model;

import java.util.Objects;

import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
public class MeetingDTO {
	String id;
	String createdBy;
	String scheduleDate;
	String fromTime;
	String toTime;
	
		
	public MeetingDTO(String id, String createdBy, String scheduleDate, String fromTime, String toTime) {
		super();
		this.id = id;
		this.createdBy = createdBy;
		this.scheduleDate = scheduleDate;
		this.fromTime = fromTime;
		this.toTime = toTime;
	}
	


	@Override
	public String toString() {
		return "MeetingDTO [id=" + id + ", createdBy=" + createdBy + ", scheduleDate=" + scheduleDate + ", fromTime="
				+ fromTime + ", toTime=" + toTime + "]";
	}


	@Override
	public int hashCode() {
		return Objects.hash(createdBy, fromTime, id, scheduleDate, toTime);
	}


	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		MeetingDTO other = (MeetingDTO) obj;
		return Objects.equals(createdBy, other.createdBy) && Objects.equals(fromTime, other.fromTime)
				&& Objects.equals(id, other.id) && Objects.equals(scheduleDate, other.scheduleDate)
				&& Objects.equals(toTime, other.toTime);
	}





	public String getToTime() {
		return toTime;
	}



	public void setToTime(String toTime) {
		this.toTime = toTime;
	}



	public void setFromTime(String fromTime) {
		this.fromTime = fromTime;
	}



	public String getId() {
		return id;
	}



	public void setId(String id) {
		this.id = id;
	}



	public String getCreatedBy() {
		return createdBy;
	}



	public void setCreatedBy(String createdBy) {
		this.createdBy = createdBy;
	}



	public String getScheduleDate() {
		return scheduleDate;
	}



	public void setScheduleDate(String scheduleDate) {
		this.scheduleDate = scheduleDate;
	}



	public String getFromTime() {
		return fromTime;
	}


	
}

