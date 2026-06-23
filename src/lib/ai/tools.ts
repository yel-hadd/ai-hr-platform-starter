// ─────────────────────────────────────────────────────────────────────────
// AI tools. Guardrails live at TWO levels (see
// docs/architecture/authorization-invariants.md):
//
//   • PROMPT level — the agent is told exactly which tools it has for its role,
//     so it knows what it can and can't do and won't attempt the impossible.
//   • CODE level — four rules, enforced regardless of what the model is told or
//     tricked into:
//       1. IDENTITY comes from the closed-over `caller` (resolved from the
//          session in the route), never a tool argument. "Self" tools take no id.
//       2. EXPOSURE is per role: `buildHrTools` advertises only the tools the
//          caller's role can use (driven by TOOL_CATALOGUE), so an out-of-scope
//          tool is never offered — the model can't even attempt it.
//       3. PERMISSION is still checked before running (defense in depth), and
//          every model-supplied id (employeeId, requestId) is AUTHORIZED
//          server-side against the caller's scope, so a guessed id can't reach
//          data: getPayslip resolves the target within directory scope;
//          approveLeave re-checks the request belongs to the caller's reports.
//       4. Scope refusals return `{ refused, message }` — the model reads the
//          message and works with the authorized data; the UI renders NOTHING
//          for it. So out-of-scope requests never produce a visible error.
//          (Operational problems — bad dates, handbook down — still return
//          `{ error }`, which the UI does show.) Where a parameter would only
//          ever be out of scope for a role, it's dropped from that role's schema
//          entirely (see getPayslip) so the query can't even be expressed.
// All reads go through the same role-scoped helpers as the UI (lib/hr).
// ─────────────────────────────────────────────────────────────────────────
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, PERMISSION_LABELS, type Permission, type Role } from "@/lib/rbac";
import {
  getDirectory,
  getLeaveBalances,
  getPayslip,
  getPendingApprovals,
} from "@/lib/hr";
import { searchHandbook } from "@/lib/rag";

export type ToolCaller = {
  role: Role;
  employeeId: string | null;
  name: string;
};

// A scope refusal. The model reads `message` and works around it in prose; the
// UI renders NOTHING for it (unlike `{ error }`, which is an operational problem
// worth showing). So an out-of-scope request never produces a visible error.
type Refusal = { refused: true; message: string };
function refused(message: string): Refusal {
  return { refused: true, message };
}

/**
 * Run `fn` only if the caller holds `permission`, else return a silent refusal.
 * Defense in depth: `buildHrTools` already declines to advertise a tool the role
 * can't use, so for a correctly-configured role this branch is never reached.
 */
function withPermission<I, O>(
  caller: ToolCaller,
  permission: Permission,
  fn: (input: I) => Promise<O>,
): (input: I) => Promise<O | Refusal> {
  return async (input: I) => {
    if (!can(caller.role, permission)) {
      return refused(`That action isn't available to your role (needs "${PERMISSION_LABELS[permission]}").`);
    }
    return fn(input);
  };
}

// Case-insensitive enum: models sometimes emit "vacation"/"approve" — uppercase
// before validating so we don't hand the user a spurious tool error.
function ciEnum<const T extends [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === "string" ? v.toUpperCase() : v),
    z.enum(values),
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Inclusive day count, or an error string if the range is malformed/reversed —
// so a model passing a non-date or swapped dates fails loudly instead of
// silently recording a 1-day request.
function leaveDays(start: string, end: string): number | { error: string } {
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) {
    return { error: "Dates must be YYYY-MM-DD." };
  }
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { error: "Invalid calendar date." };
  }
  if (endMs < startMs) {
    return { error: "End date must be on or after the start date." };
  }
  return Math.round((endMs - startMs) / 86_400_000) + 1;
}

/**
 * The full tool surface for a caller. NOT exported — callers go through
 * `buildHrTools`, which advertises only the subset the role may use.
 */
