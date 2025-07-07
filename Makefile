# Go Backend for HubPay Commission System

.PHONY: build run test clean deps migrate

# Build the Go binary
build:
	go build -o bin/hubpay cmd/server/main.go

# Run the development server
run:
	go run cmd/server/main.go

# Run with auto-reload using air (install with: go install github.com/cosmtrek/air@latest)
dev:
	air

# Install dependencies
deps:
	go mod download
	go mod tidy

# Run tests
test:
	go test ./...

# Run tests with coverage
test-cover:
	go test -cover ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Database operations
migrate:
	go run cmd/server/main.go -migrate

# Format code
fmt:
	go fmt ./...

# Lint code (requires golangci-lint)
lint:
	golangci-lint run

# Build for production
build-prod:
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/hubpay cmd/server/main.go

# Generate Go modules graph
deps-graph:
	go mod graph

# Security audit
audit:
	go list -json -deps ./... | nancy sleuth

# Install development tools
install-tools:
	go install github.com/cosmtrek/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest