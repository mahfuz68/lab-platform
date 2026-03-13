#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== KodeKloud Lab Platform - Backend Runner ===${NC}"

cd backend

# Check if server exists
if [ ! -f "server" ]; then
    echo -e "${YELLOW}Server not found. Building first...${NC}"
    go mod download
    go build -o server ./cmd/server
fi

# Set environment variables
export PORT=${PORT:-8080}
export DATABASE_URL=${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/kodekloud?sslmode=disable}
export KUBECONFIG=${KUBECONFIG:-}
export JWT_SECRET=${JWT_SECRET:-your-secret-change-in-production}

echo -e "${GREEN}Starting backend on port $PORT...${NC}"
echo -e "${YELLOW}Database: $DATABASE_URL${NC}"

./server
