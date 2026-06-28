"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ServerAction = (formData: FormData) => void | Promise<void>;

// Runs a KB server action (publish/unpublish/archive) for a document id and shows
// a success toast. Used for reversible lifecycle actions that revalidate in place.
export function ActionButton({
  action,
  id,
  label,
  toastMessage,
  variant = "outline",
}: {
  action: ServerAction;
  id: string;
  label: string;
  toastMessage: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="xs"
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          await action(fd);
          toast.success(toastMessage);
        })
      }
    >
      {label}
    </Button>
  );
}
