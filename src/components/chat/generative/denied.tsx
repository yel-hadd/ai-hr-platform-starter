"use client";

import { ShieldOff } from "lucide-react";
import { useT } from "@/lib/lang-context";

export function Denied() {
  const t = useT();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
      <ShieldOff className="size-3.5" />
      {t.denied}
    </div>
  );
}
