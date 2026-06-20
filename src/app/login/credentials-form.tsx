"use client";

import { useActionState } from "react";
import { loginWithCredentials } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CredentialsForm() {
  const [state, formAction, pending] = useActionState(loginWithCredentials, {});

  return (
    <form action={formAction} className="grid gap-3">
      <Input name="email" type="email" placeholder="email@acme.test" required />
      <Input name="password" type="password" placeholder="Password" required />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
