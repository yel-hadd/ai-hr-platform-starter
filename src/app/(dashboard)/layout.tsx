import { requireUser } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser(); // redirects to /login if signed out

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
