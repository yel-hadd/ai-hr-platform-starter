import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { T, type Translations } from "@/lib/i18n";
import { LangProvider } from "@/lib/lang-context";
import { LangToggle } from "@/components/lang-toggle";
import { DEMO_USERS } from "@/lib/demo-users";
import type { Role } from "@/lib/rbac";
import { loginAs } from "./actions";
import { CredentialsForm } from "./credentials-form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bot, ArrowRight } from "lucide-react";
import { DEMO_PASSWORD } from "@/lib/demo-users";

const ROLE_LABEL_KEYS: Record<Role, keyof Translations> = {
  EMPLOYEE: "role_employee",
  MANAGER: "role_manager",
  HR_ADMIN: "role_hr_admin",
  SUPER_ADMIN: "role_super_admin",
};

const BLURB_KEYS: Record<Role, keyof Translations> = {
  EMPLOYEE: "blurb_employee",
  MANAGER: "blurb_manager",
  HR_ADMIN: "blurb_hr",
  SUPER_ADMIN: "blurb_admin",
};

export default async function LoginPage() {
  const [session, lang] = await Promise.all([auth(), getLang()]);
  if (session?.user) redirect("/");
  const t = T[lang] as Translations;

  return (
    <LangProvider lang={lang}>
      <main className="min-h-dvh grid lg:grid-cols-2">
        {/* Brand side */}
        <section className="hidden lg:flex flex-col justify-between bg-neutral-950 text-neutral-100 p-12">
          <div className="flex items-center gap-2 font-semibold">
            <Bot className="size-6" />
            HARI
          </div>
          <div className="space-y-4 max-w-md">
            <h1 className="text-3xl font-semibold leading-tight">{t.login_pitch}</h1>
            <p className="text-neutral-400">{t.login_pitch_desc}</p>
          </div>
          <p className="text-xs text-neutral-500">{t.login_demo_note}</p>
        </section>

        {/* Login side */}
        <section className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{t.login_title}</h2>
                <p className="text-sm text-muted-foreground">{t.login_subtitle}</p>
              </div>
              <LangToggle />
            </div>

            <div className="grid gap-3">
              {DEMO_USERS.map((u) => (
                <form key={u.email} action={loginAs.bind(null, u.email)}>
                  <Card className="transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{u.name}</span>
                          <Badge variant="secondary">{t[ROLE_LABEL_KEYS[u.role]]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t[BLURB_KEYS[u.role]]}
                        </p>
                      </div>
                      <Button type="submit" size="sm" variant="ghost" className="shrink-0">
                        {t.login_enter} <ArrowRight className="size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </form>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">{t.login_or_manual}</span>
              <Separator className="flex-1" />
            </div>

            <CredentialsForm />

            <p className="text-center text-xs text-muted-foreground">
              {t.login_demo_password}{" "}
              <code className="rounded bg-muted px-1 py-0.5">{DEMO_PASSWORD}</code>
            </p>
          </div>
        </section>
      </main>
    </LangProvider>
  );
}
