# Lab Workspace Full UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a full-stack, split-balanced lab workspace redesign with discoverable labs, persistent task guidance, objective-focused terminal workflow, contextual hints, and lightweight XP progression.

**Architecture:** Implement in vertical slices: backend metadata/progression APIs first, then frontend workspace refactor into focused components, then resilience/testing hardening. Keep current session/terminal architecture, extend it with task/hint/reward state, and enforce solution gating + expiry guards on the server.

**Tech Stack:** Go 1.21 (Gin, database/sql, PostgreSQL), Next.js 14 + React 18 + TypeScript, axios, xterm.js, Tailwind CSS, Vitest + Testing Library.

---

## File structure map (planned)

### Backend
- Modify: `backend/internal/db/db.go`
- Modify: `backend/internal/lab/service.go`
- Modify: `backend/cmd/server/main.go`
- Create/Modify: `backend/internal/lab/service_test.go`
- Create: `backend/cmd/server/main_test.go`

### Frontend app code
- Modify: `frontend/src/components/LabWorkspace.tsx`
- Modify: `frontend/src/components/Terminal.tsx`
- Create: `frontend/src/types/lab.ts`
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/api/labs.ts`
- Create: `frontend/src/lib/api/sessions.ts`
- Create: `frontend/src/components/workspace/LabLibrarySidebar.tsx`
- Create: `frontend/src/components/workspace/LabFiltersBar.tsx`
- Create: `frontend/src/components/workspace/ActiveTasksPane.tsx`
- Create: `frontend/src/components/workspace/SessionTopbar.tsx`
- Create: `frontend/src/components/workspace/ObjectiveBanner.tsx`
- Create: `frontend/src/components/workspace/TerminalTabs.tsx`
- Create: `frontend/src/components/workspace/XPFooterBadge.tsx`

### Frontend test infra and tests
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/lib/api/__tests__/labs.test.ts`
- Create: `frontend/src/components/workspace/__tests__/ActiveTasksPane.test.tsx`
- Create: `frontend/src/components/workspace/__tests__/SessionTopbar.test.tsx`
- Create: `frontend/src/components/workspace/__tests__/TerminalTabs.test.tsx`
- Create: `frontend/src/components/workspace/__tests__/WorkspaceAccessibility.test.tsx`

> Use `@superpowers:test-driven-development` for each task implementation sequence.

---

## Chunk 1: Backend foundation (metadata, tasks, hints, rewards)

### Task 1: Add schema support for discovery + progression

**Files:**
- Modify: `backend/internal/db/db.go`
- Test: `backend/internal/lab/service_test.go`

- [ ] **Step 1: Write failing migration/scan tests**

```go
func TestLabMetadataColumnsAvailable(t *testing.T) {}
func TestSessionProgressionTablesAvailable(t *testing.T) {}
```

- [ ] **Step 2: Run focused tests to verify fail**

Run: `cd backend && go test -v ./internal/lab -run 'TestLabMetadataColumnsAvailable|TestSessionProgressionTablesAvailable'`
Expected: FAIL.

- [ ] **Step 3: Add minimal non-breaking migrations**

```sql
ALTER TABLE labs ADD COLUMN IF NOT EXISTS difficulty VARCHAR(32) DEFAULT 'medium';
ALTER TABLE labs ADD COLUMN IF NOT EXISTS topic VARCHAR(128) DEFAULT 'general';
ALTER TABLE labs ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS recommended_order INTEGER;

CREATE TABLE IF NOT EXISTS session_tasks (...);
CREATE TABLE IF NOT EXISTS session_hints (...);
CREATE TABLE IF NOT EXISTS session_rewards (...);
```

- [ ] **Step 4: Run full backend suite**

Run: `cd backend && go test -v ./...`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/db/db.go backend/internal/lab/service_test.go
git commit -m "feat: add lab metadata and session progression schema"
```

### Task 2: Implement metadata filters + robust YAML parsing

**Files:**
- Modify: `backend/internal/lab/service.go`
- Modify: `backend/internal/lab/service_test.go`

- [ ] **Step 1: Write failing tests**

```go
func TestCreateLabFromYAMLSupportsNestedAndTopLevelSteps(t *testing.T) {}
func TestListLabsAppliesDifficultyTopicDurationFilters(t *testing.T) {}
func TestListLabsIncludesMetadataFields(t *testing.T) {}
```

- [ ] **Step 2: Run focused tests to verify fail**

Run: `cd backend && go test -v ./internal/lab -run 'TestCreateLabFromYAMLSupportsNestedAndTopLevelSteps|TestListLabsAppliesDifficultyTopicDurationFilters|TestListLabsIncludesMetadataFields'`
Expected: FAIL.

- [ ] **Step 3: Implement minimal behavior**

```go
// Parse both shapes:
// lab.steps and top-level steps

