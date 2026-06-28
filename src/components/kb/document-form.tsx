import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DocStatus, DocVisibility } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SlugField } from "@/components/kb/slug-field";
import { ArticleEditor } from "@/components/kb/article-editor";
import { AssistantOverrideField } from "@/components/kb/assistant-override-field";
import { DocumentLifecycle } from "@/components/kb/document-lifecycle";

const VISIBILITIES = Object.values(DocVisibility);

const STATUS_VARIANT: Record<DocStatus, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

type ServerAction = (formData: FormData) => void | Promise<void>;

type Defaults = {
  id?: string;
  title?: string;
  slug?: string;
  content?: string;
  collectionId?: string;
  visibility?: DocVisibility;
  tags?: string[];
  assistantOverride?: boolean | null;
};

const selectClass = "block w-full rounded-md border bg-background px-3 py-2 text-sm";

// Authoring surface: the title + editor are the canvas (left, readable width);
// everything else — Save, lifecycle, and the document settings — lives in a
// sticky sidebar so the primary actions stay reachable while editing a long
// article. On mobile the sidebar moves above the editor (flex-col-reverse) so
// Save and settings are seen first.
export async function DocumentForm({
  action,
  submitLabel,
  collections,
  defaults = {},
  published = false,
  canSetAssistant = false,
  status,
  viewHref,
  lifecycle,
}: {
  action: ServerAction;
  submitLabel: string;
  collections: { id: string; name: string; assistantEnabled: boolean }[];
  defaults?: Defaults;
  published?: boolean;
  canSetAssistant?: boolean;
  status?: DocStatus; // present on edit → renders status + lifecycle in the sidebar
  viewHref?: string; // link to the live article (published docs)
  lifecycle?: { publish: ServerAction; unpublish: ServerAction; archive: ServerAction };
}) {
  const t = await getTranslations("kb");
  const tVis = await getTranslations("kbVisibility");
  const tStatus = await getTranslations("kbStatus");

  const statusNote =
    status === "DRAFT" ? t("draftNotice") : status === "ARCHIVED" ? t("archivedNotice") : null;

  return (
    <form action={action}>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="flex flex-col-reverse gap-6 lg:flex-row lg:gap-8">
        {/* Canvas: title + editor */}
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl space-y-3">
            <input
              name="title"
              defaultValue={defaults.title ?? ""}
              required
              aria-label={t("fieldTitle")}
              placeholder={t("fieldTitle")}
              className="w-full border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/40 focus:ring-0"
            />
            <ArticleEditor name="content" defaultValue={defaults.content ?? ""} />
            <p className="text-xs text-muted-foreground">{t("fieldContentHint")}</p>
          </div>
        </div>

        {/* Settings sidebar (sticky on desktop) */}
        <aside className="lg:w-80 lg:shrink-0">
          <div className="space-y-4 lg:sticky lg:top-6">
            {/* Actions */}
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" className="flex-1">{submitLabel}</Button>
                <ButtonLink href="/kb/admin" size="sm" variant="ghost">{t("cancel")}</ButtonLink>
              </div>

              {status && (
                <>
                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      {t("status")}
                      <Badge variant={STATUS_VARIANT[status]}>{tStatus(status)}</Badge>
                    </span>
                    {viewHref && (
                      <Link href={viewHref} className="text-muted-foreground hover:text-foreground hover:underline">
                        {t("view")}
                      </Link>
                    )}
                  </div>
                  {lifecycle && defaults.id && (
                    <DocumentLifecycle
                      id={defaults.id}
                      status={status}
                      publish={lifecycle.publish}
                      unpublish={lifecycle.unpublish}
                      archive={lifecycle.archive}
                    />
                  )}
                  {statusNote && <p className="text-xs text-muted-foreground">{statusNote}</p>}
                </>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <SlugField
                defaultValue={defaults.slug ?? ""}
                basePath="…/"
                originalSlug={defaults.slug}
                warnOnChange={published}
              />

              <label className="block space-y-1 text-sm">
                <span className="font-medium">{t("fieldCollection")}</span>
                <select name="collectionId" defaultValue={defaults.collectionId ?? ""} required className={selectClass}>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium">{t("fieldVisibility")}</span>
                <select
                  name="visibility"
                  defaultValue={defaults.visibility ?? "ALL_EMPLOYEES"}
                  className={selectClass}
                >
                  {VISIBILITIES.map((v) => (
                    <option key={v} value={v}>{tVis(v)}</option>
                  ))}
                </select>
              </label>

              {canSetAssistant && (
                <AssistantOverrideField
                  collections={collections}
                  defaultCollectionId={defaults.collectionId ?? collections[0]?.id ?? ""}
                  defaultOverride={defaults.assistantOverride ?? null}
                />
              )}

              <label className="block space-y-1 text-sm">
                <span className="font-medium">{t("fieldTags")}</span>
                <Input name="tags" defaultValue={(defaults.tags ?? []).join(", ")} />
                <span className="text-xs text-muted-foreground">{t("fieldTagsHint")}</span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
