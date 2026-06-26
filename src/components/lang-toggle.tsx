"use client";

import { useState } from "react";
import { setLang } from "@/app/lang-action";
import { useLang } from "@/lib/lang-context";
import type { Lang } from "@/lib/i18n";

export function LangToggle() {
  const lang = useLang();
  const [pending, setPending] = useState(false);

  async function switchTo(next: Lang) {
    if (next === lang || pending) return;
    setPending(true);
    await setLang(next);
    // Full reload so every server component re-reads the cookie.
    // router.refresh() is not reliable enough: the router cache can
    // serve stale RSC payloads before the new cookie is picked up.
    window.location.reload();
  }

  return (
    <div className="flex items-center rounded-md border text-xs font-semibold overflow-hidden">
      <button
        onClick={() => switchTo("fr")}
        disabled={pending}
        title="Passer en français"
        className={[
          "px-2.5 py-1 transition-colors disabled:opacity-50 cursor-pointer",
          lang === "fr"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted text-muted-foreground",
        ].join(" ")}
      >
        FR
      </button>
      <button
        onClick={() => switchTo("en")}
        disabled={pending}
        title="Switch to English"
        className={[
          "px-2.5 py-1 transition-colors disabled:opacity-50 cursor-pointer",
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted text-muted-foreground",
        ].join(" ")}
      >
        EN
      </button>
    </div>
  );
}
