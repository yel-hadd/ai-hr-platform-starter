"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Bot,
  Users,
  CalendarDays,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, type Permission, type Role } from "@/lib/rbac";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HariMark } from "@/components/brand/logo";

export type NavUser = { name: string; email: string; role: Role };

type NavItem = {
  href: string;
  label: "dashboard" | "assistant" | "directory" | "timeOff" | "knowledgeBase" | "settings";
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  children?: { href: string; labelKey: (typeof SETTINGS_SECTIONS)[number]["key"] }[];
};

const NAV: NavItem[] = [
  { href: "/", label: "dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "assistant", icon: Bot },
  { href: "/directory", label: "directory", icon: Users },
  { href: "/time-off", label: "timeOff", icon: CalendarDays },
  { href: "/kb", label: "knowledgeBase", icon: BookOpen },
  {
    href: "/settings",
    label: "settings",
    icon: Settings,
    permission: "admin:settings",
    children: SETTINGS_SECTIONS.filter((s) => s.href !== "/settings").map((s) => ({
      href: s.href,
      labelKey: s.key,
    })),
  },
];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Shared nav body — desktop rail + mobile sheet. `onNavigate` closes the sheet.
export function NavBody({
  user,
  onNavigate,
}: {
  user: NavUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tSettings = useTranslations("settings");
  const tRoles = useTranslations("roles");
  const tTop = useTranslations("topbar");
  const items = NAV.filter((i) => !i.permission || can(user.role, i.permission));
  const inSection = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col glass-navy text-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <HariMark className="size-9" />
        <div className="leading-none">
          <Image
            src="/assets/Logo_HARI_Light.png"
            alt="HARI"
            width={506}
            height={105}
            priority
            className="h-5 w-auto object-contain object-left"
          />
          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
            {tTop("descriptor")}
          </div>
        </div>
      </div>

      <p className="px-5 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
        {tTop("workspace", { role: tRoles(user.role) })}
      </p>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label={t("primary")}>
        {items.map((item) => {
          const hasChildren = !!item.children?.length;
          const active =
            item.href === "/"
              ? pathname === "/"
              : hasChildren
                ? pathname === item.href
                : pathname.startsWith(item.href);
          const open = hasChildren && inSection(item.href);
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="size-[18px]" />
                {t(item.label)}
              </Link>

              {open && (
                <div className="mt-1 space-y-0.5">
                  {item.children!.map((child) => {
                    const childActive = inSection(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "block rounded-md py-1.5 pl-10 pr-3 text-sm transition-colors",
                          childActive
                            ? "bg-white/10 font-medium text-white"
                            : "text-white/55 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {tSettings(child.labelKey)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
          <Avatar className="size-9">
            <AvatarFallback className="bg-brand-gradient text-xs font-semibold text-white">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-white/50">{tRoles(user.role)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Desktop sidebar — fixed rail, hidden below `md` (the top bar exposes it on mobile). */
export function Sidebar({ user }: { user: NavUser }) {
  return (
    <aside className="hidden h-dvh w-64 shrink-0 border-r border-white/10 md:block">
      <NavBody user={user} />
    </aside>
  );
}
