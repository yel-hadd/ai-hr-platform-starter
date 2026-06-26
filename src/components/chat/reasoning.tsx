"use client";

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/lang-context";

export function Reasoning({ text, streaming }: { text: string; streaming: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const expanded = streaming || open;

  return (
    <div className="rounded-lg border bg-muted/40 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"
      >
        <Brain className={cn("size-3.5", streaming && "animate-pulse")} />
        {streaming ? t.reasoning_thinking : t.reasoning_done}
        <ChevronDown
          className={cn(
            "ml-auto size-3.5 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded && (
        <div className="whitespace-pre-wrap px-3 pb-3 text-xs leading-relaxed text-muted-foreground">
          {text}
        </div>
      )}
    </div>
  );
}
