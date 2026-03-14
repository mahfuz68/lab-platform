# Scalability Review

Date: 2026-03-14
Scope: Backend API, session lifecycle, WebSocket terminal path, DB and Kubernetes integration.

## Executive summary

The current architecture is suitable for development and small pilot traffic, but it is **not production-ready for sustained or burst loads**.

Primary bottlenecks and risks:
- in-process mutable state and single-node assumptions
- synchronous pod provisioning on request path
- no explicit DB pool tuning
- missing lifecycle cleanup and admission/rate control
- security gaps that can amplify load/abuse impact

## Assessment by layer

### 1) API and application concurrency

#### Findings
- `backend/internal/lab/service.go:20` keeps `podPool` as a plain map with concurrent handler access and no synchronization.
- `backend/internal/lab/service.go:233` generates pod names using second-level timestamp (`lab-<labID>-<unix>`), which can collide under concurrent starts.
- `backend/internal/lab/service.go:78` returns all labs without pagination.

#### Impact at scale
- Potential data races and undefined behavior under concurrent requests.
- Session start failures from name collisions during bursts.
- Increasing latency and response payload size as lab catalog grows.

### 2) Database scalability and reliability

#### Findings
- `backend/internal/db/db.go:29` opens a DB handle but does not set pool limits/lifetimes.
- `backend/cmd/server/main.go:33` runs migrations synchronously at startup.
- `backend/internal/lab/service.go:391` inserts labs from YAML without visible idempotency guard; repeated startup imports may duplicate rows.

#### Impact at scale
- Unbounded or poorly tuned DB usage can cause connection thrashing/saturation.
- Slow/fragile startup behavior as schema/data size increases.
- Growing duplicate data increases query cost and operational complexity.

### 3) Kubernetes session provisioning

#### Findings
- `backend/internal/lab/service.go:235` performs `CreatePod` inline in `StartSession` request flow.
- No explicit queue/backpressure path for session starts.
- No explicit cleanup worker for expired sessions/pods observed in API path.

#### Impact at scale
- Pod scheduling startup latency directly inflates user-facing API latency (P95/P99).
- Burst traffic can overload API and Kubernetes control plane simultaneously.
- Resource leakage risk if sessions expire without deterministic cleanup.

### 4) WebSocket terminal architecture

#### Findings
- `backend/internal/websocket/websocket.go:31` stores clients in-process, per server instance.
- `backend/internal/websocket/websocket.go:63` maps one `Client` per `sessionID` (new registration overwrites old).
- `backend/internal/websocket/websocket.go:19` uses `CheckOrigin: true`.
- `backend/cmd/server/main.go:93` exposes terminal path without visible auth middleware.

#### Impact at scale
- Horizontal scaling is fragile without shared connection/session coordination.
- Multi-tab or reconnect behavior can evict active client unexpectedly.
- Security posture allows abuse patterns that become a scalability multiplier.

### 5) Validation execution path

#### Findings
- `backend/internal/k8s/k8s.go:80` `ExecInPod` currently returns empty output; execution path is incomplete.
- `backend/internal/validator/validator.go:45` executes `sh -c` from request-provided validation string.

#### Impact at scale
- Validation throughput/latency behavior is currently unproven in real execution path.
- Shell execution model increases safety and resource-control concerns under load.

## Readiness verdict

- **Today:** suitable for local/dev and limited demos.
- **Production sustained load:** **No** (architecture and controls incomplete).

## Priority remediation plan

### P0 (must-do before production)
1. Add concurrency safety for shared mutable state (or remove in-memory state from request-critical flows).
2. Replace pod naming strategy with collision-safe identifiers.
3. Configure DB pooling (`max open/idle`, connection lifetime/idle timeout).
4. Protect terminal/API paths with authentication and strict origin policy.
5. Implement deterministic cleanup for expired sessions/pods.

### P1 (strongly recommended for production confidence)
1. Move session provisioning to async workflow (enqueue request, return pending session state, worker provisions pod).
2. Add rate limiting/admission control on session-start and terminal paths.
3. Add pagination/filtering server-side for lab listing endpoint.
4. Make YAML lab import idempotent (unique key + upsert/skip policy).
5. Complete and harden `ExecInPod` with timeout and bounded resource behavior.

### P2 (operational excellence)
1. Add distributed/session-aware websocket strategy for multi-replica deployments.
2. Add structured metrics and alerts:
   - API request latency and error rates
   - session start duration (queue time + pod-ready time)
   - DB pool saturation
   - active sessions and pod counts
   - websocket connection count/churn
3. Add load and chaos tests for burst session creation and expiry cleanup behavior.

## Suggested production target architecture

1. **Control plane split**: API receives session-start request and writes a session record as `pending`.
2. **Worker/queue**: background worker provisions pod and transitions session to `running` or `failed`.
3. **State authority**: DB as source of truth for session lifecycle and progress.
4. **Realtime path**: websocket/terminal routing tied to authenticated session identity.
5. **Lifecycle automation**: expiry sweeper/TTL cleanup reconciles DB sessions and Kubernetes pods.

## Acceptance criteria before go-live

- Load test: no data races, no pod-name collisions, no leaked pods after expiry runs.
- Session start burst: API remains responsive while queue absorbs spikes.
- DB metrics: pool saturation within configured limits under expected peak load.
- Security checks: unauthenticated websocket/API access blocked; origin policy enforced.
- Observability: dashboards and alerts in place for API, DB, Kubernetes, and websocket layers.

## Conclusion

The platform has a solid functional base, but production scalability requires turning session lifecycle into an asynchronous, observable, and policy-controlled system. Addressing P0/P1 items will materially improve reliability and capacity under real-world load.