// ListLabs supports query params:
// search, difficulty, topic, max_duration
```

- [ ] **Step 4: Run focused + full tests**

Run: `cd backend && go test -v ./internal/lab && go test -v ./...`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/lab/service.go backend/internal/lab/service_test.go
git commit -m "feat: add lab filtering and backward compatible yaml parsing"
```

### Task 3: Implement session task/hint/solution/reward APIs with expiry and contract enforcement

**Files:**
- Modify: `backend/internal/lab/service.go`
- Modify: `backend/cmd/server/main.go`
- Modify: `backend/internal/lab/service_test.go`
- Create/Modify: `backend/cmd/server/main_test.go`

- [ ] **Step 1: Write failing behavior/contract tests**

```go
func TestStartSessionSeedsSessionTasksInOrder(t *testing.T) {}
func TestGetSessionTasksReturnsProgress(t *testing.T) {}
func TestHintContractAndIdempotency(t *testing.T) {}
func TestSolutionRequiresUnlockCondition(t *testing.T) {}
func TestRewardAccumulatesSessionXP(t *testing.T) {}
func TestCompleteTaskRejectedWhenSessionExpired(t *testing.T) {}
func TestHintRejectedWhenSessionExpired(t *testing.T) {}
func TestSolutionRejectedWhenSessionExpired(t *testing.T) {}
func TestRewardRejectedWhenSessionExpired(t *testing.T) {}
func TestSessionRoutesRegistered(t *testing.T) {}
```

- [ ] **Step 2: Run focused tests to verify fail**

Run: `cd backend && go test -v ./internal/lab -run 'TestStartSessionSeedsSessionTasksInOrder|TestGetSessionTasksReturnsProgress|TestHintContractAndIdempotency|TestSolutionRequiresUnlockCondition|TestRewardAccumulatesSessionXP|TestCompleteTaskRejectedWhenSessionExpired|TestHintRejectedWhenSessionExpired|TestSolutionRejectedWhenSessionExpired|TestRewardRejectedWhenSessionExpired' && go test -v ./cmd/server -run TestSessionRoutesRegistered`
Expected: FAIL.

- [ ] **Step 3: Implement endpoints and exact contract**

```go
// Endpoints
GET  /api/v1/sessions/:id/tasks
POST /api/v1/sessions/:id/tasks/:taskId/complete
POST /api/v1/sessions/:id/hint
GET  /api/v1/sessions/:id/solution
POST /api/v1/sessions/:id/reward

// Hint request/response
// req:  { task_id, context }
// resp: { level, hint_text, applies_to_task_id, solution_unlocked, cooldown_seconds }

// Enforce expiry guard for all mutation/read-gated session endpoints.
// Seed session_tasks in StartSession.
```

- [ ] **Step 4: Run backend verification**

Run: `cd backend && go test -v ./cmd/server && go test -v ./internal/lab && go test -v ./...`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/lab/service.go backend/cmd/server/main.go backend/internal/lab/service_test.go backend/cmd/server/main_test.go
git commit -m "feat: add session task hint solution reward APIs with expiry guards"
```

---

## Chunk 2: Frontend workspace overhaul (split-balanced UX)

### Task 4: Set up frontend test infrastructure and typed API layer

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/types/lab.ts`
- Create: `frontend/src/lib/api/client.ts`
- Create: `frontend/src/lib/api/labs.ts`
- Create: `frontend/src/lib/api/sessions.ts`
- Modify: `frontend/src/components/LabWorkspace.tsx`
- Test: `frontend/src/lib/api/__tests__/labs.test.ts`

- [ ] **Step 1: Write failing tests and missing-test-runner baseline**

