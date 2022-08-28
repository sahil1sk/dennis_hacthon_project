package com.frontegg.springbootwebfluxsample.service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.springframework.stereotype.Service;

@Service
public class ConnectionService {
	public Connection createConnection() throws SQLException {
		return DriverManager.getConnection("Your Harpper DB CONNECTION STRING HERE");
	}

}
