package main

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"
)

func (g *Graph) LoadFromOverpass(centerLat, centerLng float64, radiusMeters int) error {
	q := overpassQuery(centerLat, centerLng, radiusMeters)

	client := &http.Client{Timeout: 20 * time.Second}
	req, err := http.NewRequest("POST", "https://overpass-api.de/api/interpreter", strings.NewReader(q))
	if err != nil { return err }
	req.Header.Set("Content-Type", "text/plain")

	resp, err := client.Do(req)
	if err != nil { return err }
	defer resp.Body.Close()

	if resp.StatusCode/100 != 2 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("overpass error %d: %s", resp.StatusCode, string(b))
	}

	var data overpassResp
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return err
	}

	nodes := make(map[int64]Node)
	adj := make(map[int64][]int64)

	for _, el := range data.Elements {
		if el.Type == "node" {
			nodes[el.ID] = Node{ID: el.ID, Lat: el.Lat, Lng: el.Lon}
		}
	}

	for _, el := range data.Elements {
		if el.Type != "way" || len(el.Nodes) < 2 {
			continue
		}

		for i := 0; i < len(el.Nodes)-1; i++ {
			a := el.Nodes[i]
			b := el.Nodes[i+1]
			if _, ok := nodes[a]; !ok { continue }
			if _, ok := nodes[b]; !ok { continue }

			adj[a] = append(adj[a], b)
			adj[b] = append(adj[b], a) 
		}
	}

	g.mu.Lock()
	g.nodes = nodes
	g.adj = adj
	g.mu.Unlock()

	return nil
}

func (g *Graph) NearestNode(lat, lng float64) (int64, bool) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	bestID := int64(0)
	bestDist := math.MaxFloat64

	for id, n := range g.nodes {
		d := distanceKM(lat, lng, n.Lat, n.Lng)
		if d < bestDist {
			bestDist = d
			bestID = id
		}
	}
	return bestID, bestID != 0
}

func (g *Graph) AStar(startID, goalID int64) ([]int64, bool) {
	g.mu.RLock()
	defer g.mu.RUnlock()

	goal, ok := g.nodes[goalID]
	if !ok { return nil, false }

	type item struct {
		id    int64
		f     float64
	}
	open := map[int64]float64{startID: 0}
	cameFrom := map[int64]int64{}
	gScore := map[int64]float64{startID: 0}

	heur := func(a Node) float64 {
		return distanceKM(a.Lat, a.Lng, goal.Lat, goal.Lng)
	}

	for len(open) > 0 {
		var current int64
		curF := math.MaxFloat64
		for id := range open {
			n := g.nodes[id]
			f := gScore[id] + heur(n)
			if f < curF {
				curF = f
				current = id
			}
		}

		if current == goalID {
			path := []int64{current}
			for {
				prev, ok := cameFrom[current]
				if !ok { break }
				current = prev
				path = append(path, current)
			}
			for i, j := 0, len(path)-1; i < j; i, j = i+1, j-1 {
				path[i], path[j] = path[j], path[i]
			}
			return path, true
		}

		delete(open, current)

		for _, nb := range g.adj[current] {
			curNode := g.nodes[current]
			nbNode := g.nodes[nb]
			step := distanceKM(curNode.Lat, curNode.Lng, nbNode.Lat, nbNode.Lng)

			tent := gScore[current] + step
			prev, seen := gScore[nb]
			if !seen || tent < prev {
				cameFrom[nb] = current
				gScore[nb] = tent
				open[nb] = tent + heur(nbNode)
			}
		}
	}

	return nil, false
}
