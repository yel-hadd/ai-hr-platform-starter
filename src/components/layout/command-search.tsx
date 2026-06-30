"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  LayoutDashboard,
  Bot,
  Users,
  CalendarDays,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can, type Permission, type Role } from "@/lib/rbac";

type Page = {
  href: string;
  key: "dashboard" | "assistant" | "directory" | "timeOff" | "knowledgeBase" | "settings";
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
};

const PAGES: Page[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/chat", key: "assistant", icon: Bot },
  { href: "/directory", key: "directory", icon: Users },
  { href: "/time-off", key: "timeOff", icon: CalendarDays },
  { href: "/kb", key: "knowledgeBase", icon: BookOpen },
  { href: "/settings", key: "settings", icon: Settings, permission: "admin:settings" },
];

// Command palette: click the search box or press ⌘K / Ctrl+K, type to filter the
// pages you can see, ↑/↓ to move, Enter to navigate.
export function CommandSearch({ role }: { role: Role }) {
  const router = useRouter();
  const t = useTranslations("nav");
  const tTop = useTranslations("topbar");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = PAGES.filter((p) => !p.permission || can(role, p.permission)).map((p) => ({
    ...p,
    label: t(p.key),
  }));
  const results = pages.filter((p) =>
    p.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const activeIdx = results.length ? Math.min(active, results.length - 1) : 0;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) {
            setQuery("");
            setActive(0);
          }
          return !o;
        });
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        aria-label={tTop("search")}
        className="hidden items-center gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent sm:flex"
      >
        <Search className="size-4" />
        <span className="hidden md:inline">{tTop("search")}</span>
        <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tTop("search")}
            className="w-full max-w-lg overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter" && results[activeIdx]) {
                    e.preventDefault();
                    go(results[activeIdx].href);
                  }
                }}
                placeholder={tTop("search")}
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto p-2">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {tTop("noResults")}
                </li>
              ) : (
                results.map((item, i) => (
                  <li key={item.href}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm",
                        i === activeIdx
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground",
                      )}
                    >
                      <item.icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
