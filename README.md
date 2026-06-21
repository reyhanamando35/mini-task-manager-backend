# Mini Task Manager

A small internal tool for creating tasks, moving them through a fixed status workflow, and reviewing
a tamper-proof audit trail of every status change, built for the "Full Stack Developer (React +
Express)" take-home assessment.

## Tech stack

- **Backend:** Node.js + Express + TypeScript, in-memory data store
- **Frontend:** React + TypeScript (Vite)

## How to run

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Starts the API on `http://localhost:4000` (override with a `PORT` env var).

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Starts the app on `http://localhost:5173` and talks to the backend at `http://localhost:4000` by
default. To point it elsewhere, copy `frontend/.env.example` to `frontend/.env` and set
`VITE_API_BASE_URL`.

### API summary

| Method | Route                      | Purpose                                  |
|--------|-----------------------------|-------------------------------------------|
| GET    | `/users`                    | Predefined actor list (for the dropdown) |
| GET    | `/tasks`                    | List all tasks                           |
| POST   | `/tasks`                    | Create a task (`title`, optional `description`) |
| DELETE | `/tasks/:id`                 | Delete a task                            |
| PUT    | `/tasks/:id/status`          | Change status (`status`, `actor`)        |
| GET    | `/tasks/:id/audit-logs`      | Chronological audit log for one task     |

## Architecture

```
backend/src/
  routes/        -> HTTP routes only, no logic
  controllers/    -> request/response handling + input shape checks
  services/       -> domain logic (status transition rules, idempotency, audit recording)
  data/store.ts    -> in-memory persistence, the only place data is actually stored
  types/          -> shared domain types (Task, AuditLog, status order, predefined users)

frontend/src/
  api/client.ts    -> all fetch() calls to the backend, one place per concern
  components/      -> CreateTaskForm, TaskItem (status + delete + history), StatusBadge
  types/           -> mirrors backend/src/types so both sides agree on the data shape
```

The backend is layered (routes → controllers → services → store) specifically so the status-transition
and audit-log rules live in one place (`task.service.ts`) and can't be bypassed by adding a new route.

A key design decision: **`store.ts` never exposes an "update" or "delete" function for audit logs** —
only `appendAuditLog()` and `getAuditLogsByTaskId()` exist. That's the actual mechanism that guarantees
logs can't be modified, not just a rule written in a comment.

## Assumptions

1. **"hanya mengikuti urutan: to_do → pending → in_progress → done"** is interpreted strictly: a task
   may only advance to the *immediate next* status, one step at a time. No skipping ahead (e.g.
   `to_do → done`), no moving backward. This keeps the rule simple and easy to verify, and is reflected
   directly in `isValidTransition()`.
