import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getOrgSettings } from "@/lib/settings";
import { getPendingApprovals, getMyLeaveRequests } from "@/lib/hr";
import { OrgSettingsProvider } from "@/components/org-settings-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { AppNotification } from "@/components/layout/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(); // redirects to /login if signed out
  const nav = { name: user.name, email: user.email, role: user.role };
  const caller = { role: user.role, employeeId: user.employeeId };
  const t = await getTranslations("nav");
  const tTop = await getTranslations("topbar");
  const orgSettings = await getOrgSettings();

  // Real, role-scoped notifications for the bell.
  const [approvals, myRequests] = await Promise.all([
    getPendingApprovals(caller),
    user.employeeId ? getMyLeaveRequests(user.employeeId) : Promise.resolve([]),
  ]);
  const myPending = myRequests.filter((r) => r.status === "PENDING");

  const notifications: AppNotification[] = [];
  if (approvals.length > 0) {
    notifications.push({
      id: "approvals",
      title: tTop("approvals", { count: approvals.length }),
      description: tTop("approvalsDesc"),
      href: "/time-off",
    });
  }
  if (myPending.length > 0) {
    notifications.push({
      id: "my-pending",
      title: tTop("myPending"),
      description: tTop("myPendingDesc", { count: myPending.length }),
      href: "/time-off",
    });
  }

  return (
    <OrgSettingsProvider value={orgSettings}>
      <div className="flex h-dvh overflow-hidden">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          {t("skipToContent")}
        </a>
        <Sidebar user={nav} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar user={nav} notifications={notifications} />
          <main
            id="main"
            tabIndex={0}
            aria-label={t("mainContent")}
            className="flex-1 overflow-y-auto bg-muted/30"
          >
            {children}
          </main>
        </div>
      </div>
    </OrgSettingsProvider>
  );
}
