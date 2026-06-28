"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 1_000_000; // 1 MB — kept small since the image is stored inline (data URL)

// Decorative cover-image picker for a collection. Reads the chosen file into a
// data URL entirely client-side (no upload endpoint / blob storage needed) and
// mirrors it into a hidden input so the existing server action stores it as text.
// An empty hidden value clears the image on save.
export function ImageField({ defaultValue }: { defaultValue?: string | null }) {
  const t = useTranslations("kb");
  const [value, setValue] = useState<string>(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("imageInvalid"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue(typeof reader.result === "string" ? reader.result : "");
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    setValue("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-1 text-sm">
      <span className="font-medium">{t("fieldImage")}</span>
      {/* The actual stored value — a data URL (or empty to clear). */}
      <input type="hidden" name="image" value={value} />

      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- decorative, user-provided data URL; the Next optimizer doesn't apply to data: sources
          <img
            src={value}
            alt=""
            className="h-20 w-32 shrink-0 rounded-md border object-cover"
          />
        ) : (
          <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground">
            <ImagePlus className="size-5" />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted"
          />
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clear}
              className="w-fit text-muted-foreground"
            >
              <X className="size-3.5" /> {t("imageRemove")}
            </Button>
          )}
        </div>
      </div>

      <span className="block text-xs text-muted-foreground">{t("fieldImageHint")}</span>
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </div>
  );
}
