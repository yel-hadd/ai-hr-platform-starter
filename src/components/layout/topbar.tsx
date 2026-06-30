"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NavBody, type NavUser } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CommandSearch } from "@/components/layout/command-search";
import { Notifications, type AppNotification } from "@/components/layout/notifications";
import { logout } from "@/lib/auth-actions";

type NavKey = "dashboard" | "assistant" | "directory" | "timeOff" | "knowledgeBase" | "settings";

// Maps the first path segment to a nav label key for the breadcrumb.
const SEGMENT_LABEL: Record<string, NavKey> = {
  "": "dashboard",
  chat: "assistant",
  directory: "directory",
  "time-off": "timeOff",
  kb: "knowledgeBase",
  settings: "settings",
};

export function Topbar({
  user,
  notifications,
}: {
  user: NavUser;
  notifications: AppNotification[];
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const [open, setOpen] = useState(false);

  const segment = pathname.split("/")[1] ?? "";
  const pageKey = SEGMENT_LABEL[segment] ?? "dashboard";
  const roleFr = tRoles(user.role);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b glass px-3 md:px-6">
      {/* Mobile: hamburger opens the sidebar nav in a sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t("openNavigation")}
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
          <NavBody user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-muted-foreground">HARI</span>
        <span className="text-muted-foreground/50">/</span>
        <span className="hidden text-muted-foreground sm:inline">{roleFr}</span>
        <span className="hidden text-muted-foreground/50 sm:inline">/</span>
        <span className="font-semibold text-foreground">{t(pageKey)}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <CommandSearch role={user.role} />
        <Notifications items={notifications} />
        <ThemeToggle />
        <LanguageSwitcher />

        {/* User / role menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" className="gap-2" />}
          >
            <span className="size-2 rounded-full bg-primary" />
            <span className="hidden max-w-28 truncate sm:inline">{roleFr}</span>
            <ChevronDown className="size-4 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut className="size-4" /> {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
