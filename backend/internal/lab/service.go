package lab

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mehedih11/kodekloud-lab/backend/internal/db"
	"github.com/mehedih11/kodekloud-lab/backend/internal/k8s"
	"gopkg.in/yaml.v2"
)

type Service struct {
	db      *db.DB
	k8s     *k8s.Client
	podPool map[string]string
}

type Lab struct {
	ID              int             `json:"id"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	Image           string          `json:"image"`
	DurationMinutes int             `json:"duration_minutes"`
	Steps           json.RawMessage `json:"steps"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type LabSession struct {
	ID             int        `json:"id"`
	UserID         int        `json:"user_id"`
	LabID          int        `json:"lab_id"`
	ContainerID    string     `json:"container_id"`
	Status         string     `json:"status"`
	StartedAt      time.Time  `json:"started_at"`
	ExpiresAt      *time.Time `json:"expires_at"`
	CurrentStep    int        `json:"current_step"`
	CompletedSteps []int      `json:"completed_steps"`
}

type LabStep struct {
	Title       string `json:"title"`
	Instruction string `json:"instruction"`
	Validation  string `json:"validation"`
}

type LabYAML struct {
	Lab LabContent `yaml:"lab"`
}

type LabContent struct {
	Title       string    `yaml:"title"`
	Description string    `yaml:"description"`
	Image       string    `yaml:"image"`
	Steps       []LabStep `yaml:"steps"`
	Duration    int       `yaml:"duration_minutes"`
}

func NewService(database *db.DB, k8sClient *k8s.Client) *Service {
	return &Service{
		db:      database,
		k8s:     k8sClient,
		podPool: make(map[string]string),
	}
}

func (s *Service) ListLabs(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(200, []Lab{})
		return
	}

	rows, err := s.db.DB.Query("SELECT id, title, description, image, duration_minutes, created_at, updated_at FROM labs")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var labs []Lab
	for rows.Next() {
		var lab Lab
		if err := rows.Scan(&lab.ID, &lab.Title, &lab.Description, &lab.Image, &lab.DurationMinutes, &lab.CreatedAt, &lab.UpdatedAt); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		labs = append(labs, lab)
	}

	c.JSON(200, labs)
}

func (s *Service) GetLab(c *gin.Context) {
	id := c.Param("id")
	if s.db == nil || s.db.DB == nil {
		c.JSON(200, Lab{
			ID:              1,
			Title:           "Sample Lab",
			Description:     "A sample lab for testing",
			Image:           "kodekloud-lab:base",
			DurationMinutes: 30,
			Steps:           []byte("[]"),
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		})
		return
	}

	var lab Lab
	var steps []byte

	err := s.db.DB.QueryRow(
		"SELECT id, title, description, image, duration_minutes, steps, created_at, updated_at FROM labs WHERE id = $1",
		id,
	).Scan(&lab.ID, &lab.Title, &lab.Description, &lab.Image, &lab.DurationMinutes, &steps, &lab.CreatedAt, &lab.UpdatedAt)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "lab not found"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	lab.Steps = steps
	c.JSON(200, lab)
}

func (s *Service) CreateLab(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(500, gin.H{"error": "database not available in test mode"})
		return
	}

	var lab Lab
	if err := c.ShouldBindJSON(&lab); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	var stepsJSON []byte
	if lab.Steps != nil {
		stepsJSON = lab.Steps
	} else {
		stepsJSON = []byte("[]")
	}

	var labID int
	err := s.db.DB.QueryRow(
		"INSERT INTO labs (title, description, image, duration_minutes, steps) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		lab.Title, lab.Description, lab.Image, lab.DurationMinutes, stepsJSON,
	).Scan(&labID)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	lab.ID = labID
	c.JSON(201, lab)
}

func (s *Service) UpdateLab(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(500, gin.H{"error": "database not available in test mode"})
		return
	}

	id := c.Param("id")
	var lab Lab
	if err := c.ShouldBindJSON(&lab); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	_, err := s.db.DB.Exec(
		"UPDATE labs SET title=$1, description=$2, image=$3, duration_minutes=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5",
		lab.Title, lab.Description, lab.Image, lab.DurationMinutes, id,
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "lab updated"})
}

func (s *Service) DeleteLab(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(500, gin.H{"error": "database not available in test mode"})
		return
	}

	id := c.Param("id")
	_, err := s.db.DB.Exec("DELETE FROM labs WHERE id = $1", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "lab deleted"})
}

