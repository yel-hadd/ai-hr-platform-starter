"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Users,
  CalendarDays,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, ROLE_LABELS, type Permission, type Role } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { logout } from "@/lib/auth-actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission; // hidden unless the role holds it
};

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Assistant", icon: Bot },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/time-off", label: "Time Off", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings, permission: "admin:settings" },
];

export function Sidebar({
  user,
}: {
  user: { name: string; email: string; role: Role };
}) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.permission || can(user.role, i.permission));
  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-4 font-semibold">
        <Bot className="size-5 text-primary" />
        PeopleAI
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start text-muted-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
