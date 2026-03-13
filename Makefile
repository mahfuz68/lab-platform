# Makefile for KodeKloud Lab Platform

# Defaults
.PHONY: help build test clean install run dev

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

# Directories
BACKEND_DIR := backend
FRONTEND_DIR := frontend

# Help target
help:
	@echo "KodeKloud Lab Platform - Makefile Commands"
	@echo ""
	@echo "Backend Commands:"
	@echo "  make backend-deps      - Download Go dependencies"
	@echo "  make backend-build      - Build Go server"
	@echo "  make backend-run        - Run Go server"
	@echo "  make backend-test      - Run Go tests"
	@echo "  make backend-lint      - Lint Go code"
	@echo "  make backend-fmt       - Format Go code"
	@echo ""
	@echo "Frontend Commands:"
	@echo "  make frontend-deps     - Install npm dependencies"
	@echo "  make frontend-build    - Build Next.js app"
	@echo "  make frontend-dev      - Run Next.js dev server"
	@echo "  make frontend-lint     - Lint Next.js code"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make docker-build      - Build all lab images"
	@echo "  make docker-push       - Push lab images to registry"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make install          - Install all dependencies (backend + frontend)"
	@echo "  make build            - Build everything"
	@echo "  make test             - Run all tests"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make all              - Full setup: install + build"

# Backend commands
backend-deps:
	@cd $(BACKEND_DIR) && go mod download
	@echo "$(GREEN)Backend dependencies downloaded$(NC)"

backend-build:
	@cd $(BACKEND_DIR) && go build -o server ./cmd/server
	@echo "$(GREEN)Backend built successfully$(NC)"

backend-run: backend-build
	@cd $(BACKEND_DIR) && ./server

backend-test:
	@cd $(BACKEND_DIR) && go test -v ./...

backend-lint:
	@cd $(BACKEND_DIR) && golangci-lint run || go vet ./...

backend-fmt:
	@cd $(BACKEND_DIR) && go fmt ./...
	@echo "$(GREEN)Backend code formatted$(NC)"

# Frontend commands
frontend-deps:
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)Frontend dependencies installed$(NC)"

frontend-build:
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)Frontend built successfully$(NC)"

frontend-dev:
	@cd $(FRONTEND_DIR) && npm run dev

frontend-lint:
	@cd $(FRONTEND_DIR) && npm run lint

# Docker commands
docker-build:
	@echo "$(YELLOW)Building lab images...$(NC)"
	@cd lab-images && \
		docker build -f Dockerfile.base -t kodekloud-lab:base . && \
		docker build -f Dockerfile.docker -t kodekloud-lab:docker . && \
		docker build -f Dockerfile.kubernetes -t kodekloud-lab:kubernetes . && \
		docker build -f Dockerfile.ansible -t kodekloud-lab:ansible .
	@echo "$(GREEN)All lab images built$(NC)"

docker-push:
	@echo "$(YELLOW)Pushing lab images to registry...$(NC)"
	@echo "Configure your registry before pushing"
	@# Uncomment and configure for your registry:
	@# docker push your-registry/kodekloud-lab:base
	@# docker push your-registry/kodekloud-lab:docker
	@# docker push your-registry/kodekloud-lab:kubernetes
	@# docker push your-registry/kodekloud-lab:ansible

# Utility commands
install: backend-deps frontend-deps
	@echo "$(GREEN)All dependencies installed$(NC)"

build: backend-build frontend-build
	@echo "$(GREEN)All builds completed$(NC)"

test: backend-test
	@echo "$(GREEN)Tests completed$(NC)"

clean:
	@cd $(BACKEND_DIR) && rm -f server
	@cd $(FRONTEND_DIR) && rm -rf .next node_modules
	@docker rmi kodekloud-lab:base kodekloud-lab:docker kodekloud-lab:kubernetes kodekloud-lab:ansible 2>/dev/null || true
	@echo "$(GREEN)Cleaned build artifacts$(NC)"

all: install build

# Development shortcuts
dev-backend: backend-deps backend-run

dev-frontend: frontend-deps frontend-dev
