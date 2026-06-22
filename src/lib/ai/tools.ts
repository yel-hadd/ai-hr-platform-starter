// ─────────────────────────────────────────────────────────────────────────
// AI tools. Three rules keep these safe regardless of what the model is told
// or tricked into (see docs/architecture/authorization-invariants.md):
//   1. IDENTITY comes from the closed-over `caller` (resolved from the session
//      in the route), never from a tool argument — the model can't act as
//      someone else. That's why "self" tools take no id.
//   2. PERMISSION is checked BEFORE running: most tools use `withPermission()`;
//      getPayslip delegates to lib/hr which checks inline (it picks self vs any).
//      On denial a tool returns `{ denied: true, ... }` (not a throw) so the UI
//      shows a "permission denied" card and the model can explain it.
//   3. Every model-supplied id (employeeId, requestId) is AUTHORIZED server-side
//      against the caller's scope, so a guessed/invented id can't reach data:
//      getPayslip resolves the target within the caller's directory scope;
//      approveLeave re-checks the request belongs to the caller's reports.
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

type Denied = { denied: true; permission: Permission; reason: string };

function deny(permission: Permission): Denied {
  return {
    denied: true,
    permission,
    reason: `Access denied — your role lacks "${PERMISSION_LABELS[permission]}".`,
  };
}

/** Run `fn` only if the caller holds `permission`, else return a denial. */
function withPermission<I, O>(
  caller: ToolCaller,
  permission: Permission,
  fn: (input: I) => Promise<O>,
): (input: I) => Promise<O | Denied> {
  return async (input: I) => {
    if (!can(caller.role, permission)) return deny(permission);
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

export function buildHrTools(caller: ToolCaller) {
  return {
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

        // Managers may only act on their own reports.
        const companyWide = can(caller.role, "directory:read:all");
        if (!companyWide && req.employee.managerId !== caller.employeeId) {
          return deny("leave:approve");
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

    // ── Payslip (self vs anyone) ────────────────────────────────────────
    getPayslip: tool({
      description:
        "Get a payslip summary. Omit employeeId for your own. To view someone else's (requires elevated permissions), first call getEmployeeDirectory and pass an employeeId it returned — never guess or invent an id.",
      inputSchema: z.object({
        employeeId: z
          .string()
          .nullish()
          .describe(
            "An employeeId returned by getEmployeeDirectory — omit for your own. Out-of-scope or invented ids are rejected.",
          ),
      }),
      // Delegates to the role-scoped data layer (lib/hr): the target is resolved
      // server-side within the caller's directory scope, so a guessed id can
      // never surface a real payslip.
      execute: async ({ employeeId }) => {
        const result = await getPayslip(caller, employeeId);
        if (result.ok) return { payslip: result.payslip };
        if (result.reason === "denied") return deny(result.permission);
        return { error: "No payslip found for an employee you're allowed to view." };
      },
    }),
  };
}

export type HrTools = ReturnType<typeof buildHrTools>;
