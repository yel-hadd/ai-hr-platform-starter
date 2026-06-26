import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT, useLang } from "@/lib/lang-context";

type Balance = {
  type: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
};

const LEAVE_TYPE_KEYS: Record<string, "leave_vacation" | "leave_sick" | "leave_personal"> = {
  VACATION: "leave_vacation",
  SICK: "leave_sick",
  PERSONAL: "leave_personal",
};

export function LeaveBalances({ balances }: { balances: Balance[] }) {
  const t = useT();
  return (
    <div className="grid grid-cols-3 gap-2">
      {balances.map((b) => {
        const pct = b.totalDays ? (b.remainingDays / b.totalDays) * 100 : 0;
        return (
          <div key={b.type} className="rounded-lg border bg-card p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              {t[LEAVE_TYPE_KEYS[b.type] ?? "leave_vacation"]}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {b.remainingDays}
              <span className="text-xs font-normal text-muted-foreground">
                /{b.totalDays}
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
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

const STATUS_LABEL_KEYS: Record<string, "status_approved" | "status_pending" | "status_rejected"> = {
  APPROVED: "status_approved",
  PENDING: "status_pending",
  REJECTED: "status_rejected",
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
  const t = useT();
  const s = STATUS[request.status] ?? STATUS.PENDING;
  const Icon = s.icon;
  const dayWord = request.days === 1 ? t.leave_day : t.leave_days;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium">
          <CalendarDays className="size-4 text-muted-foreground" />
          {t[LEAVE_TYPE_KEYS[request.type] ?? "leave_vacation"]} &middot; {request.days} {dayWord}
        </span>
        <Badge variant={s.variant}>
          <Icon className={`mr-1 size-3 ${s.cls}`} />
          {t[STATUS_LABEL_KEYS[request.status] ?? "status_pending"]}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {request.startDate} &rarr; {request.endDate}
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
  const t = useT();
  const lang = useLang();
  const s = STATUS[result.status] ?? STATUS.PENDING;
  const Icon = s.icon;
  const dayWord = result.days === 1 ? t.leave_day : t.leave_days;
  const typeLabel = t[LEAVE_TYPE_KEYS[result.type] ?? "leave_vacation"];
  const statusLabel = t[STATUS_LABEL_KEYS[result.status] ?? "status_pending"];

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
      <Icon className={`size-5 ${s.cls}`} />
      {lang === "fr" ? (
        <span>
          La demande de <strong>{result.employeeName}</strong> de {result.days} {dayWord} ({typeLabel}){" "}
          {t.leave_approval_result} <strong>{statusLabel}</strong>.
        </span>
      ) : (
        <span>
          <strong>{result.employeeName}</strong>&apos;s {result.days}-{dayWord} {typeLabel} request{" "}
          {t.leave_approval_result} <strong>{statusLabel}</strong>.
        </span>
      )}
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
  const t = useT();

  if (pending.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        {t.leave_no_pending}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {pending.map((r) => (
        <div key={r.id} className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">{r.employeeName}</span>
            <span className="text-xs text-muted-foreground">
              {t[LEAVE_TYPE_KEYS[r.type] ?? "leave_vacation"]} &middot; {r.days}d
            </span>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {r.startDate} &rarr; {r.endDate}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">id: {r.id}</p>
        </div>
      ))}
    </div>
  );
}
