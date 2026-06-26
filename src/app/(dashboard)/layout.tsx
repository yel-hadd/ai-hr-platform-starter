import { requireUser } from "@/lib/session";
import { getLang } from "@/lib/lang";
import { LangProvider } from "@/lib/lang-context";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, lang] = await Promise.all([requireUser(), getLang()]);

  return (
    <LangProvider lang={lang}>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </LangProvider>
  );
}
