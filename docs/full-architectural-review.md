# Full Architectural Review

Date: 2026-03-14
Scope: Full-stack review of backend, frontend, infrastructure, CI/CD, and operational posture.

## Executive summary

This platform is a strong prototype but not yet production-ready. The main blockers are:
- critical trust-boundary/security gaps
- synchronous and stateful patterns that limit scalability
- reliability issues in session and websocket lifecycle
- deployment/ops hardening gaps (secrets, chart safety, observability, CI controls)

## Overall verdict

- **Security:** High risk (multiple critical issues)
- **Scalability:** Moderate to high risk under burst/sustained load
- **Code quality/maintainability:** Moderate risk
- **Best practices/operations:** Moderate to high risk
- **Production readiness:** **Not ready** until P0 issues are addressed

---

## 1) Security review

### Critical findings

1. **Arbitrary command execution (RCE) path**
   - `backend/internal/validator/validator.go:45`
   - `backend/cmd/server/main.go:95`
   - Validation endpoint executes request-supplied shell command via `sh -c`.

2. **Terminal websocket trust boundary is open**
   - `backend/cmd/server/main.go:93`
   - `backend/internal/websocket/websocket.go:19`
   - Websocket route lacks visible auth middleware and accepts all origins.

3. **Privileged runtime pods**
   - `backend/internal/k8s/k8s.go:51`
   - Pods are created with privileged security context.

4. **Client-side hardcoded identity**
   - `frontend/src/components/LabWorkspace.tsx:143`
   - Frontend sends `user_id: 1` to start session.

### High findings

- Session ownership/IDOR risk on session operations:
  - `backend/internal/lab/service.go:268`
  - `backend/internal/lab/service.go:298`
  - `backend/internal/lab/service.go:324`
- Insecure default secrets/credentials:
  - `backend/internal/config/config.go:17`
  - `backend/internal/config/config.go:20`
  - `helm/values.yaml:75`
  - `helm/values.yaml:76`

---

## 2) Scalability and reliability review

### Critical/high findings

1. **Websocket hub lifecycle bug**
   - Hub is created but run loop is not started:
   - `backend/cmd/server/main.go:58`
   - Registration path can block:
   - `backend/internal/websocket/websocket.go:99`

2. **Synchronous pod provisioning on request path**
   - `backend/internal/lab/service.go:235`
   - Session start latency tightly coupled to Kubernetes scheduling latency.

3. **Unsafe concurrent mutable state**
   - `backend/internal/lab/service.go:20`
   - `backend/internal/lab/service.go:258`
   - `backend/internal/lab/service.go:287`
   - `podPool` map is mutated from concurrent handlers without synchronization.

4. **Database pooling not tuned**
   - `backend/internal/db/db.go:29`
   - No explicit pool limits or connection lifecycle tuning.

5. **Crashable step validation path**
   - `backend/internal/lab/service.go:349`
   - `backend/internal/lab/service.go:352`
   - `backend/internal/lab/service.go:357`
   - Negative step values can cause panic.

### Medium findings

- Unpaginated lab listing: `backend/internal/lab/service.go:78`
- Potential duplicate lab ingestion on startup:
  - `backend/internal/lab/service.go:391`
  - `backend/cmd/server/main.go:119`
- Incomplete pod exec implementation:
  - `backend/internal/k8s/k8s.go:80`
  - `backend/internal/k8s/k8s.go:94`

---

## 3) Code quality and maintainability

### Backend

- Error details leaked directly in API responses (multiple `err.Error()` responses), e.g.:
  - `backend/internal/lab/service.go:80`
  - `backend/internal/lab/service.go:127`
  - `backend/internal/lab/service.go:161`
- Several ignored errors in step validation flow:
  - `backend/internal/lab/service.go:341`
  - `backend/internal/lab/service.go:344`
  - `backend/internal/lab/service.go:347`
- Migration strategy is inline at app startup:
  - `backend/internal/db/db.go:53`
  - `backend/cmd/server/main.go:33`

### Frontend

- Monolithic orchestration component:
  - `frontend/src/components/LabWorkspace.tsx:50`
- Weak runtime typing/unguarded parse:
  - `frontend/src/components/LabList.tsx:14`
  - `frontend/src/components/LabWorkspace.tsx:149`
- Limited user-visible error handling (mostly console logs):
  - `frontend/src/components/LabWorkspace.tsx:129`
  - `frontend/src/components/LabWorkspace.tsx:153`
  - `frontend/src/components/LabWorkspace.tsx:165`
  - `frontend/src/components/LabWorkspace.tsx:188`
- No reconnect/backoff lifecycle in terminal websocket:
  - `frontend/src/components/Terminal.tsx:60`
  - `frontend/src/components/Terminal.tsx:65`

---

## 4) Infrastructure, CI/CD, and best practices

### High findings

1. **Helm env rendering mismatch risk**
   - `helm/templates/deployment.yaml:44`
   - `helm/values.yaml:74`
   - `env:` is templated from a map instead of explicit K8s env list structure.

2. **Mutable image tags (`latest`)**
   - `helm/values.yaml:6`
   - `.github/workflows/ci-cd.yml:75`

3. **Deploy stage is placeholder**
   - `.github/workflows/ci-cd.yml:103`

### Medium findings

- Metrics scrape annotation present but no obvious backend metrics route:
  - `helm/values.yaml:18`
  - `backend/cmd/server/main.go:70`
- Missing explicit security gates in CI (SAST/dependency/container scan).
- Potentially incomplete chart surface for service/ingress/HPA operationalization.

---

## Priority remediation plan

## P0 — Blockers before production

1. Remove shell execution of request input; use allowlisted validation model.
2. Enforce authn/authz for API and websocket; enforce session ownership.
3. Remove privileged pod mode.
4. Start and harden websocket hub lifecycle.
5. Fix panic/race defects (`step` bounds + `podPool` synchronization/removal).
6. Remove hardcoded user identity from frontend flow.

## P1 — Reliability and scalability hardening

1. Move session provisioning to async worker queue + pending/running states.
2. Add DB pooling configuration and request/query timeouts.
3. Add rate limiting/admission control for session starts and terminal paths.
4. Make lab import idempotent (unique key + upsert policy).
5. Implement resilient websocket reconnect strategy in frontend.

## P2 — Operations and engineering maturity

1. Complete Helm manifests and validate chart rendering in CI.
2. Add observability (metrics, structured logs, tracing, alerts).
3. Replace mutable tags with immutable version/digest strategy.
4. Add backend/frontend tests for critical flows and regression prevention.

---

## Recommended target architecture

1. **API receives intent** and writes authoritative state to DB (`pending` session).
2. **Worker provisions pod asynchronously** and transitions session status.
3. **Frontend polls/subscribes to session state** and only opens terminal when ready.
4. **Terminal path enforces authenticated ownership checks**.
5. **Expiry reconciler** cleans stale sessions/pods deterministically.

---

## Go-live acceptance criteria

- No critical security findings remain open.
- Session burst test passes without races, panics, or pod leaks.
- DB pool saturation remains within configured thresholds under expected peak.
- Websocket authentication and origin policy verified in staging.
- Dashboards and alerts are live for API, DB, k8s, and websocket layers.

## Conclusion

The platform has a promising base, but current architecture requires security hardening, async lifecycle control, and operational rigor before production deployment. Addressing P0/P1 will significantly improve safety, scalability, and reliability.
