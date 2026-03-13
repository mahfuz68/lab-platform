# AGENTS.md - KodeKloud Lab Platform

This file provides guidelines for agents working on this codebase.

## Project Overview

KodeKloud Lab is a cloud-based DevOps learning platform (like KodeKloud/Katacoda) with:
- **Backend**: Go (Gin) API server
- **Frontend**: Next.js 14 with React 18, TypeScript, Tailwind CSS
- **Infrastructure**: Kubernetes, PostgreSQL, WebSocket terminal

## Project Structure

```
kodekloud-lab/
├── backend/                    # Go API server
│   ├── cmd/server/main.go     # Entry point
│   ├── go.mod                 # Go dependencies
│   └── internal/
│       ├── config/            # Configuration
│       ├── db/                # PostgreSQL client & migrations
│       ├── k8s/               # Kubernetes client
│       ├── lab/               # Lab orchestration service
│       ├── validator/         # Task validation engine
│       └── websocket/         # WebSocket terminal hub
│
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/               # App router pages
│   │   └── components/        # React components
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── lab-images/                 # Docker images for lab environments
├── labs/                      # YAML-based lab content
└── helm/                      # Kubernetes deployment charts
```

---

## Build & Development Commands

### Backend (Go)

```bash
# Navigate to backend
cd kodekloud-lab/backend

# Download dependencies
go mod download

# Build the server
go build -o server ./cmd/server

# Run the server
go run ./cmd/server

# Run tests
go test -v ./...

# Run tests for specific package
go test -v ./internal/lab

# Run tests with coverage
go test -cover ./...

# Lint code (install golangci-lint first)
golangci-lint run

# Format code
go fmt ./...
go vet ./...
```

### Frontend (Next.js)

```bash
# Navigate to frontend
cd kodekloud-lab/frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix
```

---

## Code Style Guidelines

### General Principles

1. **No unnecessary comments** - Code should be self-explanatory
2. **No type suppression** - Never use `as any`, `@ts-ignore`, `@ts-expect-error`
3. **Error handling** - Always handle errors explicitly, never empty catch blocks
4. **Minimal changes** - Fix what was asked, don't refactor unrelated code

### Go (Backend)

**Imports:**
- Group imports: standard library first, then third-party, then internal
- Use import paths: `github.com/mehedih11/kodekloud-lab/backend/internal/...`

```go
import (
    "log"
    "os"

    "github.com/gin-gonic/gin"
    "github.com/mehedih11/kodekloud-lab/backend/internal/config"
)
```

**Naming:**
- Use camelCase for variables and functions
- Use PascalCase for exported types and functions
- Use meaningful names, avoid abbreviations (except common ones like `ID`, `URL`, `API`)

**Error Handling:**
```go
// Good
if err != nil {
    return fmt.Errorf("failed to connect: %w", err)
}

// In HTTP handlers
if err != nil {
    c.JSON(500, gin.H{"error": err.Error()})
    return
}
```

**Types:**
- Define types near their first usage
- Use struct tags for JSON serialization
- Avoid embedding sql.DB directly; wrap in custom struct

**Functions:**
- Keep functions focused and small
- Use dependency injection for testability

### TypeScript/React (Frontend)

**Imports:**
- React first, then external libs, then internal components
- Use path aliases: `@/components/...`

```typescript
import { useState, useEffect } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import axios from 'axios'
import Terminal from '@/components/Terminal'
```

**Types:**
- Always define interfaces for props and data
- Use `strict: true` in tsconfig.json (already set)
- Avoid `any`, use `unknown` when type is truly unknown

**Components:**
- Use functional components with hooks
- Use `'use client'` directive for client-side components
- Keep components small and focused
- Use TypeScript for all props

```typescript
interface TerminalProps {
  sessionId: number
}

export default function Terminal({ sessionId }: TerminalProps) {
  // ...
}
```

**State:**
- Use `useState` for local state
- Use `useEffect` for side effects with proper cleanup
- Prefer `useCallback` and `useMemo` for expensive operations

### General Patterns

**File Organization:**
- One export per file for components
- Group related functions in service files
- Keep files under 200 lines when possible

**Testing:**
- Write tests for business logic
- Test error cases, not just happy paths
- Use table-driven tests in Go

---

## Database

**PostgreSQL is used with the following schema:**

- `users` - User accounts
- `labs` - Lab definitions with JSONB steps
- `lab_sessions` - Active user sessions with expiration

Run migrations via `db.Migrate()` in the backend.

---

## Environment Variables

### Backend
```
DATABASE_URL=postgres://postgres:password@localhost:5432/kodekloud?sslmode=disable
KUBECONFIG=/path/to/kubeconfig
JWT_SECRET=your-secret
PORT=8080
VALIDATION_SCRIPT_PATH=./scripts/validate.sh
```

### Frontend
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/v1
```

---

## Common Tasks

### Adding a New Lab
1. Create YAML file in `labs/` directory
2. Define steps with title, instruction, and validation commands
3. Database will store lab definitions via API

### Adding a New API Endpoint
1. Add handler in appropriate service file under `backend/internal/`
2. Register route in `backend/cmd/server/main.go`
3. Return proper HTTP status codes

### Adding a Frontend Component
1. Create component in `frontend/src/components/`
2. Use TypeScript interfaces for props
3. Use Tailwind classes for styling

---

## Testing Guidelines

- Run full test suite before submitting changes
- Single test: `go test -v -run TestName ./internal/pkg`
- Frontend component testing: Use React Testing Library patterns
- Integration tests: Test API endpoints with actual DB

---

## Linting Configuration

- **Go**: Uses `go fmt`, `go vet`, golangci-lint
- **TypeScript**: ESLint with Next.js config, strict mode enabled
- **CSS**: Tailwind with custom configuration

Run linting before commits to catch issues early.
