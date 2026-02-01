package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
)

func hello(w http.ResponseWriter, req *http.Request) {
    fmt.Fprintf(w, "hello\n")
}

// HELPERS

func overpassQuery(lat, lng float64, radiusMeters int) string {
	return fmt.Sprintf(`
[out:json][timeout:25];
(
  way(around:%d,%.7f,%.7f)["highway"];
);
(._; >;);
out body;`, radiusMeters, lat, lng)
}


func (server *Server) parse_location(label string, latitude string, longitude string) (Location, error) {
	parsed_lat, err := strconv.ParseFloat(latitude, 64)
	if err != nil {
		return Location{}, errors.New("Error parsing latitude to float")
	}

	parsed_long, err := strconv.ParseFloat(longitude, 64)
	if err != nil {
		return Location{}, errors.New("Error parsing longitude to float")
	}

	return Location{Label: label, Lat: &parsed_lat, Lng: &parsed_long}, nil
}

func distanceKM(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// Server functions
func (server *Server) parse_safewalker(req *http.Request) (Safewalker, error) {
	// Get info from JSON sent by frontend 
	name := req.URL.Query().Get("name")
	session_id := req.URL.Query().Get("sid")
	sw_listening_addr := req.URL.Query().Get("listening_addr")
	sw_curr_location, err := server.parse_location(req.URL.Query().Get("label"), req.URL.Query().Get("lat"), req.URL.Query().Get("long")) 
	if err != nil {
		return Safewalker{}, errors.New(err.Error())
	}
	new_safewalker := Safewalker{Name: name, Session_ID: session_id, Listening_Addr: sw_listening_addr, Latest_Location: sw_curr_location, available: true}
	return new_safewalker, nil
}

// HELPERS MAP FUNCTION 
func (server *Server) set_safewalker(new_safewalker Safewalker) error {
	server.SafewalkersInfo.mu.Lock()
	defer server.SafewalkersInfo.mu.Unlock()
	server.SafewalkersInfo.m[new_safewalker.Session_ID] = new_safewalker
	return nil
}

func (server *Server) remove_safewalker(session_id string) error {
	server.SafewalkersInfo.mu.Lock()
	defer server.SafewalkersInfo.mu.Unlock()
	delete(server.SafewalkersInfo.m, session_id)
	return nil
}

func (server *Server) register_safewalker(w http.ResponseWriter, req *http.Request) {
	new_safewalker, err := server.parse_safewalker(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
	}
	// add new safewalker to map
	if server.set_safewalker(new_safewalker) != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
	fmt.Println("== new safewalker in! ", server.SafewalkersInfo.m)
	w.WriteHeader(http.StatusOK)
}

func (server *Server) deregister_safewalker(w http.ResponseWriter, req *http.Request) {
	session_id := req.URL.Query().Get("sid")
	server.remove_safewalker(session_id)
	w.WriteHeader(http.StatusOK)
	fmt.Println("== safewalker out! ", server.SafewalkersInfo.m)
}

// func (server *Server) poll_safewalker_locations() error {
// 	for _, safewalker := range server.SafewalkersInfo.m {
// 		server.poll_safewalker_location(safewalker.Session_ID)
// 	}
// 	return nil
// }
 

// func (server *Server) poll_safewalker_location(key string) error {
// 	// LOCK MAP UPON USAGE
// 	safewalker := server.SafewalkersInfo.m[key]
// 		poll_url := "http://" + safewalker.Listening_Addr + "/get-location"
// 		// fmt.Println("polling url: ", poll_url)
// 		// Make request
// 		res, err := http.Get(poll_url)
// 		// fmt.Println("res: ", res, err)
// 		if err != nil {
// 			return errors.New(err.Error())
// 		}
// 		defer res.Body.Close() 
// 		// Read out content
// 		if res.StatusCode == http.StatusOK {
// 			body, err := io.ReadAll(res.Body)
// 			fmt.Println("BODY: ", body)
// 			if err != nil {
// 				return errors.New(err.Error())
// 			} else {
// 				// Convert the byte slice to a string if needed
// 				var new_location Location
// 				err = json.Unmarshal(body, &new_location)
// 				if err != nil {
// 					return errors.New(err.Error())
// 				}
// 				fmt.Println("NEW LOCATION: ", new_location)
// 				fmt.Println("safewalker ", safewalker)

// 				// Update location
// 				safewalker.Latest_Location = new_location
// 				server.SafewalkersInfo.m[key] = safewalker
// 			}
// 		} else {
// 			// error_str := "Response code not ok " + strconv.Itoa(res.StatusCode)
// 			return errors.New("")
// 		}
// 		return nil
// }

// func (server *Server) send_safewalker_assignment(safewalker *Safewalker, student_location Location, student_destination Location) error {
// 	url := &url.URL{
// 		Scheme: "http",
// 		Host:   safewalker.Listening_Addr,
// 		Path:   "/match",
// 	}
// 	query := url.Query()
// 	query.Set("pickup_lat", strconv.FormatFloat(*student_location.Lat, 'f', -1, 64))
// 	query.Set("pickup_lng", strconv.FormatFloat(*student_location.Lng, 'f', -1, 64))
// 	query.Set("dest_lat", strconv.FormatFloat(*student_destination.Lat, 'f', -1, 64))
// 	query.Set("dest_lng", strconv.FormatFloat(*student_destination.Lng, 'f', -1, 64))
// 	url.RawQuery = query.Encode() 

// 	response, err := http.Get(url.String())
// 	if err != nil {
// 		return errors.New(err.Error())
// 	}
// 	defer response.Body.Close()

// 	// Check if the request was successful (status code 200 OK)
// 	if response.StatusCode != http.StatusOK {
// 		return errors.New("")
// 	}

// 	return nil
// }

func (server *Server) request_safewalk(w http.ResponseWriter, req *http.Request) {
	server.SafewalkersInfo.mu.Lock()
	defer server.SafewalkersInfo.mu.Unlock()

    var body StudentRequestSafeWalk
	pickup_location, err := server.parse_location(req.URL.Query().Get("plabel"), req.URL.Query().Get("plat"), req.URL.Query().Get("plng")) 
	if err != nil {
		http.Error(w, "Pickup location missing coordinates", http.StatusBadRequest)
		return
	}

	destination_location, err := server.parse_location(req.URL.Query().Get("dlabel"), req.URL.Query().Get("dlat"), req.URL.Query().Get("dlng")) 
	if err != nil {
		http.Error(w, "Destination location missing coordinates", http.StatusBadRequest)
		return
	}

	body.Destination = destination_location
	body.Pickup = pickup_location

	// Find best safewalker
	var best_safewalker *Safewalker
	minDist := math.MaxFloat64

	for _, sw := range server.SafewalkersInfo.m {
		if sw.available {
			d := distanceKM(
				*body.Pickup.Lat,
				*body.Pickup.Lng,
				*sw.Latest_Location.Lat,
				*sw.Latest_Location.Lng,
			)

			if d < minDist {
				minDist = d
				tmp := sw        
				best_safewalker = &tmp
			}
		}
	}


	// Finish matching
	if best_safewalker == nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "No safewalkers available",
		})
	} else {
		// server.send_safewalker_assignment(best_safewalker, body.Pickup, body.Destination)
		best_safewalker.Student_latest_location = pickup_location
		best_safewalker.Student_destination_location = destination_location

		// Send back to student their safewalker's assignment. 
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     true,
			"safewalker":  best_safewalker.Session_ID,
			"distance_km": minDist,
		});
		best_safewalker.available = false
		server.SafewalkersInfo.m[best_safewalker.Session_ID] = *best_safewalker
		// begin thread for safewalk session 
		
	}
}

