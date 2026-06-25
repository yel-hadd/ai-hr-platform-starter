import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Balance = {
  type: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
};

export function LeaveBalances({ balances }: { balances: Balance[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {balances.map((b) => {
        const pct = b.totalDays ? (b.remainingDays / b.totalDays) * 100 : 0;
        return (
          <div key={b.type} className="rounded-lg border bg-card p-3 text-sm">
            <p className="text-xs capitalize text-muted-foreground">
              {b.type.toLowerCase()}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {b.remainingDays}
              <span className="text-xs font-normal text-muted-foreground">
                /{b.totalDays}
              </span>
            </p>
            <div
              role="progressbar"
              aria-valuenow={b.remainingDays}
              aria-valuemin={0}
              aria-valuemax={b.totalDays}
              aria-label={`${b.type.toLowerCase()} days remaining`}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS = {
  PENDING: { icon: Clock, cls: "text-amber-600", variant: "secondary" as const },
  APPROVED: { icon: CheckCircle2, cls: "text-green-600", variant: "default" as const },
  REJECTED: { icon: XCircle, cls: "text-destructive", variant: "destructive" as const },
};

export function LeaveRequestCard({
  request,
}: {
  request: {
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string | null;
    status: keyof typeof STATUS;
  };
}) {
  const s = STATUS[request.status] ?? STATUS.PENDING;
  const Icon = s.icon;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium capitalize">
          <CalendarDays className="size-4 text-muted-foreground" />
          {request.type.toLowerCase()} · {request.days} day{request.days > 1 ? "s" : ""}
        </span>
        <Badge variant={s.variant} className="capitalize">
          <Icon className={`mr-1 size-3 ${s.cls}`} />
          {request.status.toLowerCase()}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {request.startDate} → {request.endDate}
      </p>
      {request.reason && <p className="mt-1 text-xs">{request.reason}</p>}
    </div>
  );
}

export function ApprovalResultCard({
  result,
}: {
  result: {
    employeeName: string;
    type: string;
    days: number;
    status: keyof typeof STATUS;
  };
}) {
  const s = STATUS[result.status] ?? STATUS.PENDING;
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
      <Icon className={`size-5 ${s.cls}`} />
      <span>
        <span className="font-medium">{result.employeeName}</span>’s {result.days}-day{" "}
        {result.type.toLowerCase()} request was{" "}
        <span className="font-medium lowercase">{result.status}</span>.
      </span>
    </div>
  );
}

export function PendingApprovals({
  pending,
}: {
  pending: {
    id: string;
    employeeName: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string | null;
  }[];
}) {
  if (pending.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        No requests awaiting approval.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {pending.map((r) => (
        <div key={r.id} className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{r.employeeName}</span>
            <span className="text-xs capitalize text-muted-foreground">
              {r.type.toLowerCase()} · {r.days}d
            </span>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {r.startDate} → {r.endDate}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">id: {r.id}</p>
        </div>
      ))}
    </div>
  );
}
