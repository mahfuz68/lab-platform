# Lab Workspace UX Redesign Design Spec

Date: 2026-03-13
Scope: Full-stack redesign of the lab workspace for intermediate/advanced DevOps learners.

## 1. Goals and constraints

### Primary goals
1. Deliver a full UX overhaul while preserving fast access to active labs.
2. Keep a split-balanced workflow where tasks and terminal are simultaneously visible.
3. Improve completion rate and learner confidence through clear objective guidance and progress visibility.

### Must-have capabilities
1. Lab library sidebar with search and filters (difficulty/topic/duration).
2. Active task pane with persistent progress tracking and highlighted current task.
3. Objective banner pinned above terminal.
4. Persistent countdown timer with visible active status.
5. Terminal tabs: Terminal / Docs / Solution.
6. Difficulty and duration tags on each lab.
7. Lightweight XP/progress gamification indicator.
8. Contextual hint button in top bar.

### Audience
- Primary: intermediate/advanced DevOps learners.

### Product direction
- Default interaction pattern: split-balanced workspace.
- Backend changes are allowed.

## 2. High-level architecture

## 2.1 Layout model
- **Left column (Library Sidebar):** discover/select labs.
- **Center column (Tasks Pane):** step-by-step execution progress.
- **Right column (Terminal Area):** terminal, docs, solutions.
- **Top bar (workspace-wide):** timer, status, hint, session controls.

## 2.2 Interaction model
1. User discovers lab via filtered/searchable sidebar.
2. User starts lab session.
3. Current objective appears in banner over terminal.
4. Task completion advances progress and updates objective.
5. Hint and solution access is progressive and policy-driven.
6. Session timer/status remains visible throughout.

## 2.3 Split-balanced layout contract (required)
- Default desktop pane widths at initial load:
  - Library: 25%
  - Tasks: 30%
  - Terminal: 45%
- Minimum widths:
  - Library >= 220px
  - Tasks >= 260px
  - Terminal >= 520px
- Resizing:
  - User may resize library/tasks panes via drag handles.
  - Last pane widths persist per learner (local storage) and restore on reload.
- Breakpoints:
  - At >= 1280px: all three panes must remain visible simultaneously.
  - At 1024px-1279px: all three panes remain visible, but compact spacing is applied.
  - Below 1024px: tasks pane collapses into a toggle drawer while terminal stays visible.

## 2.4 Advanced-learner UX constraints
- Core loop (start lab -> execute command -> validate task) should be keyboard-first friendly.
- Keep click depth low for core actions (start lab, open hint, switch terminal/docs, complete task).
- Preserve high information density without hiding active objective or progress context.
- Persist active tab, pane sizes, and active task across reload for in-progress sessions.

## 3. Frontend design

## 3.1 Component boundaries
Refactor current large orchestration component into focused units:
- `LabWorkspace` (orchestrator + shared state wiring)
- `LabLibrarySidebar`
- `LabFiltersBar`
- `ActiveTasksPane`
- `SessionTopbar`
- `ObjectiveBanner`
- `TerminalTabs` (contains Terminal / Docs / Solution)
- `XPFooterBadge`

Each component should own presentation logic only; network calls are centralized in a thin data/service layer.

## 3.2 State model
- `labs`, `labFilters`, `recommendedLabs`
- `activeSession` (session_id, status, expires_at, lab_id)
- `tasks` (id, text, status: pending|active|done)
- `currentTaskId`
- `hintState` (count, per-task usage, solutionUnlocked)
- `xpState` (sessionXP, optional cumulativeXP)
- `terminalTab` (`terminal` | `docs` | `solution`)

## 3.3 UX behavior details
### Library Sidebar
- Search input + filter controls.
- Sections: In Progress, Recommended, All Labs.
- Lab card metadata: difficulty tag + duration tag (+ topic optional).
- Empty state for no filter matches.

### Tasks Pane
- Persistent list of tasks for active lab.
- Current task highlighted.
- Completed tasks retained and greyed for context.
- Progress bar + “X of Y complete” label.

### Terminal Area
- Tab bar for Terminal / Docs / Solution.
- Objective banner pinned above terminal output.
- Terminal retains current websocket behavior with resilient reconnect UX.

### Topbar
- Session label and task index context.
- Countdown timer with status dot.
- Hint button and End Lab action.
- Warning styling under low remaining time threshold.

### Gamification
- Sidebar footer includes lightweight XP feedback (e.g., “+120 XP”).
- XP updates tied to task completion events.

## 4. Backend/API design

## 4.1 Data model additions
Extend lab metadata to support discovery:
- `difficulty` (enum/string)
- `topic` (string)
- `estimated_minutes` (int)
- `recommended_order` (optional int)

Session/task tracking additions:
- Session task progress records (task status progression per session).
- Hint usage tracking per task/session.
- Reward/XP ledger for session-level increments.

