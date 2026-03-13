#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== KodeKloud Lab Platform - Frontend Setup ===${NC}"

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm${NC}"
    exit 1
fi

echo -e "${YELLOW}Installing npm dependencies...${NC}"
cd frontend
npm install

echo -e "${YELLOW}Building Next.js application...${NC}"
npm run build

if [ -d ".next" ]; then
    echo -e "${GREEN}Frontend built successfully!${NC}"
    echo -e "Run with: npm run dev"
else
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi
