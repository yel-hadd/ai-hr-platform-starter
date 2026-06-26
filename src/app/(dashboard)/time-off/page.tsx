import { requireUser } from "@/lib/session";
import { getLang } from "@/lib/lang";
import { T, type Translations } from "@/lib/i18n";
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

const LEAVE_TYPE_KEYS: Record<string, keyof Translations> = {
  VACATION: "leave_vacation",
  SICK: "leave_sick",
  PERSONAL: "leave_personal",
};

const STATUS_KEYS: Record<string, keyof Translations> = {
  APPROVED: "status_approved",
  PENDING: "status_pending",
  REJECTED: "status_rejected",
};

export default async function TimeOffPage() {
  const [user, lang] = await Promise.all([requireUser(), getLang()]);
  const t = T[lang] as Translations;
  const caller = { role: user.role, employeeId: user.employeeId };

  const [balances, requests, approvals] = await Promise.all([
    user.employeeId ? getLeaveBalances(user.employeeId) : Promise.resolve([]),
    user.employeeId ? getMyLeaveRequests(user.employeeId) : Promise.resolve([]),
    getPendingApprovals(caller),
  ]);

  return (
    <>
      <PageHeader title={t.timeoff_title} description={t.timeoff_tip} />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {balances.map((b) => (
            <Card key={b.type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t[LEAVE_TYPE_KEYS[b.type] ?? "leave_vacation"]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {b.remainingDays}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}/ {b.totalDays} {t.timeoff_days_unit}
                  </span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t.timeoff_my_requests}</h2>
          <LeaveTable rows={requests} showWho={false} t={t} />
        </section>

        {can(user.role, "leave:approve") && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">
              {t.timeoff_pending}{" "}
              <Badge variant="secondary">{approvals.length}</Badge>
            </h2>
            <LeaveTable rows={approvals} showWho t={t} />
          </section>
        )}
      </div>
    </>
  );
}

function LeaveTable({
  rows,
  showWho,
  t,
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
  t: Translations;
}) {
  const LEAVE_TYPE_KEYS: Record<string, keyof Translations> = {
    VACATION: "leave_vacation",
    SICK: "leave_sick",
    PERSONAL: "leave_personal",
  };
  const STATUS_KEYS: Record<string, keyof Translations> = {
    APPROVED: "status_approved",
    PENDING: "status_pending",
    REJECTED: "status_rejected",
  };

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t.timeoff_nothing}
      </p>
    );
  }
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showWho && <TableHead>{t.timeoff_employee}</TableHead>}
            <TableHead>{t.timeoff_type}</TableHead>
            <TableHead>{t.timeoff_dates}</TableHead>
            <TableHead>{t.timeoff_days_col}</TableHead>
            <TableHead>{t.timeoff_reason}</TableHead>
            <TableHead className="text-right">{t.timeoff_status}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {showWho && <TableCell className="font-medium">{r.employeeName}</TableCell>}
              <TableCell>{t[LEAVE_TYPE_KEYS[r.type] ?? "leave_vacation"]}</TableCell>
              <TableCell className="tabular-nums">
                {r.startDate} &rarr; {r.endDate}
              </TableCell>
              <TableCell>{r.days}</TableCell>
              <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                {r.reason ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                  {t[STATUS_KEYS[r.status] ?? "status_pending"]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