func (s *Service) StartSession(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(500, gin.H{"error": "database not available in test mode"})
		return
	}

	var req struct {
		LabID  int `json:"lab_id"`
		UserID int `json:"user_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	var lab Lab
	err := s.db.DB.QueryRow("SELECT id, image, duration_minutes FROM labs WHERE id = $1", req.LabID).Scan(&lab.ID, &lab.Image, &lab.DurationMinutes)
	if err != nil {
		c.JSON(404, gin.H{"error": "lab not found"})
		return
	}

	podName := fmt.Sprintf("lab-%d-%d", req.LabID, time.Now().Unix())
	if s.k8s != nil {
		if err := s.k8s.CreatePod(podName, lab.Image); err != nil {
			c.JSON(500, gin.H{"error": fmt.Sprintf("failed to create pod: %v", err)})
			return
		}
	}

	expiresAt := time.Now().Add(time.Duration(lab.DurationMinutes) * time.Minute)
	var sessionID int

	err = s.db.DB.QueryRow(
		`INSERT INTO lab_sessions (user_id, lab_id, container_id, status, expires_at) 
		 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		req.UserID, req.LabID, podName, "running", expiresAt,
	).Scan(&sessionID)

	if err != nil {
		if s.k8s != nil {
			s.k8s.DeletePod(podName)
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if s.k8s != nil {
		s.podPool[podName] = lab.Image
	}

	c.JSON(201, gin.H{
		"session_id":   sessionID,
		"container_id": podName,
		"expires_at":   expiresAt,
	})
}

func (s *Service) EndSession(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(500, gin.H{"error": "database not available in test mode"})
		return
	}

	id := c.Param("id")

	var containerID string
	err := s.db.DB.QueryRow("SELECT container_id FROM lab_sessions WHERE id = $1", id).Scan(&containerID)
	if err != nil {
		c.JSON(404, gin.H{"error": "session not found"})
		return
	}

	if s.k8s != nil {
		s.k8s.DeletePod(containerID)
	}
	delete(s.podPool, containerID)

	_, err = s.db.DB.Exec("UPDATE lab_sessions SET status='ended' WHERE id=$1", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "session ended"})
}

func (s *Service) GetSession(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(500, gin.H{"error": "database not available in test mode"})
		return
	}

	id := c.Param("id")
	var session LabSession

	err := s.db.DB.QueryRow(
		"SELECT id, user_id, lab_id, container_id, status, started_at, expires_at, current_step FROM lab_sessions WHERE id = $1",
		id,
	).Scan(&session.ID, &session.UserID, &session.LabID, &session.ContainerID, &session.Status, &session.StartedAt, &session.ExpiresAt, &session.CurrentStep)

	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "session not found"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, session)
}

func (s *Service) ValidateStep(c *gin.Context) {
	if s.db == nil || s.db.DB == nil {
		c.JSON(500, gin.H{"error": "database not available in test mode"})
		return
	}

	sessionID := c.Param("id")
	var stepNum = c.Query("step")

	var containerID string
	err := s.db.DB.QueryRow("SELECT container_id FROM lab_sessions WHERE id = $1", sessionID).Scan(&containerID)
	if err != nil {
		c.JSON(404, gin.H{"error": "session not found"})
		return
	}

	var labID int
	s.db.DB.QueryRow("SELECT lab_id FROM lab_sessions WHERE id = $1", sessionID).Scan(&labID)

	var stepsJSON []byte
	s.db.DB.QueryRow("SELECT steps FROM labs WHERE id = $1", labID).Scan(&stepsJSON)

	var steps []LabStep
	json.Unmarshal(stepsJSON, &steps)

	stepIndex := 0
	fmt.Sscanf(stepNum, "%d", &stepIndex)

	if stepIndex >= len(steps) {
		c.JSON(400, gin.H{"error": "invalid step"})
		return
	}

	validationCmd := steps[stepIndex].Validation

	result := ""
	if s.k8s != nil {
		result, err = s.k8s.ExecInPod(containerID, "lab", validationCmd)
		if err != nil {
			c.JSON(200, gin.H{"passed": false, "error": err.Error()})
			return
		}
	}

	c.JSON(200, gin.H{"passed": result != "", "output": result})
}

// CreateLabFromYAML reads a YAML file and creates a lab from it
func (s *Service) CreateLabFromYAML(yamlPath string) error {
	yamlFile, err := ioutil.ReadFile(yamlPath)
	if err != nil {
		return fmt.Errorf("failed to read YAML file: %w", err)
	}

	var labYAML LabYAML
	err = yaml.Unmarshal(yamlFile, &labYAML)
	if err != nil {
		return fmt.Errorf("failed to parse YAML: %w", err)
	}

	labContent := labYAML.Lab
	stepsJSON, err := json.Marshal(labContent.Steps)
	if err != nil {
		return fmt.Errorf("failed to marshal steps to JSON: %w", err)
	}

	if s.db != nil && s.db.DB != nil {
		_, err = s.db.DB.Exec(
			"INSERT INTO labs (title, description, image, duration_minutes, steps) VALUES ($1, $2, $3, $4, $5)",
			labContent.Title, labContent.Description, labContent.Image, labContent.Duration, stepsJSON,
		)
		if err != nil {
			return fmt.Errorf("failed to insert lab into database: %w", err)
		}
	}

	return nil
}

// LoadLabsFromDirectory loads all YAML lab files from a directory
func (s *Service) LoadLabsFromDirectory(dirPath string) error {
	files, err := filepath.Glob(filepath.Join(dirPath, "*.yml"))
	if err != nil {
		return fmt.Errorf("failed to find YAML files: %w", err)
	}

	yamlFiles, err := filepath.Glob(filepath.Join(dirPath, "*.yaml"))
	if err != nil {
		return fmt.Errorf("failed to find YAML files: %w", err)
	}

	allFiles := append(files, yamlFiles...)

	if len(allFiles) == 0 {
		return fmt.Errorf("no YAML files found in %s", dirPath)
	}

	for _, file := range allFiles {
		err := s.CreateLabFromYAML(file)
		if err != nil {
			fmt.Printf("Warning: Failed to load lab from %s: %v\n", file, err)
			continue
		}
		fmt.Printf("Loaded lab from: %s\n", file)
	}

	return nil
}
