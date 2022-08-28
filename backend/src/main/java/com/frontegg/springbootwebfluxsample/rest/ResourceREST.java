package com.frontegg.springbootwebfluxsample.rest;

import com.frontegg.springbootwebfluxsample.model.MeetingDTO;
import com.frontegg.springbootwebfluxsample.model.Message;
import com.frontegg.springbootwebfluxsample.service.MeetingService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
public class ResourceREST {

	@Autowired
	private MeetingService service;
	
	@GetMapping(value = "/api/{meetingId}")
    public ResponseEntity<?> getMeetingById(@PathVariable String meetingId) {
        try {			
			return new ResponseEntity<>(service.getMeetingById(meetingId), HttpStatus.OK);
		} catch (Exception e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
		}
    }
	
	@GetMapping(value = "/api/meetings/{mailId}")
    public ResponseEntity<?> getMeetingsByMail(@PathVariable String mailId) {
        try {			
			return new ResponseEntity<>(service.getMeetingsByMail(mailId), HttpStatus.OK);
		} catch (Exception e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
		}
    }
	
	@PostMapping(value = "/api/add")
	public ResponseEntity<?> addNewMeeting(@RequestBody MeetingDTO meetingData) {
		try {			
			return new ResponseEntity<>(service.addNewMeeting(meetingData), HttpStatus.OK);
		} catch (Exception e) {
			return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}

    @GetMapping("/resource/with_authorization")
    public Mono<ResponseEntity<Message>> withAuthorization(@RequestHeader("Authorization") String header) {
    	System.out.println(header);
        return Mono.just(ResponseEntity.ok(new Message("Content with authorization")));
    }

    @GetMapping("/resource/with_roles")
    @PreAuthorize("@fronteggSecurityMethod.isAuthorizedWithRoles(#header, {'Admin'})")
    public Mono<ResponseEntity<Message>> withRoles(@RequestHeader("Authorization") String header) {
        return Mono.just(ResponseEntity.ok(new Message("Content with roles")));
    }

    @GetMapping("/resource/with_permissions")
    @PreAuthorize("@fronteggSecurityMethod.isAuthorizedWithPermissions(#header, {'read-slack', 'read-webhooks'})")
    public Mono<ResponseEntity<Message>> withPermissions(@RequestHeader("Authorization") String header) {
        return Mono.just(ResponseEntity.ok(new Message("Content with permissions")));
    }
}
