"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/kb/markdown";

// Slug input with a live URL preview (slugified as you type, matching the
// server's uniqueSlug) and a warning when editing a slug that already has live
// links (published doc / existing collection) — changing it 404s old links.
export function SlugField({
  defaultValue = "",
  basePath,
  originalSlug,
  warnOnChange = false,
}: {
  defaultValue?: string;
  basePath: string; // e.g. "/kb/" (collection) or "…/" (document)
  originalSlug?: string;
  warnOnChange?: boolean;
}) {
  const t = useTranslations("kb");
  const [value, setValue] = useState(defaultValue);
  const effective = slugify(value);
  const changed = warnOnChange && !!originalSlug && !!effective && effective !== originalSlug;

  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{t("fieldSlug")}</span>
      <Input name="slug" value={value} onChange={(e) => setValue(e.target.value)} />
      <span className="block text-xs text-muted-foreground">{t("fieldSlugHint")}</span>
      {effective && (
        <span className="block text-xs text-muted-foreground">
          {basePath}
          <span className="font-mono text-foreground">{effective}</span>
        </span>
      )}
      {changed && <span className="block text-xs text-destructive">{t("slugChangeWarning")}</span>}
    </label>
  );
}
