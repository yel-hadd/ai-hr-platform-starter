import { getPendingApprovals, getMyLeaveRequests } from "@/lib/hr";
import type { Role } from "@/lib/rbac";

// Structured bell items — role-scoped, deduped, NOT localized. The client
// (components/layout/notifications.tsx) formats the title/description with the
// active locale so the API stays locale-agnostic.
export type NotificationItem = {
  id: string;
  kind: "approval" | "mine";
  employeeName?: string;
  leaveType: "VACATION" | "SICK" | "PERSONAL";
  startDate: string;
  endDate: string;
  href: string;
};

export async function buildNotifications(caller: {
  role: Role;
  employeeId: string | null;
}): Promise<NotificationItem[]> {
  const [approvals, myRequests] = await Promise.all([
    getPendingApprovals(caller),
    caller.employeeId ? getMyLeaveRequests(caller.employeeId) : Promise.resolve([]),
  ]);

  const myPending = myRequests.filter((r) => r.status === "PENDING");
  // HR/Admin approvers see all pending requests, which can include their own —
  // don't surface those as "to approve" too (they appear under "my pending").
  const myPendingIds = new Set(myPending.map((r) => r.id));

  return [
    ...approvals
      .filter((a) => !myPendingIds.has(a.id))
      .map((a): NotificationItem => ({
        id: `approval-${a.id}`,
        kind: "approval",
        employeeName: a.employeeName,
        leaveType: a.type as NotificationItem["leaveType"],
        startDate: a.startDate,
        endDate: a.endDate,
        href: "/time-off",
      })),
    ...myPending.map((r): NotificationItem => ({
      id: `mine-${r.id}`,
      kind: "mine",
      leaveType: r.type as NotificationItem["leaveType"],
      startDate: r.startDate,
      endDate: r.endDate,
      href: "/time-off",
    })),
  ];
}
