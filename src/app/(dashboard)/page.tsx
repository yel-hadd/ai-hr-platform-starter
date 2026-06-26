import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getLang } from "@/lib/lang";
import { T } from "@/lib/i18n";
import { getDirectory, getLeaveBalances, getPendingApprovals } from "@/lib/hr";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarCheck, Plane, Bot, ArrowRight } from "lucide-react";

const ROLE_LABEL_KEYS = {
  EMPLOYEE: "role_employee",
  MANAGER: "role_manager",
  HR_ADMIN: "role_hr_admin",
  SUPER_ADMIN: "role_super_admin",
} as const;

export default async function OverviewPage() {
  const [user, lang] = await Promise.all([requireUser(), getLang()]);
  const t = T[lang] as { [K in keyof typeof T.fr]: string };
  const caller = { role: user.role, employeeId: user.employeeId };

  const [directory, balances, approvals] = await Promise.all([
    getDirectory(caller),
    user.employeeId ? getLeaveBalances(user.employeeId) : Promise.resolve([]),
    getPendingApprovals(caller),
  ]);

  const vacation = balances.find((b) => b.type === "VACATION");

  return (
    <>
      <PageHeader
        title={`${t.dash_welcome}, ${user.name.split(" ")[0]}`}
        description={`${t.dash_signed_as} ${t[ROLE_LABEL_KEYS[user.role]]}. ${t.dash_permissions}`}
      />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<Users className="size-5" />}
            label={can(user.role, "directory:read:all") ? t.dash_people_company : t.dash_people_see}
            value={String(directory.length)}
          />
          <StatCard
            icon={<Plane className="size-5" />}
            label={t.dash_vacation_left}
            value={vacation ? `${vacation.remainingDays}` : "—"}
          />
          {can(user.role, "leave:approve") && (
            <StatCard
              icon={<CalendarCheck className="size-5" />}
              label={t.dash_pending_approvals}
              value={String(approvals.length)}
            />
          )}
        </div>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <CardTitle>{t.dash_ask_ai}</CardTitle>
              <Badge variant="secondary">{t.dash_rbac_badge}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.dash_ai_desc}</p>
            <ul className="grid gap-2 text-sm">
              <li>&middot; &quot;{t.dash_q1}&quot;</li>
              <li>&middot; &quot;{t.dash_q2}&quot;</li>
              <li>&middot; &quot;{t.dash_q3}&quot;</li>
            </ul>
            <Link href="/chat" className={buttonVariants()}>
              {t.dash_open_ai} <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
