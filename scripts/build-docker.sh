#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== KodeKloud Lab Platform - Docker Build ===${NC}"

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker.${NC}"
    exit 1
fi

LABELS=("base" "docker" "kubernetes" "ansible")
DOCKERFILE_BASE=("Dockerfile.base" "Dockerfile.docker" "Dockerfile.kubernetes" "Dockerfile.ansible")

echo -e "${YELLOW}Building lab Docker images...${NC}"

for i in "${!LABELS[@]}"; do
    LABEL="${LABELS[$i]}"
    DOCKERFILE="${DOCKERFILE_BASE[$i]}"
    
    echo -e "${YELLOW}Building image: kodekloud-lab:${LABEL}${NC}"
    
    docker build -f "${DOCKERFILE}" \
                 -t "kodekloud-lab:${LABEL}" \
                 "lab-images/"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully built kodekloud-lab:${LABEL}${NC}"
    else
        echo -e "${RED}Failed to build kodekloud-lab:${LABEL}${NC}"
        exit 1
    fi
done

echo -e "${GREEN}=== All Docker images built successfully! ===${NC}"
echo ""
echo "Images created:"
docker images | grep kodekloud-lab
