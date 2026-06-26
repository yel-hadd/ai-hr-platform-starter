import { requireUser } from "@/lib/session";
import { getLang } from "@/lib/lang";
import { T, translateField, TITLE_MAP, DEPT_MAP, LOCATION_MAP } from "@/lib/i18n";
import { getDirectory } from "@/lib/hr";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABEL_KEYS = {
  EMPLOYEE: "role_employee",
  MANAGER: "role_manager",
  HR_ADMIN: "role_hr_admin",
  SUPER_ADMIN: "role_super_admin",
} as const;

export default async function DirectoryPage() {
  const [user, lang] = await Promise.all([requireUser(), getLang()]);
  const t = T[lang] as { [K in keyof typeof T.fr]: string };
  const directory = await getDirectory({
    role: user.role,
    employeeId: user.employeeId,
  });
  const showSalary = can(user.role, "salary:read:all");

  const scope = can(user.role, "directory:read:all")
    ? t.dir_scope_all
    : can(user.role, "directory:read:team")
      ? t.dir_scope_team
      : t.dir_scope_self;

  return (
    <>
      <PageHeader title={t.dir_title} description={scope} />
      <div className="p-8">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.dir_name}</TableHead>
                <TableHead>{t.dir_title_col}</TableHead>
                <TableHead>{t.dir_dept}</TableHead>
                <TableHead>{t.dir_location}</TableHead>
                <TableHead>{t.dir_manager}</TableHead>
                {showSalary && <TableHead className="text-right">{t.dir_salary}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {directory.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {e.name}
                      {e.isSelf && <Badge variant="outline">{t.dir_me}</Badge>}
                      <Badge variant="secondary" className="text-[10px]">
                        {t[ROLE_LABEL_KEYS[e.role]]}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{e.email}</span>
                  </TableCell>
                  <TableCell>{translateField(e.title, lang, TITLE_MAP)}</TableCell>
                  <TableCell>{translateField(e.department, lang, DEPT_MAP)}</TableCell>
                  <TableCell>{translateField(e.location, lang, LOCATION_MAP)}</TableCell>
                  <TableCell>{e.managerName ?? "—"}</TableCell>
                  {showSalary && (
                    <TableCell className="text-right tabular-nums">
                      ${e.salary?.toLocaleString() ?? "—"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
