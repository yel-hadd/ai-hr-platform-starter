"use client";

import { useState, useTransition } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ServerAction = (formData: FormData) => void | Promise<void>;

// A destructive action gated by a confirmation dialog (Base UI AlertDialog) that
// restates the consequence — for delete (doc/collection). Runs the server action
// for the given id and toasts on success.
export function ConfirmButton({
  action,
  id,
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel,
  toastMessage,
}: {
  action: ServerAction;
  id: string;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  toastMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const onConfirm = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await action(fd);
      toast.success(toastMessage);
      setOpen(false);
    });

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger render={<Button type="button" size="xs" variant="destructive" />}>
        {triggerLabel}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-5 text-sm shadow-lg transition-all data-ending-style:opacity-0 data-starting-style:opacity-0">
          <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close render={<Button type="button" size="sm" variant="ghost" />}>
              {cancelLabel}
            </AlertDialog.Close>
            <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
