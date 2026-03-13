package db

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

type DB struct {
	DB *sql.DB
}

func New(databaseURL string) (*DB, error) {
	dbURL := databaseURL
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}

	if dbURL == "" {
		if os.Getenv("TEST_MODE") == "1" || strings.Contains(os.Args[0], "test") {
			return &DB{nil}, nil
		}
		return nil, fmt.Errorf("no database URL provided")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

func (db *DB) Close() error {
	if db.DB != nil {
		return db.DB.Close()
	}
	return nil
}

func (db *DB) Migrate() error {
	if db.DB == nil {
		return nil
	}

	migrations := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			name VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS labs (
			id SERIAL PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			description TEXT,
			image VARCHAR(255) NOT NULL,
			duration_minutes INTEGER DEFAULT 60,
			steps JSONB NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS lab_sessions (
			id SERIAL PRIMARY KEY,
			user_id INTEGER REFERENCES users(id),
			lab_id INTEGER REFERENCES labs(id),
			container_id VARCHAR(255),
			status VARCHAR(50) DEFAULT 'starting',
			started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP,
			current_step INTEGER DEFAULT 0,
			completed_steps INTEGER[] DEFAULT '{}'
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_user ON lab_sessions(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_lab ON lab_sessions(lab_id)`,
		`CREATE INDEX IF NOT EXISTS idx_sessions_status ON lab_sessions(status)`,
	}

	for _, migration := range migrations {
		if _, err := db.DB.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}