func (server *Server) finish_request(w http.ResponseWriter, req *http.Request) {
	// Get info from JSON sent by frontend 
	server.SafewalkersInfo.mu.Lock()
	defer server.SafewalkersInfo.mu.Unlock()
	
	session_id := req.URL.Query().Get("sid")
	var safewalker Safewalker
	safewalker, ok := server.SafewalkersInfo.m[session_id]
	if ok {
		safewalker.available = true
		server.SafewalkersInfo.m[session_id] = safewalker
	}
}

func (server *Server) status_update(w http.ResponseWriter, req *http.Request) {
	server.SafewalkersInfo.mu.Lock()
	defer server.SafewalkersInfo.mu.Unlock()

	session_id := req.URL.Query().Get("sid")
	is_student := req.URL.Query().Get("isStudent")
	status := req.URL.Query().Get("isActiveRequest")
	if (status == "true" || status == "True") {
		curr_location, err := server.parse_location(req.URL.Query().Get("label"), req.URL.Query().Get("lat"), req.URL.Query().Get("lng")) 
		if err != nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success":     false,
			});
		}
		safewalker, ok := server.SafewalkersInfo.m[session_id]
		if ok {
			if (is_student == "true" || is_student == "True") {
				safewalker.Student_latest_location = curr_location
				server.SafewalkersInfo.m[session_id] = safewalker
				if (safewalker.Student_latest_location == Location{}) {
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success":     true,
						"safewalker_status": false, 
					})
				} else {
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success":     true,
						"safewalker_status": true, 
					})
				}
			} else {
				safewalker.Latest_Location = curr_location
				server.SafewalkersInfo.m[session_id] = safewalker
				if (safewalker.Student_latest_location == Location{}) {
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success":     true,
						"student_status": false, 
					})
				} else {
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success":     true,
						"student_status": true, 
					})
				}
			}
		}
	} else {
		safewalker, ok := server.SafewalkersInfo.m[session_id]
		if ok {
			safewalker.Student_latest_location = Location{}
			safewalker.Student_destination_location = Location{}
			server.SafewalkersInfo.m[session_id] = safewalker
			if (is_student == "true" || is_student == "True") {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success":     true,
					"safewalker_status": false, 
				})
			} else {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success":     true,
					"student_status": false, 
				})
			}
		}
	}
}

func main() {
	server := &Server {
		&SafewalkersInfo{m: make(map[string]Safewalker)}, // maps session to safewalker
	}
	
    http.HandleFunc("/hello", hello)
	http.HandleFunc("/register-safewalker", server.register_safewalker)
	http.HandleFunc("/deregister-safewalker", server.deregister_safewalker)
    http.HandleFunc("/request-safewalk", server.request_safewalk)
	http.HandleFunc("/finish-request", server.finish_request) // from safewalker
	http.HandleFunc("/status-update", server.status_update) // from safewalker
	
    http.ListenAndServe(":8090", nil)
}