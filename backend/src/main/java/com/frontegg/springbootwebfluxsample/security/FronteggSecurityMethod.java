package com.frontegg.springbootwebfluxsample.security;

import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

@Component("fronteggSecurityMethod")
public class FronteggSecurityMethod {

    @Autowired
    JWTUtil jwtUtil;

    public boolean isAuthorizedWithRoles(String authorizationHeader, List<String> roles) {
        return validateExistingClaims(authorizationHeader, "roles", roles);
    }

    public boolean isAuthorizedWithPermissions(String authorizationHeader, List<String> permissions) {
        return validateExistingClaims(authorizationHeader, "permissions", permissions);
    }

    @SuppressWarnings("unchecked")
	private boolean validateExistingClaims(String authorizationHeader, String claimName, List<String> elements) {
        String token = authorizationHeader.replace("Bearer ", "");
        Claims claims = jwtUtil.getAllClaimsFromToken(token);
        List<String> tokenElements = (List<String>) claims.get(claimName);
        if(tokenElements == null || tokenElements.size() == 0)
            return false;
        tokenElements.retainAll(elements);
        if(tokenElements.size() != 0)
            return true;
        return false;
    }
}
