"use client";

import { useActionState } from "react";
import { loginWithCredentials } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CredentialsForm() {
  const [state, formAction, pending] = useActionState(loginWithCredentials, {});

  const errorId = "login-error";
  const describedBy = state?.error ? errorId : undefined;

  return (
    <form action={formAction} className="grid gap-3">
      <Input
        name="email"
        type="email"
        aria-label="Email"
        placeholder="email@acme.test"
        required
        aria-invalid={!!state?.error}
        aria-describedby={describedBy}
      />
      <Input
        name="password"
        type="password"
        aria-label="Password"
        placeholder="Password"
        required
        aria-invalid={!!state?.error}
        aria-describedby={describedBy}
      />
      {state?.error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
