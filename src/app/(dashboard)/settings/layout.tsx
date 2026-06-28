import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

// One guard for every settings sub-page (defense in depth: data-layer fns + server
// actions re-check too). The persistent side-nav lives here so it's shared across
// all categories.
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!can(user.role, "admin:settings")) redirect("/");

  const t = await getTranslations("settings");

  return (
    <>
      <PageHeader title={t("title")} description={t("overviewDescription")} />
      <div className="flex flex-col gap-6 p-4 md:flex-row md:gap-8 md:p-8">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </>
  );
}
