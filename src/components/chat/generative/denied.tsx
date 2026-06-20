import { ShieldX } from "lucide-react";

export function DeniedCard({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <ShieldX className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Permission denied</p>
        <p className="text-muted-foreground">{reason}</p>
      </div>
    </div>
  );
}