```ts
it('builds labs query params correctly', () => {
  expect(buildLabsQuery({ difficulty: 'hard', topic: 'kubernetes', maxDuration: 45 })).toBe('?difficulty=hard&topic=kubernetes&max_duration=45')
})
```

- [ ] **Step 2: Run test command to verify fail**

Run: `cd frontend && npm run test -- src/lib/api/__tests__/labs.test.ts`
Expected: FAIL (runner not configured and/or implementation missing).

- [ ] **Step 3: Configure test runner + implement typed API wrappers**

```ts
// package scripts:
// "test": "vitest run", "test:watch": "vitest"

export const listLabs = (filters) => api.get('/labs', { params: ... })
export const getSessionTasks = (id) => api.get(`/sessions/${id}/tasks`)
```

- [ ] **Step 4: Run tests + lint + build**

Run: `cd frontend && npm run test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/types/lab.ts frontend/src/lib/api/client.ts frontend/src/lib/api/labs.ts frontend/src/lib/api/sessions.ts frontend/src/components/LabWorkspace.tsx frontend/src/lib/api/__tests__/labs.test.ts
git commit -m "test: add frontend vitest setup and typed workspace api layer"
```

### Task 5: Implement split-balanced shell with workspace-wide topbar, resize, and responsive behavior

**Files:**
- Create: `frontend/src/components/workspace/LabFiltersBar.tsx`
- Create: `frontend/src/components/workspace/LabLibrarySidebar.tsx`
- Create: `frontend/src/components/workspace/ActiveTasksPane.tsx`
- Create: `frontend/src/components/workspace/SessionTopbar.tsx`
- Create: `frontend/src/components/workspace/XPFooterBadge.tsx`
- Modify: `frontend/src/components/LabWorkspace.tsx`
- Test: `frontend/src/components/workspace/__tests__/ActiveTasksPane.test.tsx`
- Test: `frontend/src/components/workspace/__tests__/SessionTopbar.test.tsx`

- [ ] **Step 1: Write failing component tests**

```ts
it('highlights current task and greys completed tasks', () => {})
it('renders workspace-wide timer warning state', () => {})
it('restores pane widths from storage', () => {})
it('uses drawer behavior for tasks pane below 1024px', () => {})
```

- [ ] **Step 2: Run targeted tests to verify fail**

Run: `cd frontend && npm run test -- src/components/workspace/__tests__/ActiveTasksPane.test.tsx src/components/workspace/__tests__/SessionTopbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement split-balanced contract**

```tsx
<div className="workspace-shell">
  <SessionTopbar ... /> {/* workspace-wide */}
  <div className="workspace-split"> {/* library + tasks + terminal */}
    ...
  </div>
</div>

// enforce defaults 25/30/45, min widths 220/260/520
// add drag resize handles + localStorage persistence
// below 1024: tasks pane becomes toggle drawer
```

- [ ] **Step 4: Run tests + lint + build**

Run: `cd frontend && npm run test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LabWorkspace.tsx frontend/src/components/workspace/LabFiltersBar.tsx frontend/src/components/workspace/LabLibrarySidebar.tsx frontend/src/components/workspace/ActiveTasksPane.tsx frontend/src/components/workspace/SessionTopbar.tsx frontend/src/components/workspace/XPFooterBadge.tsx frontend/src/components/workspace/__tests__/ActiveTasksPane.test.tsx frontend/src/components/workspace/__tests__/SessionTopbar.test.tsx
git commit -m "feat: implement split balanced workspace shell with resize and responsive rules"
```

### Task 6: Add objective banner, terminal/docs/solution tabs, contextual hint flow, keyboard-first interactions

**Files:**
- Create: `frontend/src/components/workspace/ObjectiveBanner.tsx`
- Create: `frontend/src/components/workspace/TerminalTabs.tsx`
- Modify: `frontend/src/components/Terminal.tsx`
- Modify: `frontend/src/components/LabWorkspace.tsx`
- Test: `frontend/src/components/workspace/__tests__/TerminalTabs.test.tsx`
- Test: `frontend/src/components/workspace/__tests__/WorkspaceAccessibility.test.tsx`

- [ ] **Step 1: Write failing tests**

```ts
it('disables solution tab until solutionUnlocked is true', () => {})
it('renders objective banner for current task', () => {})
it('supports keyboard switching for tabs and task focus', () => {})
it('triggers hint action via keyboard without mouse', () => {})
```

- [ ] **Step 2: Run targeted tests to verify fail**

Run: `cd frontend && npm run test -- src/components/workspace/__tests__/TerminalTabs.test.tsx src/components/workspace/__tests__/WorkspaceAccessibility.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement minimal tab/banner/hint behavior**

