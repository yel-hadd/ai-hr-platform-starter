import { requireUser } from "@/lib/session";
import {
  getLeaveBalances,
  getMyLeaveRequests,
  getPendingApprovals,
} from "@/lib/hr";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
};

export default async function TimeOffPage() {
  const user = await requireUser();
  const caller = { role: user.role, employeeId: user.employeeId };

  const [balances, requests, approvals] = await Promise.all([
    user.employeeId ? getLeaveBalances(user.employeeId) : Promise.resolve([]),
    user.employeeId ? getMyLeaveRequests(user.employeeId) : Promise.resolve([]),
    getPendingApprovals(caller),
  ]);

  return (
    <>
      <PageHeader
        title="Time Off"
        description="Tip: request time off or approve requests by asking the AI Assistant."
      />
      <div className="space-y-6 p-4 md:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {balances.map((b) => (
            <Card key={b.type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium capitalize text-muted-foreground">
                  {b.type.toLowerCase()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {b.remainingDays}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {b.totalDays} days
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">My requests</h2>
          <LeaveTable rows={requests} showWho={false} />
        </section>

        {can(user.role, "leave:approve") && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">
              Pending approvals{" "}
              <Badge variant="secondary">{approvals.length}</Badge>
            </h2>
            <LeaveTable rows={approvals} showWho />
          </section>
        )}
      </div>
    </>
  );
}

function LeaveTable({
  rows,
  showWho,
}: {
  rows: {
    id: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
    reason: string | null;
  }[];
  showWho: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </p>
    );
  }
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showWho && <TableHead>Employee</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {showWho && <TableCell className="font-medium">{r.employeeName}</TableCell>}
              <TableCell className="capitalize">{r.type.toLowerCase()}</TableCell>
              <TableCell className="tabular-nums">
                {r.startDate} → {r.endDate}
              </TableCell>
              <TableCell>{r.days}</TableCell>
              <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                {r.reason ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                  {r.status.toLowerCase()}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
