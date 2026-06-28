"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";

type Collection = { id: string; name: string; assistantEnabled: boolean };

// Per-document chatbot access on the article form. Inherits the selected
// collection by default but can include/exclude this article. Rendered only for
// eligible roles (admin:settings); the server re-checks before honoring it.
// Mirrors the form's collection <select> so "Inherit" shows what it resolves to.
export function AssistantOverrideField({
  collections,
  defaultCollectionId,
  defaultOverride,
}: {
  collections: Collection[];
  defaultCollectionId: string;
  defaultOverride: boolean | null;
}) {
  const t = useTranslations("kb");
  const id = useId();
  const [collectionId, setCollectionId] = useState(defaultCollectionId);
  const [value, setValue] = useState<"inherit" | "on" | "off">(
    defaultOverride === null ? "inherit" : defaultOverride ? "on" : "off",
  );

  // Keep the inherit hint in sync with the collection chosen in the sibling
  // <select name="collectionId"> (which everyone needs, so it stays server-rendered).
  useEffect(() => {
    const sel = document.querySelector<HTMLSelectElement>('select[name="collectionId"]');
    if (!sel) return;
    setCollectionId(sel.value || defaultCollectionId);
    const onChange = () => setCollectionId(sel.value);
    sel.addEventListener("change", onChange);
    return () => sel.removeEventListener("change", onChange);
  }, [defaultCollectionId]);

  const collectionEnabled =
    collections.find((c) => c.id === collectionId)?.assistantEnabled ?? true;
  const inheritState = collectionEnabled ? t("assistantEffectiveOn") : t("assistantEffectiveOff");
  const effective = value === "inherit" ? collectionEnabled : value === "on";

  return (
    <div className="space-y-1 text-sm">
      <label htmlFor={id} className="block font-medium">
        {t("assistantFieldLabel")}
      </label>
      <select
        id={id}
        name="assistantOverride"
        value={value}
        onChange={(e) => setValue(e.target.value as "inherit" | "on" | "off")}
        aria-describedby={`${id}-hint`}
        className="block w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="inherit">
          {t("assistantOverrideInheritState", { state: inheritState })}
        </option>
        <option value="on">{t("assistantOverrideOn")}</option>
        <option value="off">{t("assistantOverrideOff")}</option>
      </select>
      <span id={`${id}-hint`} className="block text-xs text-muted-foreground">
        {effective ? t("assistantFieldHintOn") : t("assistantFieldHintOff")}
      </span>
    </div>
  );
}
