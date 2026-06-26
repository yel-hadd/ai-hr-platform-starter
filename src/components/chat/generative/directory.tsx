"use client";

import { Mail, MapPin, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Role } from "@/lib/rbac";
import { useT, useLang } from "@/lib/lang-context";
import { translateField, TITLE_MAP, DEPT_MAP, LOCATION_MAP } from "@/lib/i18n";

const ROLE_LABEL_KEYS = {
  EMPLOYEE: "role_employee",
  MANAGER: "role_manager",
  HR_ADMIN: "role_hr_admin",
  SUPER_ADMIN: "role_super_admin",
} as const;

type Person = {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  location: string;
  role: Role;
  managerName: string | null;
  isSelf: boolean;
  salary: number | null;
};

export function DirectoryCards({ people }: { people: Person[] }) {
  const t = useT();
  const lang = useLang();

  if (people.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        {t.dir_no_people}
      </p>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {people.map((p) => {
        const initials = p.name
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <div key={p.id} className="rounded-lg border bg-card p-3 text-sm">
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{p.name}</span>
                  {p.isSelf && <Badge variant="outline" className="text-[10px]">{t.dir_me}</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{translateField(p.title, lang, TITLE_MAP)}</p>
              </div>
            </div>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Briefcase className="size-3" /> {translateField(p.department, lang, DEPT_MAP)}
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {t[ROLE_LABEL_KEYS[p.role]]}
                </Badge>
              </p>
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3" /> {translateField(p.location, lang, LOCATION_MAP)}
              </p>
              <p className="flex items-center gap-1.5 truncate">
                <Mail className="size-3" /> {p.email}
              </p>
              {p.salary != null && (
                <p className="font-medium text-foreground">
                  ${p.salary.toLocaleString()} / yr
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
