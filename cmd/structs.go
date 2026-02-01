package main

import "sync"

type Safewalker struct {
	Name string 
	Session_ID string 
	Latest_Location Location 
	available bool
	Student_latest_location Location
	Student_destination_location Location 
	random_code int
	code_matched bool
}

type Location struct {
    Label string `json:label`
    Lat *float64 `json:lat`
    Lng *float64 `json:lng`
}

type StudentRequestSafeWalk struct {
    Pickup Location `json:pickup`
    Destination Location `json:destination`
}

type SafewalkersInfo struct {
	mu sync.RWMutex
	m map[string]Safewalker
}

type Server struct {
	SafewalkersInfo *SafewalkersInfo
}

type Node struct {
	ID  int64
	Lat float64
	Lng float64
}

type Graph struct {
	mu    sync.RWMutex
	nodes map[int64]Node        
	adj   map[int64][]int64   
}

type overpassResp struct {
	Elements []struct {
		Type  string  `json:"type"`
		ID    int64   `json:"id"`
		Lat   float64 `json:"lat,omitempty"`
		Lon   float64 `json:"lon,omitempty"`
		Nodes []int64 `json:"nodes,omitempty"`
		Tags  map[string]string `json:"tags,omitempty"`
	} `json:"elements"`
}