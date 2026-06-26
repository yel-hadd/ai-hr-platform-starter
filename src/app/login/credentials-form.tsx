"use client";

import { useActionState } from "react";
import { loginWithCredentials } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/lang-context";

export function CredentialsForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(loginWithCredentials, {});

  return (
    <form action={formAction} className="grid gap-3">
      <Input name="email" type="email" placeholder="email@acme.test" required />
      <Input name="password" type="password" placeholder={t.login_password_placeholder} required />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t.login_signing_in : t.login_sign_in}
      </Button>
    </form>
  );
}
