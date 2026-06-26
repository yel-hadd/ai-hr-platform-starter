import { getTranslations, getLocale } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getDirectory } from "@/lib/hr";
import { can } from "@/lib/rbac";
import { formatCurrency } from "@/lib/utils";
import { getOrgSettings } from "@/lib/settings";
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

export default async function DirectoryPage() {
  const user = await requireUser();
  const directory = await getDirectory({
    role: user.role,
    employeeId: user.employeeId,
  });
  const showSalary = can(user.role, "salary:read:all");
  const t = await getTranslations("directory");
  const tRoles = await getTranslations("roles");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const { currency } = await getOrgSettings();

  const scope = can(user.role, "directory:read:all")
    ? t("scopeAll")
    : can(user.role, "directory:read:team")
      ? t("scopeTeam")
      : t("scopeSelf");

  return (
    <>
      <PageHeader title={t("title")} description={scope} />
      <div className="p-4 md:p-8">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("jobTitle")}</TableHead>
                <TableHead>{t("department")}</TableHead>
                <TableHead>{t("location")}</TableHead>
                <TableHead>{t("manager")}</TableHead>
                {showSalary && <TableHead className="text-right">{t("salary")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {directory.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {e.name}
                      {e.isSelf && <Badge variant="outline">{tc("you")}</Badge>}
                      <Badge variant="secondary" className="text-[10px]">
                        {tRoles(e.role)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{e.email}</span>
                  </TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{e.location}</TableCell>
                  <TableCell>{e.managerName ?? tc("none")}</TableCell>
                  {showSalary && (
                    <TableCell className="text-right tabular-nums">
                      {e.salary != null ? formatCurrency(e.salary, currency, locale) : tc("none")}
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
