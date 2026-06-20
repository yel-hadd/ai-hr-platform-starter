import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getDirectory, getLeaveBalances, getPendingApprovals } from "@/lib/hr";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarCheck, Plane, Bot, ArrowRight } from "lucide-react";

export default async function OverviewPage() {
  const user = await requireUser();
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
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`You're signed in as ${ROLE_LABELS[user.role]}. What you see below is shaped by your permissions.`}
      />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<Users className="size-5" />}
            label={can(user.role, "directory:read:all") ? "People in company" : "People you can see"}
            value={String(directory.length)}
          />
          <StatCard
            icon={<Plane className="size-5" />}
            label="Vacation days left"
            value={vacation ? `${vacation.remainingDays}` : "—"}
          />
          {can(user.role, "leave:approve") && (
            <StatCard
              icon={<CalendarCheck className="size-5" />}
              label="Pending approvals"
              value={String(approvals.length)}
            />
          )}
        </div>

        {/* The hero of the starter: the AI assistant. */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              <CardTitle>Ask the AI Assistant</CardTitle>
              <Badge variant="secondary">RBAC-aware</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The assistant answers handbook questions with citations (RAG), runs
              HR actions through permission-checked tools, streams its reasoning,
              and renders rich results inline. Try one of these:
            </p>
            <ul className="grid gap-2 text-sm">
              <li>· “What’s our parental leave policy?”</li>
              <li>· “Show me the team directory.”</li>
              <li>· “How many vacation days do I have left, and request 2 of them next Monday.”</li>
            </ul>
            <Link href="/chat" className={buttonVariants()}>
              Open AI Assistant <ArrowRight className="size-4" />
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
        <div className="rounded-lg bg-muted p-3 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
