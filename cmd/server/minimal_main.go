package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

type HealthResponse struct {
	Status    string    `json:"status"`
	Backend   string    `json:"backend"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
}

type UserResponse struct {
	ID    int    `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	if r.Method == "OPTIONS" {
		return
	}

	response := HealthResponse{
		Status:    "healthy",
		Backend:   "go",
		Version:   "1.0.0",
		Timestamp: time.Now(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func userHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	if r.Method == "OPTIONS" {
		return
	}

	// Mock user data for testing
	user := UserResponse{
		ID:    5,
		Email: "charlieifrah+admin@gmail.com",
		Name:  "Charlie Ifrah",
		Role:  "admin",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func contractsHandler(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	if r.Method == "OPTIONS" {
		return
	}

	contracts := []map[string]interface{}{
		{
			"id":         21,
			"clientName": "Acme Corp",
			"aeId":       6,
			"contractValue": "12000000",
			"acv":        "3000000",
			"contractType": "new",
		},
		{
			"id":         22,
			"clientName": "Samsung",
			"aeId":       6,
			"contractValue": "12000000",
			"acv":        "3000000",
			"contractType": "new",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(contracts)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5001" // Use different port to avoid conflict with Node.js
	}

	http.HandleFunc("/api/health", healthHandler)
	http.HandleFunc("/api/user", userHandler)
	http.HandleFunc("/api/contracts", contractsHandler)
	
	// Root handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		fmt.Fprintf(w, `{"message":"HubPay Go Backend API","version":"1.0.0","endpoints":["/api/health","/api/user","/api/contracts"]}`)
	})

	log.Printf("Minimal Go backend starting on port %s", port)
	log.Printf("Available endpoints:")
	log.Printf("  - http://localhost:%s/api/health", port)
	log.Printf("  - http://localhost:%s/api/user", port)
	log.Printf("  - http://localhost:%s/api/contracts", port)
	
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}