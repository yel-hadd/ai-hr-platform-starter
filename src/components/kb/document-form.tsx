import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DocStatus, DocVisibility } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { SlugField } from "@/components/kb/slug-field";
import { ArticleEditor } from "@/components/kb/article-editor";
import { AssistantOverrideField } from "@/components/kb/assistant-override-field";
import { DocumentLifecycle } from "@/components/kb/document-lifecycle";
import { PillRadioGroup } from "@/components/kb/pill-radio-group";
import { TagInput } from "@/components/kb/tag-input";

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

// Authoring surface modelled on a help-center editor (e.g. Zendesk Guide): the
// title + content are the canvas (left, scrolls independently); a full-height
// "Article settings" rail on the right holds the document settings (scrollable)
// with Cancel/Save pinned to the bottom. On mobile the rail stacks above the
// canvas and the page scrolls normally.
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
  collections: { id: string; name: string; slug: string; assistantEnabled: boolean }[];
  defaults?: Defaults;
  published?: boolean;
  canSetAssistant?: boolean;
  status?: DocStatus;
  viewHref?: string;
  lifecycle?: { publish: ServerAction; unpublish: ServerAction; archive: ServerAction };
}) {
  const t = await getTranslations("kb");
  const tVis = await getTranslations("kbVisibility");
  const tStatus = await getTranslations("kbStatus");

  const statusNote =
    status === "DRAFT" ? t("draftNotice") : status === "ARCHIVED" ? t("archivedNotice") : null;

  return (
    <form action={action} className="flex flex-col-reverse lg:min-h-0 lg:flex-1 lg:flex-row">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      {/* Canvas — title + editor, scrolls on its own at lg */}
      <div className="min-w-0 lg:flex-1 lg:overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-3 p-4 md:p-8">
          {status && (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  {t("status")}
                  <Badge variant={STATUS_VARIANT[status]}>{tStatus(status)}</Badge>
                </span>
                {lifecycle && defaults.id && (
                  <DocumentLifecycle
                    id={defaults.id}
                    status={status}
                    publish={lifecycle.publish}
                    unpublish={lifecycle.unpublish}
                    archive={lifecycle.archive}
                  />
                )}
                {viewHref && (
                  <Link
                    href={viewHref}
                    className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("view")}
                    <ExternalLink className="size-3.5" />
                  </Link>
                )}
              </div>
              {statusNote && <p className="text-xs text-muted-foreground">{statusNote}</p>}
            </div>
          )}
          <input
            name="title"
            defaultValue={defaults.title ?? ""}
            required
            aria-label={t("fieldTitle")}
            placeholder={t("fieldTitle")}
            // pl matches BlockNote's 54px content gutter so the title aligns with the body text.
            className="w-full border-0 bg-transparent pl-[54px] pr-0 text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40 focus:ring-0"
          />
          <ArticleEditor name="content" defaultValue={defaults.content ?? ""} />
          <p className="pl-[54px] text-xs text-muted-foreground">{t("fieldContentHint")}</p>
        </div>
      </div>

      {/* Article settings rail — full height at lg, settings scroll, actions pinned */}
      <aside className="flex shrink-0 flex-col border-b bg-card lg:w-80 lg:overflow-hidden lg:border-b-0 lg:border-l">
        <div className="shrink-0 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("articleSettings")}</h2>
        </div>

        <div className="space-y-4 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <SlugField
            defaultValue={defaults.slug ?? ""}
            basePath="/kb/"
            collections={collections.map((c) => ({ id: c.id, slug: c.slug }))}
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

          <div className="space-y-1.5 text-sm">
            <span className="block font-medium">{t("fieldVisibility")}</span>
            <PillRadioGroup
              name="visibility"
              ariaLabel={t("fieldVisibility")}
              defaultValue={defaults.visibility ?? "ALL_EMPLOYEES"}
              options={VISIBILITIES.map((v) => ({ value: v, label: tVis(v) }))}
            />
          </div>

          {canSetAssistant && (
            <AssistantOverrideField
              collections={collections}
              defaultCollectionId={defaults.collectionId ?? collections[0]?.id ?? ""}
              defaultOverride={defaults.assistantOverride ?? null}
            />
          )}

          <TagInput name="tags" defaultValue={defaults.tags ?? []} />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t p-4">
          <ButtonLink href="/kb/admin" size="sm" variant="ghost">{t("cancel")}</ButtonLink>
          <Button type="submit" size="sm">{submitLabel}</Button>
        </div>
      </aside>
    </form>
  );
}
