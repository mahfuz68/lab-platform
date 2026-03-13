package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/mehedih11/kodekloud-lab/backend/internal/config"
	"github.com/mehedih11/kodekloud-lab/backend/internal/db"
	"github.com/mehedih11/kodekloud-lab/backend/internal/k8s"
	"github.com/mehedih11/kodekloud-lab/backend/internal/lab"
	"github.com/mehedih11/kodekloud-lab/backend/internal/validator"
	"github.com/mehedih11/kodekloud-lab/backend/internal/websocket"
)

func main() {
	cfg := config.Load()

	var database *db.DB
	var err error

	if os.Getenv("TEST_MODE") == "1" {
		database = &db.DB{nil}
	} else {
		database, err = db.New(cfg.DatabaseURL)
		if err != nil {
			log.Fatalf("Failed to connect to database: %v", err)
		}
		defer database.Close()

		if err := database.Migrate(); err != nil {
			log.Fatalf("Failed to run migrations: %v", err)
		}
	}

	var k8sClient *k8s.Client
	if os.Getenv("TEST_MODE") == "1" {
		k8sClient = nil
	} else {
		k8sClient, err = k8s.New(cfg.KubeconfigPath)
		if err != nil {
			log.Printf("Warning: Kubernetes client not available: %v", err)
			k8sClient = nil
		}
	}

	labService := lab.NewService(database, k8sClient)

	var validatorService *validator.Service
	if os.Getenv("TEST_MODE") == "1" {
		validatorService = nil
	} else {
		validatorService = validator.New(cfg.ValidationScriptPath)
	}

	wsHub := websocket.NewHub(labService)

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000", "http://127.0.0.1:8080"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := router.Group("/api/v1")
	{
		labs := api.Group("/labs")
		{
			labs.GET("", labService.ListLabs)
			labs.GET("/:id", labService.GetLab)
			labs.POST("", labService.CreateLab)
			labs.PUT("/:id", labService.UpdateLab)
			labs.DELETE("/:id", labService.DeleteLab)
		}

		sessions := api.Group("/sessions")
		{
			sessions.POST("/start", labService.StartSession)
			sessions.POST("/:id/end", labService.EndSession)
			sessions.GET("/:id", labService.GetSession)
			sessions.GET("/:id/validate", labService.ValidateStep)
		}

		api.GET("/terminal/:session_id", wsHub.HandleWebSocket)

		if os.Getenv("TEST_MODE") != "1" {
			api.POST("/validate", func(c *gin.Context) {
				if validatorService != nil {
					validatorService.Validate(c)
				} else {
					c.JSON(500, gin.H{"error": "validator not available"})
				}
			})
		} else {
			api.POST("/validate", func(c *gin.Context) {
				c.JSON(200, gin.H{
					"passed": true,
					"output": "Validation mock in test mode",
				})
			})
		}
	}

	// Load labs from the labs directory only when not in test mode
	if os.Getenv("TEST_MODE") != "1" {
		execDir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
		projectRoot := filepath.Join(execDir, "..")
		labsPath := filepath.Join(projectRoot, "labs")

		if err := labService.LoadLabsFromDirectory(labsPath); err != nil {
			log.Printf("Warning: Failed to load labs from directory: %v", err)
		} else {
			log.Println("Labs loaded successfully from", labsPath)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
