#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== KodeKloud Lab Platform - Backend Setup ===${NC}"

# Check Go installation
if ! command -v go &> /dev/null; then
    echo -e "${RED}Go is not installed. Please install Go 1.21+${NC}"
    exit 1
fi

echo -e "${YELLOW}Downloading Go dependencies...${NC}"
cd backend
go mod download

echo -e "${YELLOW}Building Go server...${NC}"
go build -o server ./cmd/server

if [ -f "server" ]; then
    echo -e "${GREEN}Backend built successfully!${NC}"
    echo -e "Run with: ./backend/server"
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
