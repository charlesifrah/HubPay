package config

import "os"

type Config struct {
	DatabaseURL    string
	SessionSecret  string
	JWTSecret      string
	SendGridAPIKey string
	TabsAPIKey     string
	Port           string
}

func New() *Config {
	return &Config{
		DatabaseURL:    getEnv("DATABASE_URL", ""),
		SessionSecret:  getEnv("SESSION_SECRET", "your-secret-key"),
		JWTSecret:      getEnv("JWT_SECRET", "your-jwt-secret"),
		SendGridAPIKey: getEnv("SENDGRID_API_KEY", ""),
		TabsAPIKey:     getEnv("TABS_API_KEY", ""),
		Port:           getEnv("PORT", "5000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}