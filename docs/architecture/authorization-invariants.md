# Authorization invariants — where identity and ids must live

> The contract every AI tool (and data-layer function) must uphold. If you add a
> tool, a permission, or a data helper, this is the checklist. Companion to the
> [sequence diagram](./authorized-ai-chat-sequence.md), which shows the runtime
> flow; this doc states the *rules* that flow must never break.

## The trust boundary

The single most important idea: **the system prompt is not a security control.**
The model can be wrong, can hallucinate ids, and can be steered by a
prompt-injection hidden in a handbook chunk or a user message. So nothing the
model says or passes is trusted. The boundary is **the server-side code that runs
between the model's tool call and the database** — `withPermission`, `can()`, and
the role-scoped `lib/hr` layer. Everything in the prompt (role list, "don't
invent ids", "confirm before writing") is there for *quality and efficiency*, not
safety. You could delete every prompt guideline and no role could read data it
shouldn't.

This is why the demo's three scenarios (authorized / refusal / alert) all reduce
to the same mechanism — the authorized/refusal/alert scenario doc (HARI-41) walks
through them with concrete chat messages.

## The two kinds of identifier

| Kind | Question it answers | Where it must come from | Why |
|---|---|---|---|
| **Identity** | "Who is acting?" | The session, via the closed-over `caller` — **never a tool argument** | If the model could pass `employeeId`, it could act as anyone. So "self" tools (`getLeaveBalance`, self-`getPayslip`, `requestTimeOff`) take **no** id. |
| **Selection** | "Which record?" | A tool argument is fine — but it **must be authorized server-side** against the caller's scope | Selecting another person's payslip or a leave request legitimately needs an id; the server re-checks the id is reachable for this caller. |

`caller` is built once in `src/app/api/chat/route.ts` from the Auth.js session
(`{ role, employeeId, name }`) and captured by `buildHrTools(caller)`. A tool
closure cannot see anything the session didn't put there.

## The five invariants

1. **Identity from the session, never from the model.** Tools read
   `caller.employeeId`; they do not accept it as input. (`route.ts`, `tools.ts`)

2. **One RBAC matrix gates everything.** `lib/rbac.ts` (`ROLE_PERMISSIONS` +
   `can()`) is the only source of "who may do what" — it gates the UI/sidebar,
   the dashboard pages, and the AI tools alike.

3. **One role-scoped data layer.** All *reads* go through `lib/hr.ts`, used by
   both the dashboard pages and the tools, so the chatbot can never return more
   than the UI would for that role. `directoryWhere(caller)` is the single
   "who can this caller see" predicate, shared by `getDirectory` and `getPayslip`.

4. **Every model-supplied id is authorized server-side.** A `requestId` or target
   `employeeId` from the model is validated against the caller's scope before any
   data is returned:
   - `getPayslip` resolves the target with one query that ANDs the id with
     `directoryWhere(caller)` — a guessed/out-of-scope id resolves to nothing.
   - `approveLeave` re-checks `req.employee.managerId === caller.employeeId`
     (unless the caller is company-wide HR) — a manager can't approve a
     non-report's request even though they hold `leave:approve`.
   Both are locked by tests in `tests/tools.integration.test.ts`.

5. **Fail closed, and silently.** There is no free-form / SQL / fetch tool to
   escalate through. On denial a tool returns `{ denied: true }` and touches no
   data. There is no "alert" side channel — deny *is* the alert.

## Checklist — adding a new AI tool

When you add a tool to `buildHrTools`, verify each line:

- [ ] **Identity is not an input.** If the tool acts on "the current user", read
      `caller.employeeId`; do not add an `employeeId` parameter for self-actions.
- [ ] **It declares a permission** and is gated by `withPermission(caller, perm, …)`
      — or, if it needs per-target logic (like self-vs-any), it checks `can()`
      inline *before* any query and returns `deny(perm)` on failure.
- [ ] **Reads go through `lib/hr.ts`.** Don't query `prisma` directly for reads in
      the tool; add or reuse a role-scoped helper so the UI and the tool share one
      scoping implementation. (Writes may live in the tool, but still re-check the
      target — see `approveLeave`.)
- [ ] **Any id argument is authorized against the caller's scope** before
      returning data — never trust that the model "got it from a prior tool".
      Resolve it through `directoryWhere(caller)` or an equivalent scoped query.
- [ ] **Denials return `{ denied: true }`**, never throw, so the UI renders a card
      and the model can explain instead of retrying.
- [ ] **Add a test** for the deny path and (if it takes an id) the
      out-of-scope-id path.

## What is intentionally *not* here

- **Opaque id handles / capability tokens.** A mature multi-tenant system might
  hand the model short session-scoped handles instead of raw cuids, to prevent id
  enumeration and to hide internal ids. We don't, because invariant #4 already
  makes a guessed id useless (it resolves to nothing), and the indirection layer
  would add machinery without closing a real hole in a starter. If this graduates
  to production with untrusted tenants, that's the first upgrade to make — it
  slots in at the tool boundary and the `lib/hr` resolution step.
- **Audit logging / real alerting.** Denials are silent today. If added, the
  single choke point is `withPermission` (and the inline checks in `getPayslip` /
  `approveLeave`) — every denial already passes through there.
