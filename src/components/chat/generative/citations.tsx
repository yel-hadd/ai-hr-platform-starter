import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Hit = { id: string; section: string; content: string; similarity: number };

export function Citations({
  query,
  results,
}: {
  query: string;
  results: Hit[];
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <BookOpen className="size-4" />
        <span>Handbook results for “{query}”</span>
      </div>
      {results.length === 0 && (
        <p className="text-muted-foreground">No matching sections.</p>
      )}
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id} className="rounded-md border bg-background p-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium">{r.section}</span>
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {(r.similarity * 100).toFixed(0)}% match
              </Badge>
            </div>
            <p className="line-clamp-3 text-xs text-muted-foreground">{r.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
