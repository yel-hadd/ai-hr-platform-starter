import { getTranslations } from "next-intl/server";
import { DocVisibility } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { SlugField } from "@/components/kb/slug-field";
import { ArticleEditor } from "@/components/kb/article-editor";

const VISIBILITIES = Object.values(DocVisibility);

type Defaults = {
  id?: string;
  title?: string;
  slug?: string;
  content?: string;
  collectionId?: string;
  visibility?: DocVisibility;
  tags?: string[];
};

const selectClass =
  "block w-full rounded-md border bg-background px-3 py-2 text-sm";

export async function DocumentForm({
  action,
  submitLabel,
  collections,
  defaults = {},
  published = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  collections: { id: string; name: string }[];
  defaults?: Defaults;
  published?: boolean;
}) {
  const t = await getTranslations("kb");
  const tVis = await getTranslations("kbVisibility");

  return (
    <form action={action} className="space-y-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      {/* Metadata stays at a readable width; the editor below goes full-width. */}
      <div className="max-w-3xl space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("fieldTitle")}</span>
        <Input name="title" defaultValue={defaults.title ?? ""} required />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t("fieldTags")}</span>
        <Input name="tags" defaultValue={(defaults.tags ?? []).join(", ")} />
        <span className="text-xs text-muted-foreground">{t("fieldTagsHint")}</span>
      </label>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1">
          <SlugField
            defaultValue={defaults.slug ?? ""}
            basePath="…/"
            originalSlug={defaults.slug}
            warnOnChange={published}
          />
        </div>

        <label className="block flex-1 space-y-1 text-sm">
          <span className="font-medium">{t("fieldCollection")}</span>
          <select name="collectionId" defaultValue={defaults.collectionId ?? ""} required className={selectClass}>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block flex-1 space-y-1 text-sm">
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
      </div>
      </div>

      <div className="space-y-1 text-sm">
        <span className="font-medium">{t("fieldContent")}</span>
        <ArticleEditor name="content" defaultValue={defaults.content ?? ""} />
        <span className="text-xs text-muted-foreground">{t("fieldContentHint")}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">{submitLabel}</Button>
        <ButtonLink href="/kb/admin" size="sm" variant="ghost">
          {t("cancel")}
        </ButtonLink>
      </div>
    </form>
  );
}
