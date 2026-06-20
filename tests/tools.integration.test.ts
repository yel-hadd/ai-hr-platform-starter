import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildHrTools, type ToolCaller } from "@/lib/ai/tools";

// Minimal ToolCallOptions stub for invoking tool.execute directly.
const OPTS = { toolCallId: "test", messages: [] } as never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function call(t: any, input: unknown) {
  return t.execute(input, OPTS);
}

const callers: Record<string, ToolCaller> = {};

beforeAll(async () => {
  const users = await prisma.user.findMany({
    where: {
      email: { in: ["employee@acme.test", "manager@acme.test", "hr@acme.test"] },
    },
    include: { employee: { select: { id: true } } },
  });
  for (const u of users) {
    const key = u.email.split("@")[0];
    callers[key] = {
      role: u.role,
      employeeId: u.employee!.id,
      name: u.name,
    };
  }
});

afterAll(() => prisma.$disconnect());

describe("getEmployeeDirectory — role scoping", () => {
  it("employee sees only themselves, with salary hidden", async () => {
    const tools = buildHrTools(callers.employee);
    const out = await call(tools.getEmployeeDirectory, {});
    expect(out.count).toBe(1);
    expect(out.people[0].isSelf).toBe(true);
    expect(out.people[0].salary).toBeNull();
  });

  it("manager sees self + direct reports, salary still hidden", async () => {
    const tools = buildHrTools(callers.manager);
    const out = await call(tools.getEmployeeDirectory, {});
    expect(out.count).toBe(4); // Marcus + Erin + Nina + Omar
    expect(out.people.every((p: { salary: number | null }) => p.salary === null)).toBe(true);
  });

  it("HR sees the whole company with salaries visible", async () => {
    const tools = buildHrTools(callers.hr);
    const out = await call(tools.getEmployeeDirectory, {});
    expect(out.count).toBe(6);
    expect(out.people.some((p: { salary: number | null }) => typeof p.salary === "number")).toBe(true);
  });
});

describe("getPayslip — self vs anyone", () => {
  it("employee can view their own payslip", async () => {
    const tools = buildHrTools(callers.employee);
    const out = await call(tools.getPayslip, {});
    expect(out.payslip).toBeDefined();
    expect(out.payslip.netMonthly).toBeGreaterThan(0);
  });

  it("employee is DENIED viewing someone else's payslip", async () => {
    const tools = buildHrTools(callers.employee);
    const out = await call(tools.getPayslip, { employeeName: "Marcus" });
    expect(out.denied).toBe(true);
    expect(out.permission).toBe("payslip:read:any");
  });

  it("HR can view anyone's payslip", async () => {
    const tools = buildHrTools(callers.hr);
    const out = await call(tools.getPayslip, { employeeName: "Erin" });
    expect(out.payslip?.employeeName).toContain("Erin");
  });
});

describe("approvals — permission gating", () => {
  it("employee is DENIED listing pending approvals", async () => {
    const tools = buildHrTools(callers.employee);
    const out = await call(tools.listPendingApprovals, {});
    expect(out.denied).toBe(true);
    expect(out.permission).toBe("leave:approve");
  });

  it("manager sees pending approvals for their reports", async () => {
    const tools = buildHrTools(callers.manager);
    const out = await call(tools.listPendingApprovals, {});
    expect(out.count).toBeGreaterThanOrEqual(2); // Erin + Nina seeded
    const names = out.pending.map((p: { employeeName: string }) => p.employeeName);
    expect(names).toContain("Erin Employee");
  });

  it("employee is DENIED approving leave", async () => {
    const tools = buildHrTools(callers.employee);
    const out = await call(tools.approveLeave, { requestId: "x", decision: "APPROVE" });
    expect(out.denied).toBe(true);
  });
});

describe("tool input schemas — tolerant of model quirks", () => {
  it("accepts lowercase enum values (case-insensitive)", () => {
    const tools = buildHrTools(callers.employee);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = (tools.requestTimeOff as any).inputSchema.parse({
      type: "vacation",
      startDate: "2026-09-01",
      endDate: "2026-09-02",
    });
    expect(parsed.type).toBe("VACATION");
  });

  it("accepts null for optional fields (not just undefined)", () => {
    const tools = buildHrTools(callers.employee);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (tools.getPayslip as any).inputSchema.parse({ employeeName: null })).not.toThrow();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => (tools.getEmployeeDirectory as any).inputSchema.parse({ filter: null })).not.toThrow();
  });
});

describe("requestTimeOff — write path", () => {
  it("employee can submit a request; days are computed and status is PENDING", async () => {
    const tools = buildHrTools(callers.employee);
    const out = await call(tools.requestTimeOff, {
      type: "VACATION",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
    });
    expect(out.request.status).toBe("PENDING");
    expect(out.request.days).toBe(3);

    // Cleanup so re-runs stay deterministic.
    await prisma.leaveRequest.delete({ where: { id: out.request.id } });
  });
});
