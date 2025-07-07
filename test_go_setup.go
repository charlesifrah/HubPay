package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, `{"status":"Go backend working","version":"1.0"}`)
	})
	
	log.Println("Test Go server starting on :5001")
	log.Fatal(http.ListenAndServe(":5001", nil))
}