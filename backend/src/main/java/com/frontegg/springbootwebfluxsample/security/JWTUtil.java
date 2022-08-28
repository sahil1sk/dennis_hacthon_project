package com.frontegg.springbootwebfluxsample.security;

import com.frontegg.springbootwebfluxsample.model.User;

import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.PublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.nimbusds.jose.util.Base64URL;
import javax.annotation.PostConstruct;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JWTUtil {

    @Value("${springbootwebfluxsample.frontegg_workspace_url}")
    private String fronteggWorkspaceUrl;

    @Value("${springbootwebfluxsample.jjwt.expiration}")
    private String expirationTime;

    private HashMap<String, Key> keys = new HashMap<>();

    Gson gson = new Gson();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .build();


    @PostConstruct
    public void init() throws IOException, InterruptedException, NoSuchAlgorithmException, InvalidKeySpecException {
        loadKeys();
    }

    private void loadKeys() throws IOException, InterruptedException, NoSuchAlgorithmException, InvalidKeySpecException {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .GET()
                    .uri(URI.create(fronteggWorkspaceUrl + "/.well-known/jwks.json"))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            JsonObject data = gson.fromJson(body, JsonObject.class);

            JsonArray arr = (JsonArray)data.get("keys");
            
            if(arr != null) {
                for(int i=0; i<arr.size();i++) {
                    String keyId = ((JsonObject)arr.get(i)).get("kid").getAsString();
                    keys.put(keyId, getKey((JsonObject) arr.get(i)));
                }	
            }

        } catch (Exception e) {
            System.out.println("Got error when fetching Public Key " + e.getMessage());
            throw e;
        }
    }

    private PublicKey getKey(JsonObject jwk) throws NoSuchAlgorithmException, InvalidKeySpecException {

        BigInteger modulus = new BigInteger(1, new Base64URL(jwk.get("n").getAsString()).decode());
        BigInteger exponent = new BigInteger(1, new Base64URL(jwk.get("e").getAsString()).decode());

        PublicKey pub = KeyFactory.getInstance("RSA").generatePublic(new RSAPublicKeySpec(modulus, exponent));
        return pub;
    }


    public Claims getAllClaimsFromToken(String token) {
        Key key = getKey(token);
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }

    private Key getKey(String token) {
        String[] chunks = token.split("\\.");
        Base64.Decoder decoder = Base64.getDecoder();
        String header = new String(decoder.decode(chunks[0]));
        String kid = gson.fromJson(header, JsonObject.class).get("kid").getAsString();
        Key key = this.keys.get(kid);
        return key;
    }

    public String getUsernameFromToken(String token) {
        return getAllClaimsFromToken(token).getSubject();
    }

    public Date getExpirationDateFromToken(String token) {
        return getAllClaimsFromToken(token).getExpiration();
    }

    private Boolean isTokenExpired(String token) {
        final Date expiration = getExpirationDateFromToken(token);
        return expiration.before(new Date());
    }

    public String generateToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", user.getRoles());
        return doGenerateToken(claims, user.getUsername());
    }

    private String doGenerateToken(Map<String, Object> claims, String username) {
        Long expirationTimeLong = Long.parseLong(expirationTime); //in second
        final Date createdDate = new Date();
        final Date expirationDate = new Date(createdDate.getTime() + expirationTimeLong * 1000);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)
                .setIssuedAt(createdDate)
                .setExpiration(expirationDate)
                //.signWith(key)
                .compact();
    }

    public Boolean validateToken(String token) {
        return !isTokenExpired(token);
    }

}
