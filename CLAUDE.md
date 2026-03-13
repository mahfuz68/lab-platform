# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo is a full-stack DevOps lab platform:
- `backend/`: Go 1.21 API server (Gin) for labs, sessions, validation, and terminal websocket.
- `frontend/`: Next.js 14 + React 18 + TypeScript UI for selecting labs, running sessions, and using a browser terminal.
- `labs/`: YAML lab definitions loaded by the backend at startup.
- `lab-images/`: Dockerfiles for lab runtime images.
- `helm/`: Kubernetes chart for backend deployment plus PostgreSQL/Redis dependencies.

## Common development commands

### Root-level (Makefile)
- Install dependencies: `make install`
- Build backend + frontend: `make build`
- Run backend tests: `make test`
- Backend only: `make backend-deps && make backend-build && make backend-run`
- Frontend only: `make frontend-deps && make frontend-dev`

### Backend (`backend/`)
- Download deps: `go mod download`
- Run server: `go run ./cmd/server`
- Build binary: `go build -o server ./cmd/server`
- Run all tests: `go test -v ./...`
- Run one package: `go test -v ./internal/lab`
- Run one test: `go test -v -run TestName ./internal/lab`
- Format/lint: `go fmt ./... && go vet ./...`

### Frontend (`frontend/`)
- Install deps: `npm install` (CI uses `npm ci`)
- Dev server: `npm run dev`
- Production build: `npm run build`
- Start built app: `npm run start`
- Lint: `npm run lint`

## Runtime and environment

### Backend env vars (loaded in `backend/internal/config/config.go`)
- `DATABASE_URL` (PostgreSQL connection)
- `KUBECONFIG` (path for Kubernetes client)
- `VALIDATION_SCRIPT_PATH` (default `./scripts/validate.sh`)
- `JWT_SECRET`
- `PORT` (default `8080`)

### Frontend env vars
- `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api/v1`)
- `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8080/api/v1`)

### Test-mode behavior
When `TEST_MODE=1`, backend startup skips real DB/K8s dependencies and exposes a mock `/api/v1/validate` response path (see `backend/cmd/server/main.go`).

## Architecture map

### Backend wiring
- Entry point: `backend/cmd/server/main.go`
- Startup flow:
  1. Load config.
  2. Initialize DB and run migrations (`backend/internal/db/db.go`).
  3. Initialize Kubernetes client (`backend/internal/k8s/k8s.go`) if available.
  4. Construct `lab.Service` (`backend/internal/lab/service.go`) and websocket hub (`backend/internal/websocket/websocket.go`).
  5. Register API routes under `/api/v1`.
  6. Load lab YAML files from `labs/` into DB via `LoadLabsFromDirectory`.

### Core backend domains
- **Lab service (`internal/lab`)**: CRUD for labs, session start/end, step validation, YAML-to-DB import.
- **DB layer (`internal/db`)**: opens PostgreSQL and applies table/index migrations for `users`, `labs`, `lab_sessions`.
- **K8s layer (`internal/k8s`)**: pod create/delete/get and command execution surface for lab containers.
- **WebSocket hub (`internal/websocket`)**: manages terminal client connections by `session_id`.
- **Validator (`internal/validator`)**: executes validation commands for `/api/v1/validate`.

### Frontend flow
- Main page: `frontend/src/app/page.tsx`.
- Primary orchestrator: `frontend/src/components/LabWorkspace.tsx`.
  - Fetches labs from backend.
  - Starts a session via `/sessions/start`.
  - Fetches lab steps from `/labs/:id`.
  - Validates current step via `/sessions/:id/validate`.
  - Ends session via `/sessions/:id/end`.
- Terminal UI:
  - `TerminalWrapper.tsx` loads terminal client-only (SSR off).
  - `Terminal.tsx` uses xterm.js and connects to websocket endpoint `/terminal/:session_id`.

## Deployment and CI/CD

- CI workflow: `.github/workflows/ci-cd.yml`
  - Builds and tests backend (`go test -v ./...`).
  - Builds frontend (`npm ci && npm run build`).
  - Builds lab images from `lab-images/`.
- Helm chart: `helm/`
  - Backend deployment template in `helm/templates/deployment.yaml`.
  - Chart declares PostgreSQL + Redis dependencies in `helm/Chart.yaml`.
  - Runtime defaults (replicas, resources, env, ingress) in `helm/values.yaml`.
