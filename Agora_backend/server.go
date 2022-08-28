package main

import (
	rtctokenbuilder "github.com/AgoraIO/Tools/DynamicKey/AgoraDynamicKey/go/src/RtcTokenBuilder"
	"os"
	"fmt"
	"log"
	"net/http"
	"time"
	"encoding/json"
	// "errors"
	"strconv"
)

type rtc_int_token_struct struct{
	Uid_rtc_int uint32 `json:"uid"`
	Channel_name string `json:"ChannelName"`
	Role uint32 `json:"role"`
}

var rtc_token string
var int_uid uint32
var channel_name string

var role_num uint32
var role rtctokenbuilder.Role

// Use RtcTokenBuilder to generate an RTC token.
func generateRtcToken(int_uid uint32, channelName string, role rtctokenbuilder.Role){

	appID := "YOUR APP ID"
	appCertificate := "YOUR CERTIFICATE"
	// Number of seconds after which the token expires.
	// For demonstration purposes the expiry time is set to 40 seconds. This shows you the automatic token renew actions of the client.
	expireTimeInSeconds := uint32(4000000) // 4000 seconds = 40 seconds
	// Get current timestamp.
	currentTimestamp := uint32(time.Now().UTC().Unix())
	// Timestamp when the token expires.
	expireTimestamp := currentTimestamp + expireTimeInSeconds

	result, err := rtctokenbuilder.BuildTokenWithUID(appID, appCertificate, channelName, int_uid, role, expireTimestamp)
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Printf("Token with uid: %s\n", result)
		fmt.Printf("uid is %d\n", int_uid )
		fmt.Printf("ChannelName is %s\n", channelName)
		fmt.Printf("Role is %d\n", role)
	}
	rtc_token = result
}


func rtcTokenHandler(w http.ResponseWriter, r *http.Request){
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS");
	w.Header().Set("Access-Control-Allow-Headers", "*");

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" && r.Method != "OPTIONS" {
		http.Error(w, "Unsupported method. Please check.", http.StatusNotFound)
		return
	}


	var t_int rtc_int_token_struct
	// var unmarshalErr *json.UnmarshalTypeError
	int_decoder := json.NewDecoder(r.Body)
	int_err := int_decoder.Decode(&t_int)
	if (int_err == nil) {

				int_uid = t_int.Uid_rtc_int
				channel_name = t_int.Channel_name
				role_num = t_int.Role
				switch role_num {
				case 0:
					// DEPRECATED. RoleAttendee has the same privileges as RolePublisher.
					role = rtctokenbuilder.RoleAttendee
				case 1:
					role = rtctokenbuilder.RolePublisher
				case 2:
					role = rtctokenbuilder.RoleSubscriber
				case 101:
					// DEPRECATED. RoleAdmin has the same privileges as RolePublisher.
					role = rtctokenbuilder.RoleAdmin
				}
	}
	if (int_err != nil) {

		errorResponse(w, "Error in decoding json", http.StatusBadRequest)
		return
	}

	generateRtcToken(int_uid, channel_name, role)
	errorResponse(w, rtc_token, http.StatusOK)
	log.Println(w, r)
}

func errorResponse(w http.ResponseWriter, message string, httpStatusCode int){
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(httpStatusCode)
	resp := make(map[string]string)
	resp["token"] = message
	resp["code"] = strconv.Itoa(httpStatusCode)
	jsonResp, _ := json.Marshal(resp)
	w.Write(jsonResp)

}

func main(){
	// Handling routes
	// RTC token from RTC num uid
	http.HandleFunc("/fetch_rtc_token", rtcTokenHandler)

	// In local we couldn't set any env variables so please give port number by yourself
	port := os.Getenv("PORT")

	fmt.Printf("Starting server at port " + port + "\n")

	if err := http.ListenAndServe(":" + port, nil); err != nil {
		log.Fatal(err)
	}
}