import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DEMO_USERS, DEMO_PASSWORD } from "@/lib/demo-users";
import { ROLE_LABELS } from "@/lib/rbac";
import { loginAs } from "./actions";
import { CredentialsForm } from "./credentials-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bot, ArrowRight } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      {/* Brand / pitch side */}
      <section className="hidden lg:flex flex-col justify-between bg-neutral-950 text-neutral-100 p-12">
        <div className="flex items-center gap-2 font-semibold">
          <Bot className="size-6" />
          HARI
        </div>
        <div className="space-y-4 max-w-md">
          <p className="text-3xl font-semibold leading-tight">
            An AI-powered HR platform starter.
          </p>
          <p className="text-neutral-400">
            A reference implementation showing RBAC-gated AI tools, RAG over your
            handbook, streaming reasoning, and generative chat UI — on Next.js,
            Postgres + pgvector, and the Vercel AI SDK.
          </p>
        </div>
        <p className="text-xs text-neutral-400">
          Demo build · pick any role to explore how permissions shape the experience.
        </p>
      </section>

      {/* Login side */}
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Choose a demo role — each has different permissions.
            </p>
          </div>

          <div className="grid gap-3">
            {DEMO_USERS.map((u) => (
              <form key={u.email} action={loginAs.bind(null, u.email)}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{u.name}</span>
                        <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.blurb}</p>
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      aria-label={`Sign in as ${u.name}, ${ROLE_LABELS[u.role]}`}
                    >
                      Enter <ArrowRight className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </form>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or sign in manually</span>
            <Separator className="flex-1" />
          </div>

          <CredentialsForm />

          <p className="text-center text-xs text-muted-foreground">
            All demo accounts use the password{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">{DEMO_PASSWORD}</code>
          </p>
        </div>
      </section>
    </main>
  );
}
