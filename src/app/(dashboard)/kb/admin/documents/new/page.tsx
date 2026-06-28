import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listCollectionsForAdmin } from "@/lib/kb";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/kb/document-form";
import { createDocumentAction } from "../../actions";

export default async function NewDocumentPage() {
  const user = await requireUser();
  if (!can(user.role, "kb:manage")) redirect("/");
  const t = await getTranslations("kb");
  const collections = await listCollectionsForAdmin({ role: user.role });

  return (
    <>
      <PageHeader title={t("newDocument")} description={t("draftNotice")} />
      <div className="p-4 md:p-8">
        <DocumentForm
          action={createDocumentAction}
          submitLabel={t("createDocument")}
          canSetAssistant={can(user.role, "admin:settings")}
          collections={collections.map((c) => ({
            id: c.id,
            name: c.name,
            assistantEnabled: c.assistantEnabled,
          }))}
        />
      </div>
    </>
  );
}
