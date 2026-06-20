// ─────────────────────────────────────────────────────────────────────────
// Role-aware HR data access. ONE implementation used by both the dashboard
// pages and the AI tools, so the chatbot can never see more than the UI.
// Every function takes the caller's { role, employeeId } and scopes results.
// ─────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { can, type Role } from "@/lib/rbac";

export type Caller = { role: Role; employeeId: string | null };

export type DirectoryEntry = {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  location: string;
  role: Role;
  managerName: string | null;
  isSelf: boolean;
  salary: number | null; // null unless caller may read compensation
};

/** Employees visible to the caller, scoped by role. */
export async function getDirectory(caller: Caller): Promise<DirectoryEntry[]> {
  const seesSalary = can(caller.role, "salary:read:all");

  let where = {};
  if (can(caller.role, "directory:read:all")) {
    where = {};
  } else if (can(caller.role, "directory:read:team")) {
    // Self + direct reports.
    where = {
      OR: [
        { id: caller.employeeId ?? "__none__" },
        { managerId: caller.employeeId ?? "__none__" },
      ],
    };
  } else {
    // Self only.
    where = { id: caller.employeeId ?? "__none__" };
  }

  const rows = await prisma.employee.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, role: true } },
      manager: { include: { user: { select: { name: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return rows.map((e) => ({
    id: e.id,
    name: e.user.name,
    email: e.user.email,
    title: e.title,
    department: e.department,
    location: e.location,
    role: e.user.role as Role,
    managerName: e.manager?.user.name ?? null,
    isSelf: e.id === caller.employeeId,
    salary: seesSalary ? e.salary : null,
  }));
}

export type LeaveBalanceView = {
  type: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
};

export async function getLeaveBalances(employeeId: string): Promise<LeaveBalanceView[]> {
  const balances = await prisma.leaveBalance.findMany({ where: { employeeId } });
  return balances.map((b) => ({
    type: b.type,
    totalDays: b.totalDays,
    usedDays: b.usedDays,
    remainingDays: b.totalDays - b.usedDays,
  }));
}

export type LeaveRequestView = {
  id: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string | null;
};

function toRequestView(r: {
  id: string;
  employee: { user: { name: string } };
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: string;
  reason: string | null;
}): LeaveRequestView {
  return {
    id: r.id,
    employeeName: r.employee.user.name,
    type: r.type,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    days: r.days,
    status: r.status,
    reason: r.reason,
  };
}

/** The caller's own leave requests. */
export async function getMyLeaveRequests(employeeId: string): Promise<LeaveRequestView[]> {
  const rows = await prisma.leaveRequest.findMany({
    where: { employeeId },
    include: { employee: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRequestView);
}

/** Pending requests the caller is allowed to approve (their reports / everyone). */
export async function getPendingApprovals(caller: Caller): Promise<LeaveRequestView[]> {
  if (!can(caller.role, "leave:approve")) return [];

  const where = can(caller.role, "directory:read:all")
    ? { status: "PENDING" as const }
    : {
        status: "PENDING" as const,
        employee: { managerId: caller.employeeId ?? "__none__" },
      };

  const rows = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRequestView);
}
