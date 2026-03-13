#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== KodeKloud Lab Platform - Frontend Runner ===${NC}"

cd frontend

# Set environment variables
export PORT=${PORT:-3000}
export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8080/api/v1}
export NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-ws://localhost:8080/api/v1}

echo -e "${GREEN}Starting frontend on port $PORT...${NC}"
echo -e "${YELLOW}API URL: $NEXT_PUBLIC_API_URL${NC}"
echo -e "${YELLOW}WS URL: $NEXT_PUBLIC_WS_URL${NC}"

npm run dev
