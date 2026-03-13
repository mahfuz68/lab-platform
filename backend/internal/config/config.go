package config

import (
	"os"
)

type Config struct {
	DatabaseURL          string
	KubeconfigPath       string
	ValidationScriptPath string
	JWTSecret            string
	Port                 string
}

func Load() *Config {
	return &Config{
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/kodekloud?sslmode=disable"),
		KubeconfigPath:       getEnv("KUBECONFIG", ""),
		ValidationScriptPath: getEnv("VALIDATION_SCRIPT_PATH", "./scripts/validate.sh"),
		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		Port:                 getEnv("PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
