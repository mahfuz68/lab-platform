#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     KodeKloud Lab Platform - Full Setup Script          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed. Please install $1${NC}"
        exit 1
    fi
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
check_command go
check_command node
check_command npm
check_command docker

echo -e "${GREEN}All prerequisites satisfied!${NC}"
echo ""

# Backend setup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}1/4 Setting up Backend (Go)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd backend
echo -e "${YELLOW}Downloading Go dependencies...${NC}"
go mod download

echo -e "${YELLOW}Building Go server...${NC}"
go build -o server ./cmd/server

if [ -f "server" ]; then
    echo -e "${GREEN}Backend built successfully!${NC}"
else
    echo -e "${RED}Backend build failed!${NC}"
    exit 1
fi
echo ""

# Frontend setup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}2/4 Setting up Frontend (Next.js)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd ../frontend
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm install

echo -e "${YELLOW}Building Next.js application...${NC}"
npm run build

if [ -d ".next" ]; then
    echo -e "${GREEN}Frontend built successfully!${NC}"
else
    echo -e "${RED}Frontend build failed!${NC}"
    exit 1
fi
echo ""

# Docker setup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}3/4 Building Docker images...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd ../lab-images

LABELS=("base" "docker" "kubernetes" "ansible")
DOCKERFILES=("Dockerfile.base" "Dockerfile.docker" "Dockerfile.kubernetes" "Dockerfile.ansible")

for i in "${!LABELS[@]}"; do
    LABEL="${LABELS[$i]}"
    DOCKERFILE="${DOCKERFILES[$i]}"
    
    if [ -f "$DOCKERFILE" ]; then
        echo -e "${YELLOW}Building kodekloud-lab:${LABEL}...${NC}"
        
        docker build -f "${DOCKERFILE}" -t "kodekloud-lab:${LABEL}" . || {
            echo -e "${RED}Failed to build ${LABEL}${NC}"
            continue
        }
        echo -e "${GREEN}✓ kodekloud-lab:${LABEL} built${NC}"
    else
        echo -e "${YELLOW}Skipping ${LABEL} - ${DOCKERFILE} not found${NC}"
    fi
done
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}4/4 Setup Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}All components built successfully!${NC}"
echo ""
echo -e "${YELLOW}To run the platform:${NC}"
echo ""
echo -e "  ${BLUE}Backend:${NC}  ./backend/server"
echo -e "  ${BLUE}Frontend:${NC} cd frontend && npm run dev"
echo ""
echo -e "${YELLOW}Or use Makefile:${NC}"
echo "    make run-backend    # Run backend"
echo "    make run-frontend   # Run frontend"
echo ""
echo -e "${GREEN}Enjoy KodeKloud Lab Platform!${NC}"
