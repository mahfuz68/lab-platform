package validator

import (
	"os"
	"os/exec"
	"strings"

	"github.com/gin-gonic/gin"
)

type Service struct {
	scriptPath string
}

func New(scriptPath string) *Service {
	return &Service{
		scriptPath: scriptPath,
	}
}

type ValidationRequest struct {
	ContainerID string `json:"container_id"`
	Command     string `json:"command"`
	Validation  string `json:"validation"`
}

type ValidationResponse struct {
	Passed bool   `json:"passed"`
	Output string `json:"output,omitempty"`
	Error  string `json:"error,omitempty"`
}

func (s *Service) Validate(c *gin.Context) {
	var req ValidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.Validation == "" {
		c.JSON(400, gin.H{"error": "validation command is required"})
		return
	}

	cmd := exec.Command("sh", "-c", req.Validation)
	output, err := cmd.CombinedOutput()

	if err != nil {
		c.JSON(200, ValidationResponse{
			Passed: false,
			Output: string(output),
			Error:  err.Error(),
		})
		return
	}

	c.JSON(200, ValidationResponse{
		Passed: strings.TrimSpace(string(output)) != "",
		Output: string(output),
	})
}

func ValidateCommand(validationCmd string) (bool, string, error) {
	cmd := exec.Command("sh", "-c", validationCmd)
	output, err := cmd.CombinedOutput()

	if err != nil {
		return false, string(output), err
	}

	return strings.TrimSpace(string(output)) != "", string(output), nil
}

func FileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func CommandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}
