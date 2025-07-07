package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5001" // Use different port to avoid conflict
	}

	// Simple HTTP server to test Go installation
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "HubPay Go Backend is running!\n")
		fmt.Fprintf(w, "Time: %v\n", os.Getenv("DATABASE_URL"))
	})

	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status": "healthy", "backend": "go", "version": "1.0.0"}`)
	})

	log.Printf("Go backend starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}