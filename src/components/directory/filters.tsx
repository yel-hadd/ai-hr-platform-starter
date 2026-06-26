"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useTransition, useRef } from "react";
import { ChevronDown, Filter, Search, Check } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Reusable Searchable Dropdown Component
function MultiSelectFilter({
  title,
  paramKey,
  options,
  selected,
}: {
  title: string;
  paramKey: string;
  options: string[];
  selected: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggleParam = (value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const existing = current.getAll(paramKey);
    current.delete(paramKey);
    const updated = existing.includes(value)
      ? existing.filter((v) => v !== value)
      : [...existing, value];
    updated.forEach((v) => current.append(paramKey, v));
    router.push(`${pathname}?${current.toString()}`);
  };

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-xl border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
      >
        {title} ({selected.length}) <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-card border rounded-xl shadow-xl p-2 animate-in fade-in zoom-in-95">
          <Input
            placeholder="Filter..."
            className="h-8 mb-2"
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((opt) => (
              <div
                key={opt}
                onClick={() => toggleParam(opt)}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-muted rounded-md text-sm"
              >
                <div
                  className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(opt) ? "bg-primary border-primary" : "border-input"}`}
                >
                  {selected.includes(opt) && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                {opt.replace("_", " ")}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DirectoryFilters({
  departments,
  cities,
}: {
  departments: string[];
  cities: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (searchTerm) current.set("search", searchTerm);
      else current.delete("search");
      if (searchParams.get("search") !== searchTerm)
        router.push(`${pathname}?${current.toString()}`);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchTerm, pathname, router, searchParams]);

  return (
    <Collapsible className="w-full bg-card border rounded-2xl shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-muted/30 border-none"
          />
        </div>
        <CollapsibleTrigger className="inline-flex items-center gap-2 rounded-xl h-10 px-4 border bg-background hover:bg-accent transition">
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className="h-3 w-3" />
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="px-4 pb-4 border-t">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <MultiSelectFilter
            title="Status"
            paramKey="status"
            options={["ACTIVE", "ON_LEAVE", "TERMINATED"]}
            selected={searchParams.getAll("status")}
          />
          <MultiSelectFilter
            title="Department"
            paramKey="dept"
            options={departments}
            selected={searchParams.getAll("dept")}
          />
          <MultiSelectFilter
            title="Location"
            paramKey="city"
            options={cities}
            selected={searchParams.getAll("city")}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
