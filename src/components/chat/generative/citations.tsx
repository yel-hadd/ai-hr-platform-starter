"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/lang-context";

type Hit = { id: string; section: string; content: string; similarity: number };

export function Citations({
  query,
  results,
  streaming,
}: {
  query: string;
  results: Hit[];
  streaming: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const expanded = streaming || open;

  return (
    <div className="rounded-lg border bg-card text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-muted-foreground"
      >
        <BookOpen className="size-4 shrink-0" />
        <span className="truncate">
          {t.citations_results} &quot;{query}&quot;
          {results.length > 0 && ` (${results.length})`}
        </span>
        <ChevronDown
          className={cn("ml-auto size-3.5 shrink-0 transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="space-y-2 px-3 pb-3">
          {results.length === 0 && (
            <p className="text-muted-foreground">{t.citations_none}</p>
          )}
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.id} className="rounded-md border bg-background p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{r.section}</span>
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    {(r.similarity * 100).toFixed(0)}% {t.citations_match}
                  </Badge>
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">{r.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