## 4.2 Endpoint additions/updates
### Labs discovery
- `GET /api/v1/labs`
  - Query params: `search`, `difficulty`, `topic`, `max_duration`
  - Returns enriched metadata.

### Session task lifecycle
- `GET /api/v1/sessions/:id/tasks`
- `POST /api/v1/sessions/:id/tasks/:taskId/complete`

### Hint/solution
- `POST /api/v1/sessions/:id/hint`
  - Request: `{ task_id, context }`
  - `context` may include latest validation error and recent terminal error signature.
  - Response: `{ level, hint_text, applies_to_task_id, solution_unlocked, cooldown_seconds }`
- `GET /api/v1/sessions/:id/solution` (gated)

Hint levels for contextual guidance:
- Level 1: directional nudge (conceptual pointer)
- Level 2: guided step (specific next command pattern)
- Level 3: near-solution scaffold (still requires learner execution)

Hint policy:
- Hints are task-scoped and must reference the current task objective.
- Repeated requests for same task/state are idempotent unless learner state changes.
- Optional cooldown/rate limit prevents hint spamming while keeping support accessible.
- Solution unlock policy is enforced server-side and returned explicitly in hint response.

### XP/reward
- `POST /api/v1/sessions/:id/reward`
  - Response includes awarded XP and current session XP.

## 4.3 Backend rules
- Task completion must be explicit and deterministic.
- Hint usage should be idempotent for same task state.
- Solution access should be enforced server-side.
- Session expiry should hard-stop task mutations and terminal writes.

## 5. Data flow

1. **Workspace load:** fetch labs with metadata and optional recommendations.
2. **Lab start:** create session, fetch task state, open terminal websocket.
3. **Task progress:** validate task → complete task endpoint → update UI + objective + XP.
4. **Hints:** request hint, update hint state, apply solution unlock policy.
5. **Session end/expire:** finalize status, preserve transcript/progress summary, return to library.

## 6. Error handling and resiliency

## 6.1 API failure handling
- All primary actions expose inline errors (not only console logs).
- Retry affordances for lab list fetch, session start, and task complete.
- Distinct empty-state vs error-state visuals.

## 6.2 Terminal connection handling
- Show disconnected badge on websocket close/error.
- Attempt bounded reconnect.
- Provide explicit “Reconnect terminal” control when auto-retry fails.

## 6.3 Timer/session safeguards
- Visual warning as expiry approaches.
- On expiry: freeze command input, show session-expired CTA.
- Preserve read-only terminal output and completed task context.

## 7. Testing strategy

## 7.1 Backend tests
- Unit tests for filtering logic, task transitions, hint/solution gating, XP rules.
- API tests for new session-task/hint/reward endpoints and error paths.
- Integration test: session start → task completion → XP award → end/expire.

## 7.2 Frontend tests
- Component tests: filters, task rendering states, objective banner updates, tab lock/unlock.
- E2E tests: discover lab via filters, start lab, progress tasks, use hint, timer warning/expiry.

## 7.3 Contract checks
- Shared response shape verification for task status enums, hint payloads, and XP responses.

## 8. Rollout approach

1. Introduce backend metadata and endpoints behind non-breaking additions.
2. Refactor frontend component boundaries while preserving existing flow.
3. Switch workspace UI to redesigned layout and wire new APIs.
4. Add progressive enhancements (docs/solution tab gating, XP feedback).
5. Verify with end-to-end acceptance scenarios.

## 9. Acceptance criteria

1. Learner can search/filter labs by difficulty/topic/duration and start one from sidebar.
2. Active task pane always shows current task and progress, with completed tasks retained.
3. Objective banner always reflects current task objective while terminal is in use.
4. Timer and session status are visible at all times during active session.
5. Terminal tabs allow context switching without leaving workspace.
6. Hint and solution behavior follows server-enforced progressive disclosure.
7. XP indicator updates after task completion events.
8. UI remains usable and informative under API/websocket failures.
9. On >=1280px screens, library + tasks + terminal are all visible simultaneously by default.
10. Default split proportions and min pane widths follow the split-balanced layout contract.
11. Active session state persists: pane sizes, current task, and active tab restore after reload.
12. Keyboard users can switch tasks/tabs and trigger core actions without forced mouse-only flows.
13. Contextual hints reference the current task and recent learner state (validation/terminal signals).
14. Core workflow click depth is constrained (no extra navigation to access task context or terminal).
15. Solution unlock state is server-authoritative and consistent after refresh.
16. Task completion rate and time-to-first-valid-command are measurable for advanced learner cohorts.
17. A/B or baseline comparison can show improved flow efficiency vs current UI.
18. Task/test instrumentation records key UX events: start session, task complete, hint used, tab switch.
19. Error states preserve learner context and provide retry paths without losing session progress.
20. Redesign remains aligned to reference direction from `new_ux_redesign.html` while using production components.