```tsx
<TerminalTabs activeTab={terminalTab} solutionUnlocked={hintState.solutionUnlocked} ... />
<ObjectiveBanner text={currentTaskObjective} />
// wire hint endpoint request + server-authoritative solution unlock
```

- [ ] **Step 4: Run tests + lint + build**

Run: `cd frontend && npm run test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/ObjectiveBanner.tsx frontend/src/components/workspace/TerminalTabs.tsx frontend/src/components/Terminal.tsx frontend/src/components/LabWorkspace.tsx frontend/src/components/workspace/__tests__/TerminalTabs.test.tsx frontend/src/components/workspace/__tests__/WorkspaceAccessibility.test.tsx
git commit -m "feat: add objective banner tabs contextual hints and keyboard workflows"
```

---

## Chunk 3: Resilience, verification, and rollout safety

### Task 7: Implement reconnect, API retry UX, and session-expiry safeguards

**Files:**
- Modify: `frontend/src/components/Terminal.tsx`
- Modify: `frontend/src/components/LabWorkspace.tsx`
- Modify: `frontend/src/lib/api/sessions.ts`

- [ ] **Step 1: Write failing resilience tests**

```ts
it('shows reconnect action after bounded websocket retries fail', () => {})
it('shows inline retry CTA for lab list/session/task API failures', () => {})
it('freezes terminal input and shows expiry CTA when session expires', () => {})
it('preserves read-only transcript and task context after expiry', () => {})
```

- [ ] **Step 2: Run targeted tests to verify fail**

Run: `cd frontend && npm run test -- src/components/workspace/__tests__/TerminalTabs.test.tsx src/components/workspace/__tests__/SessionTopbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement minimal resilience behavior**

```ts
// bounded reconnect + explicit Reconnect terminal action
// inline API errors with Retry buttons
// on expiry: disable terminal input, keep transcript, show restart/extend CTA hook
```

- [ ] **Step 4: Run tests + lint + build**

Run: `cd frontend && npm run test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Terminal.tsx frontend/src/components/LabWorkspace.tsx frontend/src/lib/api/sessions.ts
git commit -m "feat: add reconnect retry and session expiry safeguards"
```

### Task 8: End-to-end verification and release checklist

**Files:**
- Modify: `backend/internal/lab/service_test.go`
- Modify: `frontend/src/components/LabWorkspace.tsx` (only if verification uncovers issues)

- [ ] **Step 1: Add failing integration test for progression flow**

```go
func TestSessionProgressionHintRewardFlow(t *testing.T) {
  // start session -> tasks -> hint -> complete task -> reward -> solution gating
}
```

- [ ] **Step 2: Run focused integration test and verify FAIL**

Run: `cd backend && go test -v ./internal/lab -run TestSessionProgressionHintRewardFlow`
Expected: FAIL.

- [ ] **Step 3: Implement minimal fixes uncovered by integration test**

```go
// patch only the failing logic path (no broad refactors)
```

- [ ] **Step 4: Run backend verification**

Run: `cd backend && go test -v ./internal/lab && go test -v ./...`
Expected: PASS.

- [ ] **Step 5: Run frontend verification**

Run: `cd frontend && npm run test && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 6: Manual acceptance against spec criteria**

Run:
- Start backend: `make backend-run`
- Start frontend: `make frontend-dev`
- Validate criteria #1-#20 from `docs/superpowers/specs/2026-03-13-lab-workspace-ux-redesign-design.md`.
Expected: all critical criteria pass.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/lab/service_test.go frontend/src/components/LabWorkspace.tsx
git commit -m "test: verify end to end workspace progression and resilience flows"
```

---

## Implementation notes for agentic workers

- Keep each task scoped to one feature slice; avoid unrelated refactors.
- Prefer server-authoritative state for completion/hints/solution unlock.
- Preserve backwards compatibility for existing lab YAML formats.
- Run `@superpowers:verification-before-completion` before claiming done.
