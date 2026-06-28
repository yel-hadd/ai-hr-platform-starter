import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getDocumentForAdmin, listCollectionsForAdmin } from "@/lib/kb";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentForm } from "@/components/kb/document-form";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import {
  updateDocumentAction,
  publishDocumentAction,
  unpublishDocumentAction,
  archiveDocumentAction,
} from "../../actions";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!can(user.role, "kb:manage")) redirect("/");
  const { id } = await params;
  const caller = { role: user.role };

  const [doc, collections] = await Promise.all([
    getDocumentForAdmin(caller, id),
    listCollectionsForAdmin(caller),
  ]);
  if (!doc) notFound();

  const t = await getTranslations("kb");
  const tStatus = await getTranslations("kbStatus");

  const statusVariant =
    doc.status === "PUBLISHED" ? "default" : doc.status === "DRAFT" ? "secondary" : "outline";
  const notice =
    doc.status === "DRAFT" ? t("draftNotice") : doc.status === "ARCHIVED" ? t("archivedNotice") : null;

  return (
    <>
      <PageHeader title={t("editDocument")}>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant}>{tStatus(doc.status)}</Badge>
          {doc.status === "PUBLISHED" && (
            <ButtonLink
              href={`/kb/${doc.collection.slug}/${doc.slug}`}
              size="sm"
              variant="outline"
            >
              {t("view")}
            </ButtonLink>
          )}
        </div>
      </PageHeader>

      <div className="space-y-5 p-4 md:p-8">
        {notice && (
          <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
            {notice}
          </p>
        )}

        {/* Lifecycle */}
        <div className="flex flex-wrap items-center gap-2">
          {doc.status !== "PUBLISHED" && (
            <form action={publishDocumentAction}>
              <input type="hidden" name="id" value={doc.id} />
              <Button type="submit" size="sm">{t("publish")}</Button>
            </form>
          )}
          {doc.status === "PUBLISHED" && (
            <form action={unpublishDocumentAction}>
              <input type="hidden" name="id" value={doc.id} />
              <Button type="submit" size="sm" variant="outline">{t("unpublish")}</Button>
            </form>
          )}
          {doc.status !== "ARCHIVED" && (
            <form action={archiveDocumentAction}>
              <input type="hidden" name="id" value={doc.id} />
              <Button type="submit" size="sm" variant="outline">{t("archive")}</Button>
            </form>
          )}
        </div>

        <DocumentForm
          action={updateDocumentAction}
          submitLabel={t("save")}
          published={doc.status === "PUBLISHED"}
          collections={collections.map((c) => ({ id: c.id, name: c.name }))}
          defaults={{
            id: doc.id,
            title: doc.title,
            slug: doc.slug,
            content: doc.content,
            collectionId: doc.collectionId,
            visibility: doc.visibility,
            tags: doc.tags,
          }}
        />
      </div>
    </>
  );
}
