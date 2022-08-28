package com.frontegg.springbootwebfluxsample.service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import com.frontegg.springbootwebfluxsample.model.MeetingDTO;


@Service
public class MeetingService {
	@Autowired
    private ConnectionService connectionService;
	
	public List<MeetingDTO> getMeetingsByMail(@PathVariable String mailId) throws Exception {
		List<MeetingDTO> meetings = new ArrayList<>();
		
		try {
			Connection conn = connectionService.createConnection();
            PreparedStatement statement = conn.prepareStatement("Select id, createdBy, scheduleDate, fromTime, toTime  From meeting_schema.meetings where createdBy = ?");
            statement.setString(1,mailId);
            ResultSet resultSet = statement.executeQuery();
            while (resultSet.next()) {
            	MeetingDTO dto = new MeetingDTO();
            	dto.setId(resultSet.getString(1));
            	dto.setCreatedBy(resultSet.getString(2));
            	dto.setScheduleDate(resultSet.getString(3));
            	dto.setFromTime(resultSet.getString(4));
            	dto.setToTime(resultSet.getString(5));
            	meetings.add(dto);
            }
            conn.close();
		} catch(Exception e) {
			 HashMap<String, String> result = new HashMap<>();
			 result.put("Error",e.getMessage());
	         throw new Exception(e.getMessage());
		}
		
		return meetings;
	}

	public HashMap<String, String> getMeetingById(@PathVariable String meetingId) throws Exception {
        HashMap<String, String> result = new HashMap<>();
		try {
            Connection conn = connectionService.createConnection();
            PreparedStatement statement = conn.prepareStatement("Select id, createdBy, scheduleDate, fromTime, toTime  From meeting_schema.meetings where id = ?");
            statement.setString(1,meetingId);
            ResultSet resultSet = statement.executeQuery();
            while (resultSet.next()) {
            	result.put("id", resultSet.getString(1));
                result.put("createdBy", resultSet.getString(2));
                result.put("scheduleDate", resultSet.getString(3));
                result.put("fromTime", resultSet.getString(4));
                result.put("toTime", resultSet.getString(5));
            }
            conn.close();
        } catch (Exception e){
            result.put("Error",e.getMessage());
            throw new Exception(e.getMessage());
        }
        
        return result;
    }
	
	public HashMap<String, String> addNewMeeting(@RequestBody MeetingDTO meetingData) throws Exception {
		 HashMap<String, String> result = new HashMap<>();
	        try {
	            Connection conn = connectionService.createConnection();
	            PreparedStatement statement = conn.prepareStatement("INSERT INTO meeting_schema.meetings (createdBy, scheduleDate, fromTime, toTime) VALUES (?,?,?,?)");
	            statement.setString(1, meetingData.getCreatedBy());
	            statement.setString(2, meetingData.getScheduleDate());
	            statement.setString(3, meetingData.getFromTime());
	            statement.setString(4, meetingData.getToTime());
	            int count = statement.executeUpdate();
	            
	            if(count>0) {
	                result.put("Message", "Success");
	                result.put("Affected rows", String.valueOf(count));
	                
	                try (ResultSet generatedKeys = statement.getGeneratedKeys()) {
	                    if (generatedKeys.next()) {
	                        result.put("id", generatedKeys.getString(1));
	                    }
	                    else {
	                        throw new SQLException("Creating user failed, no ID obtained.");
	                    }
	                }
	            }
	            conn.close();
	        } catch (Exception e){
	            result.put("Error",e.getMessage());
	            throw new Exception(e.getMessage());
	        }
	        return result;
	}
}
