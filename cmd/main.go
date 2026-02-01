package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/rand/v2"
	"net/http"
	"strconv"
)

func hello(w http.ResponseWriter, req *http.Request) {
    fmt.Fprintf(w, "hello\n")
}

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
	sw_curr_location, err := server.parse_location(req.URL.Query().Get("label"), req.URL.Query().Get("lat"), req.URL.Query().Get("long")) 
	if err != nil {
		return Safewalker{}, errors.New(err.Error())
	}
	new_safewalker := Safewalker{Name: name, Session_ID: session_id, Latest_Location: sw_curr_location, available: true, Student_latest_location: Location{}, Student_destination_location: Location{}}
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

func (server *Server) generate_random_code() int {
	min := 1000
    max := 10000 // Upper bound is exclusive in rand.IntN
    randomNumber := rand.IntN(max - min) + min
	return randomNumber
}

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
		best_safewalker.Student_latest_location = pickup_location
		best_safewalker.Student_destination_location = destination_location
		random_code := server.generate_random_code()
		fmt.Println("!!!!!!safewalker matched location ", best_safewalker.Latest_Location) 

		// Send back to student their safewalker's assignment. 
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     true,
			"safewalker":  best_safewalker.Session_ID,
			"distance_km": minDist,
			"match_code": random_code,
			"safewalker_lat": best_safewalker.Latest_Location.Lat, 
			"safewalker_lng": best_safewalker.Latest_Location.Lng, 
			"safewalker_label": best_safewalker.Latest_Location.Label, 
		});
		best_safewalker.available = false
		best_safewalker.random_code = random_code
		server.SafewalkersInfo.m[best_safewalker.Session_ID] = *best_safewalker
		fmt.Printf("DEBUG: Assigning student to %s. MatchCode: %d\n", best_safewalker.Session_ID, random_code)
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
		safewalker = server.remove_student(safewalker)
		server.SafewalkersInfo.m[session_id] = safewalker
	}
}

func (server *Server) checkcode(w http.ResponseWriter, req *http.Request) {
	server.SafewalkersInfo.mu.Lock()
	defer server.SafewalkersInfo.mu.Unlock()
	
	session_id := req.URL.Query().Get("sid")
	code, err := strconv.Atoi(req.URL.Query().Get("code"))
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     false,
		});
	} else {
		var safewalker Safewalker
		safewalker, ok := server.SafewalkersInfo.m[session_id]
		if ok {
			if code != safewalker.random_code {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success":     false,
			});
			}
			safewalker.code_matched = true
			server.SafewalkersInfo.m[session_id] = safewalker
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success":     true,
			});
			return 
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"success":     false,
		});
	}
}

func (server *Server) remove_student(safewalker Safewalker) Safewalker {
	safewalker.Student_latest_location = Location{}
	safewalker.Student_destination_location = Location{}
	safewalker.code_matched = false
	safewalker.random_code = 0
	safewalker.available = true
	return safewalker
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
				fmt.Println("polling: ", is_student)
				fmt.Printf("DEBUG: StatusUpdate for %s. isAssigned: %v. StudentLoc: %+v, safewalker location %+v, is student: %v\n", session_id, status, safewalker.Student_latest_location, safewalker.Latest_Location, is_student)
				safewalker.Student_latest_location = curr_location
				server.SafewalkersInfo.m[session_id] = safewalker
				if (safewalker.Student_latest_location == Location{} || safewalker.code_matched == false) {
					swLat := 0.0
					swLng := 0.0
					if safewalker.Latest_Location.Lat != nil {
						swLat = *safewalker.Latest_Location.Lat
						swLng = *safewalker.Latest_Location.Lng
					}
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success":     true,
						"matching_status": false,
						"safewalker_lat":   swLat,
						"safewalker_lng":   swLng, 
						"match_code":       safewalker.random_code,
					})
				} else {
					// Return Safewalker Location and Code to Student
					swLat := 0.0
					swLng := 0.0
					if safewalker.Latest_Location.Lat != nil {
						swLat = *safewalker.Latest_Location.Lat
						swLng = *safewalker.Latest_Location.Lng
					}
					
					json.NewEncoder(w).Encode(map[string]interface{}{
						"success":          true,
						"matching_status":  true,
						"safewalker_lat":   swLat,
						"safewalker_lng":   swLng,
						"match_code":       safewalker.random_code,
					})
				}
			} else {
				safewalker.Latest_Location = curr_location
				server.SafewalkersInfo.m[session_id] = safewalker
				
				isAssigned := safewalker.Student_latest_location != Location{}
				fmt.Printf("DEBUG: StatusUpdate for %s. isAssigned: %v. StudentLoc: %+v, safewalker LOC: %+v, is student: %v\n", session_id, isAssigned, safewalker.Student_latest_location, safewalker.Latest_Location, is_student)
				studentLat := 0.0
				studentLng := 0.0
				studentLabel := ""

				if isAssigned && safewalker.Student_latest_location.Lat != nil {
					studentLat = *safewalker.Student_latest_location.Lat
					studentLng = *safewalker.Student_latest_location.Lng
					studentLabel = safewalker.Student_latest_location.Label
				}

				json.NewEncoder(w).Encode(map[string]interface{}{
					"success":         true,
					"matching_status": safewalker.code_matched,
					"is_assigned":     isAssigned,
					"student_lat":     studentLat,
					"student_lng":     studentLng,
					"student_label":   studentLabel,
				})
			}
		}
	} else {
		safewalker, ok := server.SafewalkersInfo.m[session_id]
		if ok {
			safewalker = server.remove_student(safewalker)
			server.SafewalkersInfo.m[session_id] = safewalker
			if (is_student == "true" || is_student == "True") {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success": true,
					"matching_status": false,
					"cancel": true,
				})
			} else {
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success":     true,
					"matching_status": false,
					"cancel": true,
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
	http.HandleFunc("/checkcode", server.checkcode) 
    http.ListenAndServe(":8090", nil)
}