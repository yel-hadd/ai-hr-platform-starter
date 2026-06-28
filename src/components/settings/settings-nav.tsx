"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations("settings");

  // Overview matches only the exact root; every other section also matches its
  // nested routes (e.g. /settings/assistant/[collection]).
  const isActive = (href: string) =>
    href === "/settings"
      ? pathname === "/settings"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label={t("title")}
      className="flex gap-1 overflow-x-auto pb-1 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:pb-0"
    >
      {SETTINGS_SECTIONS.map((s) => {
        const active = isActive(s.href);
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(s.key)}
          </Link>
        );
      })}
    </nav>
  );
}
