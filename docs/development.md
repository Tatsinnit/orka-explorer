# Developer Guide

This document describes how Orka Explorer is structured, how privileged operations are constrained, and how to verify changes safely.

## Architecture

Orka Explorer is a local web application with two parts:

```text
Browser on a random 127.0.0.1 port
        |
        | same-origin JSON + per-launch capability
        v
Node companion gateway
        |
        | fixed argv, shell: false
        +----------> kubectl ----------> selected Kubernetes context
        |
        +----------> Helm -------------> reviewed Orka release
```

The gateway serves the static UI and `/api/console/*` from one random loopback origin. The browser never receives kubeconfig contents, Kubernetes bearer tokens, Secret data, raw Task specs, or Helm values.

### Code map

| Area | Files | Responsibility |
| --- | --- | --- |
| UI shell | `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx` | Context selection, navigation, refresh, operation coordination |
| Crawl | `src/pages/Discover.tsx`, `server/cluster.ts` | Installation discovery, readiness, normalized resource projections |
| Run | `src/pages/Tasks.tsx`, `server/cluster.ts` | Bounded Task creation, Agent type inference, quota guardrail, durable idempotency |
| Agent pod | `src/components/OrkaPod.tsx` | Read-only visualization of projected Agents and Tasks |
| Quick Deploy | `src/pages/Install.tsx`, `server/install.ts`, `server/release.ts` | Release pinning, inventory, authorization, planning, Helm install |
| Local boundary | `server/index.ts`, `server/command.ts` | Capability authentication, Host/Origin checks, process lifecycle, static serving |
| API contracts | `src/domain.ts`, `src/data/console.ts`, `server/schemas.ts` | Browser/server types and request validation |

## Development workflow

Requirements:

- Node.js 22 or newer
- Bun 1.3 or newer
- `kubectl` with a usable kubeconfig context
- Helm 3 or Helm 4 for install planning

Install and run:

```bash
bun install --frozen-lockfile
bun run dev
```

`bun run dev` first builds the UI, then starts:

- Vite in build-watch mode. It does not expose a development HTTP server.
- The companion gateway on a random `127.0.0.1` port.

The gateway creates an owner-readable temporary launcher containing the capability in a URL fragment and opens it in the default browser. The browser moves the capability to `sessionStorage` and removes it from the visible URL.

Run all checks:

```bash
bun run check
```

This performs strict client/server TypeScript checks, a production UI build, and Node unit/integration tests.

## Request flow

Every console API request includes `X-Orka-Capability`. Mutations additionally require:

- `X-Orka-Console: 1`
- an exact same-origin `Origin` header
- a JSON body matching a strict Zod schema

The gateway enforces body, output, rate, concurrency, and process-time limits before invoking local tools.

Unexpected command errors are logged locally with a correlation ID. Only `DomainError` messages and request-validation failures are returned to the browser.

## Discovery invariants

Crawl is read-only, but installation detection is security-sensitive because Quick Deploy depends on it.

- CRD, cluster-wide Orka Deployment, and Service inventory reads are required and fail closed.
- A ready controller is not enough: all CRDs in the reviewed release manifest must exist before state becomes `ready`.
- Helm and Kustomize controller label conventions are recognized explicitly. Arbitrary Orka-labeled Deployments are never used as controller fallback.
- Task and Agent payloads are normalized before crossing into the browser.
- ContextGuard rejects stale crawl and operation responses after a context switch.

## Task creation invariants

The Run page supports two shapes:

- A model-free smoke Task with a fixed command.
- A prompt Task referencing an existing ready Agent.

The server reads the selected Agent and infers `ai` versus `agent` from `spec.runtime`.

Task idempotency survives gateway restarts:

1. The browser keeps one UUID through ambiguous retries.
2. The gateway canonicalizes the UUID and derives a deterministic Task name.
3. The Task stores the idempotency key and payload SHA-256 in annotations.
4. On timeout or `AlreadyExists`, the gateway reads the Task and verifies those annotations before returning it.

Unknown, Pending, Running, and Finalizing Tasks count against the local five-active-Task guardrail. Scheduled templates and terminal Tasks do not. This guardrail is process-local UX protection, not an authorization or billing boundary.

## Quick Deploy invariants

Quick Deploy is deliberately narrower than general Helm access.

- The release contract in `server/release.ts` pins the chart URL, chart SHA-256, CRD inventory, and every release-owned image digest.
- The chart is downloaded into a private per-process directory and created exclusively.
- The archive is rehashed before rendering and installation.
- `helm template --include-crds` must contain only known resource kinds.
- Exact cluster-scoped collisions are checked before planning.
- Namespaced authorization uses complete `SelfSubjectRulesReview` snapshots.
- Cluster-scoped authorization uses exact `SelfSubjectAccessReview` requests.
- RoleBinding and ClusterRoleBinding `roleRef` authorization preserves the binding namespace.
- Plans expire after five minutes, are consumed once, bind to cluster and caller identity, and are recreated immediately before Helm.
- Helm 3 uses `--atomic`; Helm 4 uses `--rollback-on-failure`.
- Upgrades, repairs, and uninstall are not supported.

Helm does not roll back CRDs automatically. The UI displays this before confirmation.

## Process lifecycle

Commands run with fixed argument arrays and `shell: false`. On POSIX systems they run in detached process groups so descendants can be terminated together.

- Normal timeout: `SIGTERM`, configured grace period, then `SIGKILL`.
- Gateway shutdown: stop accepting new commands, signal tracked groups, drain the HTTP server, then force remaining groups.
- Second shutdown signal: synchronously force-kill tracked process groups before exiting.

Tests cover leaders that ignore `SIGTERM`, leaders that exit while descendants remain, and double-signal gateway shutdown.

## Updating the reviewed Orka release

Treat the release manifest as one atomic contract. Do not update only a version string.

1. Download the official release candidate metadata and chart.
2. Verify the chart SHA-256.
3. Record every release-owned multi-platform image digest.
4. Enumerate the exact chart CRDs.
5. Render with all digest overrides under Helm 3 and Helm 4.
6. Confirm every Orka image reference contains `@sha256:`.
7. Update `server/release.ts` and its tests together.
8. Run `bun run check` and a read-only install plan against a disposable cluster.

Never derive release pins from mutable tags at runtime.

## Tests

The server tests cover:

- Kubernetes authorization rule matching and exact binding references
- CRD/readiness and Agent task-type inference
- Task quota and deterministic idempotency helpers
- Context race protection and active polling phases
- Command termination and descendant cleanup
- Gateway capability, Origin, static serving, and shutdown
- Chart inventory, image pins, permission requirements, and Helm rollback flags

Tests must not mutate a real cluster. Live manual checks should stop after Crawl and plan creation unless installation is explicitly intended.

## Capturing documentation visuals

The repository includes a deterministic documentation capture script that serves the production build and intercepts console API requests with representative sample data. It does not use a kubeconfig.

Capture requires Playwright Chromium and `ffmpeg`:

```bash
bunx playwright install chromium
bun run docs:capture
```

The script writes assets under `docs/assets/`. Commit optimized outputs, not Playwright traces, videos, or browser profiles.

## Pull requests

Before opening a change:

```bash
bun install --frozen-lockfile
bun run check
bun audit
```

For changes to privileged paths, include focused regression tests and describe the threat-model impact in the pull request.