function buildAllHrTools(caller: ToolCaller) {
  // Only callers who can read anyone's pay get a target parameter; everyone else
  // gets a self-only payslip tool with no `employeeId` field — so the agent
  // can't even attempt to query another person's payslip.
  const canReadAnyPayslip = can(caller.role, "payslip:read:any");

  return {
    // ── Calendar utilities (no auth, no UI — deterministic date helpers) ─
    getCurrentDateTime: tool({
      description:
        "Get the current date, time, and weekday. The date is also in your system prompt; use this if you need the live time or want to double-check.",
      inputSchema: z.object({}),
      execute: async () => {
        const now = new Date();
        return {
          date: now.toISOString().slice(0, 10),
          weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
          time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      },
    }),

    getDateInfo: tool({
      description:
        "Get the weekday and weekend status of a specific calendar date. Use it to VERIFY the day of week before stating it (e.g. confirm '2026-06-29' really is a Monday).",
      inputSchema: z.object({
        date: z.string().describe("A date in YYYY-MM-DD."),
      }),
      execute: async ({ date }) => {
        if (!ISO_DATE.test(date)) return { error: "Date must be YYYY-MM-DD." };
        const d = new Date(`${date}T00:00:00Z`);
        if (Number.isNaN(d.getTime())) return { error: "Invalid calendar date." };
        const dow = d.getUTCDay();
        return {
          date,
          weekday: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
          isWeekend: dow === 0 || dow === 6,
        };
      },
    }),

    businessDaysBetween: tool({
      description:
        "Count working days (Mon–Fri, inclusive of both ends) in a date range, alongside the total calendar days. Use it to tell the user how many working days a leave range actually spans.",
      inputSchema: z.object({
        startDate: z.string().describe("Start date, YYYY-MM-DD"),
        endDate: z.string().describe("End date, YYYY-MM-DD"),
      }),
      execute: async ({ startDate, endDate }) => {
        if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
          return { error: "Dates must be YYYY-MM-DD." };
        }
        const start = new Date(`${startDate}T00:00:00Z`);
        const end = new Date(`${endDate}T00:00:00Z`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return { error: "Invalid calendar date." };
        }
        if (end < start) return { error: "End date must be on or after the start date." };

        let businessDays = 0;
        const cur = new Date(start);
        while (cur <= end) {
          const dow = cur.getUTCDay();
          if (dow !== 0 && dow !== 6) businessDays++;
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
        const calendarDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
        return { startDate, endDate, calendarDays, businessDays };
      },
    }),

    // ── RAG over the handbook ───────────────────────────────────────────
    searchHandbook: tool({
      description:
        "Search the company employee handbook for policies (leave, benefits, conduct, remote work, etc.). Use this for any HR policy question and cite the returned sections.",
      inputSchema: z.object({
        query: z.string().describe("The policy question or topic to look up."),
      }),
      execute: withPermission(caller, "handbook:read", async ({ query }) => {
        try {
          const results = await searchHandbook(query, 4);
          return { query, results };
        } catch {
          // Most likely no embedding API key configured (or handbook not seeded).
          return {
            query,
            results: [],
            error:
              "Handbook search is unavailable — check the embedding provider key and re-seed.",
          };
        }
      }),
    }),

    // ── Directory (role-scoped rows) ────────────────────────────────────
    getEmployeeDirectory: tool({
      description:
        "List employees the current user is allowed to see (self, team, or whole company depending on role). Optionally filter by name, department, or title.",
      inputSchema: z.object({
        filter: z
          .string()
          .nullish()
          .describe("Optional case-insensitive substring to filter by."),
      }),
      execute: withPermission(caller, "directory:read:self", async ({ filter }) => {
        let people = await getDirectory(caller);
        if (filter) {
          const f = filter.toLowerCase();
          people = people.filter((p) =>
            [p.name, p.department, p.title].some((v) =>
              v.toLowerCase().includes(f),
            ),
          );
        }
        return { count: people.length, people };
      }),
    }),

    // ── Leave balance ───────────────────────────────────────────────────
    getLeaveBalance: tool({
      description: "Get the current user's remaining time-off balances.",
      inputSchema: z.object({}),
      execute: withPermission(caller, "leave:read:self", async () => {
        if (!caller.employeeId) return { balances: [] };
        const balances = await getLeaveBalances(caller.employeeId);
        return { balances };
      }),
    }),

    // ── Request time off ────────────────────────────────────────────────
    requestTimeOff: tool({
      description:
        "Submit a time-off request for the current user. Dates are YYYY-MM-DD. Confirm the dates with the user before submitting.",
      inputSchema: z.object({
        type: ciEnum(["VACATION", "SICK", "PERSONAL"]),
        startDate: z.string().describe("Start date, YYYY-MM-DD"),
        endDate: z.string().describe("End date, YYYY-MM-DD"),
        reason: z.string().nullish(),
      }),
      execute: withPermission(
        caller,
        "leave:request",
        async ({ type, startDate, endDate, reason }) => {
          if (!caller.employeeId)
            return { error: "No employee profile linked to this account." };
          const days = leaveDays(startDate, endDate);
          if (typeof days !== "number") return days; // { error }
          const created = await prisma.leaveRequest.create({
            data: {
              employeeId: caller.employeeId,
              type,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              days,
              reason,
              status: "PENDING",
            },
          });
          return {
            request: {
              id: created.id,
              type,
              startDate,
              endDate,
              days,
              reason: reason ?? null,
              status: "PENDING" as const,
            },
          };
        },
      ),
    }),

    // ── List pending approvals (manager / HR) ───────────────────────────
    listPendingApprovals: tool({
      description:
        "List time-off requests awaiting the current user's approval (their reports, or everyone for HR/admins).",
      inputSchema: z.object({}),
      execute: withPermission(caller, "leave:approve", async () => {
        const pending = await getPendingApprovals(caller);
        return { count: pending.length, pending };
      }),
    }),

    // ── Approve / reject (manager / HR) ─────────────────────────────────
    approveLeave: tool({
      description:
        "Approve or reject a pending time-off request by id. Use listPendingApprovals first to get ids.",
      inputSchema: z.object({
        requestId: z.string(),
        decision: ciEnum(["APPROVE", "REJECT"]),
      }),
      execute: withPermission(caller, "leave:approve", async ({ requestId, decision }) => {
        const req = await prisma.leaveRequest.findUnique({
          where: { id: requestId },
          include: { employee: { include: { user: { select: { name: true } } } } },
        });
        if (!req) return { error: "Request not found." };

        // Managers may only act on their own reports. (A manager is offered this
        // tool, but a requestId outside their team is still refused here.)
        const companyWide = can(caller.role, "directory:read:all");
        if (!companyWide && req.employee.managerId !== caller.employeeId) {
          return refused("That request is for someone outside your team, so you can't action it.");
        }

        // Only act on PENDING requests — re-approving would double-deduct the
        // balance, and reverting an APPROVED request would need a refund path.
        if (req.status !== "PENDING") {
          return {
            error: `Request is already ${req.status.toLowerCase()} and can't be changed.`,
          };
        }

        const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
        await prisma.leaveRequest.update({
          where: { id: requestId },
          data: { status, approverId: caller.employeeId },
        });

        // Deduct balance on approval.
        if (status === "APPROVED") {
          await prisma.leaveBalance.updateMany({
            where: { employeeId: req.employeeId, type: req.type },
            data: { usedDays: { increment: req.days } },
          });
        }

        return {
          result: {
            id: req.id,
            employeeName: req.employee.user.name,
            type: req.type,
            days: req.days,
            status,
          },
        };
      }),
    }),

    // ── Payslip ─────────────────────────────────────────────────────────
    // Role-aware: elevated callers get an `employeeId` target; everyone else
    // gets a self-only tool with no target field, so the agent only ever has
    // access to its own pay — no out-of-scope query is even expressible.
    getPayslip: canReadAnyPayslip
      ? tool({
          description:
            "Get a payslip summary for an employee you can see. Omit employeeId for your own; to view someone else's, pass an employeeId returned by getEmployeeDirectory (never a guessed one).",
          inputSchema: z.object({
            employeeId: z
              .string()
              .nullish()
              .describe("An employeeId returned by getEmployeeDirectory — omit for your own."),
          }),
          execute: async ({ employeeId }) => {
            const result = await getPayslip(caller, employeeId);
            if (result.ok) return { payslip: result.payslip };
            return refused("No payslip found for an employee you can view.");
          },
        })
      : tool({
          description: "Get the current user's own payslip summary.",
          inputSchema: z.object({}),
          execute: async () => {
            const result = await getPayslip(caller); // self only — no target accepted
            if (result.ok) return { payslip: result.payslip };
            return refused("No payslip is linked to your account.");
          },
        }),
  };
}

type AllHrTools = ReturnType<typeof buildAllHrTools>;
type ToolName = keyof AllHrTools;

/**
 * The tool catalogue: every tool and the permission that gates ADVERTISING it.
 * The single source of "which tools does each role get" — used to expose tools
 * per role (below) and to document the surface (settings page / docs). To add a
 * tool: define it in buildAllHrTools and add one row here. `permission: null`
 * marks a utility tool with no data access (e.g. the calendar) that every role
 * always gets.
 */
export const TOOL_CATALOGUE = [
  { name: "getCurrentDateTime", permission: null, summary: "The current date, time, and weekday (utility)." },
  { name: "getDateInfo", permission: null, summary: "Weekday / weekend status for a given date (utility)." },
  { name: "businessDaysBetween", permission: null, summary: "Working-day count between two dates (utility)." },
  { name: "searchHandbook", permission: "handbook:read", summary: "Search the employee handbook (RAG) and cite sections." },
  { name: "getEmployeeDirectory", permission: "directory:read:self", summary: "List employees the caller is allowed to see." },
  { name: "getLeaveBalance", permission: "leave:read:self", summary: "The caller's own time-off balances." },
  { name: "requestTimeOff", permission: "leave:request", summary: "Submit a time-off request for the caller." },
  { name: "listPendingApprovals", permission: "leave:approve", summary: "List requests awaiting the caller's approval." },
  { name: "approveLeave", permission: "leave:approve", summary: "Approve or reject a pending request." },
  { name: "getPayslip", permission: "payslip:read:self", summary: "A payslip — own, or anyone visible with elevated rights." },
] as const satisfies readonly { name: ToolName; permission: Permission | null; summary: string }[];

/** Does this role get the catalogue entry? `null` permission = always (utility). */
function roleHasTool(role: Role, permission: Permission | null): boolean {
  return permission === null || can(role, permission);
}

/** Tool names a role is offered — handy for the settings UI and tests. */
export function toolsForRole(role: Role): ToolName[] {
  return TOOL_CATALOGUE.filter((t) => roleHasTool(role, t.permission)).map((t) => t.name);
}

/**
 * Tools advertised to the model for this caller: ONLY the ones the role can use.
 * Irrelevant tools are never injected, so the model can't see, attempt, or be
 * tricked into calling something out of scope — and no "permission denied" ever
 * needs to surface. This is the primary guardrail; the per-tool checks inside
 * each tool are defense in depth.
 */
export function buildHrTools(caller: ToolCaller): Partial<AllHrTools> {
  const all = buildAllHrTools(caller);
  const allowed = TOOL_CATALOGUE.filter((t) => roleHasTool(caller.role, t.permission)).map(
    (t) => [t.name, all[t.name]] as const,
  );
  return Object.fromEntries(allowed) as Partial<AllHrTools>;
}

export type HrTools = Partial<AllHrTools>;