2. **Idempotent update** (`PUT .../status` with the task's current status) returns `200 OK` with the
   unchanged task and `logCreated: false` — treated as a successful no-op, not an error.
3. **Deleting a task does not delete its audit logs.** The brief says logs must never be modified or
   deleted "dalam keadaan apapun" (under any circumstance) — read literally, that includes after the
   parent task is gone. `GET /tasks/:id/audit-logs` still returns history for a deleted task's id.
4. **Actor is a closed, hardcoded list** of 4 example usernames (not free text), served from the backend
   via `GET /users` so the frontend dropdown and the backend's server-side validation share one source
   of truth instead of two hardcoded lists that could drift apart.
5. **No authentication.** Per the "No Overengineering" note, anyone using the UI can act as any of the
   4 predefined actors. Flagged explicitly as a risk in the questions below, not silently ignored.

## Trade-offs

- **In-memory store, not a real database.** Fastest to set up and review with zero external
  dependencies, but data is lost on every restart and there's no real concurrency safety. This is the
  top candidate for refactoring (see below) the moment this becomes more than a take-home.
- **Frontend uses a single "Advance to `<next status>`" button instead of a free status dropdown.**
  Since only one forward transition is ever valid at a time, a free dropdown would mostly just create
  more ways to trigger a 400 for no real UX benefit. The backend still independently re-validates every
  transition regardless of what the frontend sends — the frontend constraint is a convenience, not the
  source of truth.
- **Audit history is an inline expandable section per task**, not a separate page, to keep the app to
  one screen and avoid adding client-side routing for a 3–5 hour scope.
- **No automated tests**, given the time box — verified manually instead (see below). Called out as a
  known gap rather than an oversight.

## Manual testing performed

- Create task → starts at `to_do`.
- Valid forward transitions (`to_do → pending → in_progress → done`) each create exactly one audit log
  entry, in order.
- Re-submitting the same status returns `200` with `logCreated: false` and no new log row.
- Skipping a step (e.g. `pending → done`) and submitting an unrecognized actor both return `400` with a
  descriptive error.
- Deleting a task removes it from `GET /tasks` but its `GET /tasks/:id/audit-logs` history still returns
  the original entries.

## What I'd improve with more time

- Automated tests: unit tests for `task.service` (transition rules, idempotency) and integration tests
  for the API routes.
- Swap the in-memory store for a real database (e.g. SQLite/Postgres via Prisma), wrapping
  "validate transition + write status + write audit log" in a single DB transaction — this removes the
  race condition described below, not just the persistence problem.
- Real authentication, so `actor` comes from a session instead of a self-reported dropdown.
- Pagination/filtering on `GET /tasks` and `GET /tasks/:id/audit-logs` for when either list grows large.
- Optimistic UI updates and nicer inline validation states on the frontend.

## Answers

**Bagaimana kamu memastikan audit log tidak ter-modifikasi?**

At the code level, there is no function anywhere in the codebase that updates or deletes an audit log
row. `store.ts` only exposes `appendAuditLog()` and `getAuditLogsByTaskId()` — there's no
`updateAuditLog()` or `deleteAuditLog()` to call, by anyone. No route accepts `PUT`/`PATCH`/`DELETE` on
`/audit-logs`, and there's no route that lets a client create a log directly either — logs are only ever
written as a side effect inside `updateTaskStatus()`, immediately after a transition passes validation.
In a real system backed by an actual database, I'd reinforce this further with an insert-only DB
permission on the audit table, or move to a proper append-only event log if the audit trail became a
core business asset rather than a side feature.

**Bagian mana dari solusi ini yang paling berisiko jika digunakan oleh banyak user?**

The status-update flow has a check-then-act race condition: reading the current status, validating the
transition, and writing the new status + audit log are not atomic. Two near-simultaneous requests for
the same task could both read the same "current status," both pass validation, and both write — leaving
two audit entries and a final state that doesn't clearly reflect which write actually won. With one
in-memory Node process this is unlikely to surface in the scope of this take-home, but it would become a
real problem under genuine concurrent load or once the app runs as more than one instance. The second
biggest risk is the lack of authentication — since `actor` is self-reported from a dropdown, the audit
trail can't actually be trusted as a real accountability record yet.

**Jika task ini berkembang menjadi sistem besar, bagian mana yang akan kamu refactor terlebih dahulu dan
kenapa?**

The persistence layer first. Moving from the in-memory store to a real database with transactional
writes fixes both the data-loss-on-restart problem and the race condition above in a single change, by
wrapping "validate transition → update task → insert audit log" in one DB transaction. Authentication
would be next, since `actor` is the entire point of the audit feature — a self-reported dropdown
undermines that the moment more than one person shares the same browser. After that, I'd consider
splitting the audit log into its own read-optimized store if log volume grew large, since audit data is
written far more often than it's read, but needs to support filtering/search whenever it is read.

## AI usage disclosure

I used an AI assistant (Claude) as a pair-programming aid while building this project. Concretely:

- **Scaffolding and boilerplate** — the initial layered backend structure (routes/controllers/services/store),
  the Vite + React setup, and the CSS were drafted with AI help, then reviewed and adjusted by me.
- **Core domain logic** — `isValidTransition()`, the idempotency check and `logCreated` flag in
  `updateTaskStatus()`, and the deliberately append-only `store.ts` (no update/delete for audit logs)
  were designed together; I made sure I understood *why* each rule lives where it does rather than
  accepting it blindly.
- **README reasoning** — the assumptions, trade-offs, and the three reflection answers were written
  collaboratively and edited to match the choices actually made in the code.

**How I validated it:** I read through every file — especially `task.service.ts` and `store.ts`, where
the transition/idempotency/immutability rules live — and ran the API manually with `curl` to confirm the
behaviour claimed in "Manual testing performed": a valid advance creates exactly one log, re-sending the
same status returns `logCreated: false` with no new log, skipping a step or sending an unknown actor
returns `400`, audit logs come back in chronological order, and there is no route that can modify or
delete a log (`DELETE /tasks/:id/audit-logs` → `404`). Both `backend` and `frontend` also pass
`tsc --noEmit` with no errors. I can explain any line in this repo on request.

> _Note for the candidate: please skim this paragraph and tweak it so it matches your own workflow
> honestly before submitting — the interviewer will expect you to back up whatever it claims._
