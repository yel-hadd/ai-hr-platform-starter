import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getLang } from "@/lib/lang";
import { T, type Translations } from "@/lib/i18n";
import {
  can,
  PERMISSIONS,
  ROLES,
  type Role,
  type Permission,
} from "@/lib/rbac";
import { CHAT_MODELS, DEFAULT_MODEL_ID } from "@/lib/ai/providers";
import { TOOL_CATALOGUE, toolsForRole } from "@/lib/ai/tools";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";

const ROLE_LABEL_KEYS: Record<Role, keyof Translations> = {
  EMPLOYEE: "role_employee",
  MANAGER: "role_manager",
  HR_ADMIN: "role_hr_admin",
  SUPER_ADMIN: "role_super_admin",
};

const PERM_LABEL_KEYS: Record<Permission, keyof Translations> = {
  "directory:read:self": "perm_dir_self",
  "directory:read:team": "perm_dir_team",
  "directory:read:all": "perm_dir_all",
  "salary:read:all": "perm_salary",
  "leave:request": "perm_leave_request",
  "leave:read:self": "perm_leave_self",
  "leave:read:team": "perm_leave_team",
  "leave:approve": "perm_leave_approve",
  "payslip:read:self": "perm_payslip_self",
  "payslip:read:any": "perm_payslip_any",
  "handbook:read": "perm_handbook",
  "employee:manage": "perm_employee_manage",
  "admin:settings": "perm_admin_settings",
};

export default async function SettingsPage() {
  const [user, lang] = await Promise.all([requireUser(), getLang()]);
  const t = T[lang] as Translations;
  if (!can(user.role, "admin:settings")) redirect("/");

  return (
    <>
      <PageHeader title={t.settings_title} description={t.settings_desc} />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t.settings_perm_matrix}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[14rem]">{t.settings_perm_col}</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center">
                        {t[ROLE_LABEL_KEYS[r]]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSIONS.map((p) => (
                    <TableRow key={p}>
                      <TableCell>
                        <span className="font-medium">{t[PERM_LABEL_KEYS[p]]}</span>
                        <code className="ml-2 text-xs text-muted-foreground">{p}</code>
                      </TableCell>
                      {ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          {can(r, p) ? (
                            <Check className="mx-auto size-4 text-green-600" />
                          ) : (
                            <X className="mx-auto size-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI tools by role</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              The assistant is only given the tools a role may use — out-of-scope
              tools are never injected, so the model can&apos;t attempt them.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[16rem]">Tool</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center">
                        {t[ROLE_LABEL_KEYS[r]]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOOL_CATALOGUE.map((tool) => (
                    <TableRow key={tool.name}>
                      <TableCell>
                        <code className="text-xs font-medium">{tool.name}</code>
                        <p className="text-xs text-muted-foreground">{tool.summary}</p>
                      </TableCell>
                      {ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          {toolsForRole(r).includes(tool.name) ? (
                            <Check className="mx-auto size-4 text-green-600" />
                          ) : (
                            <X className="mx-auto size-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings_model_registry}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.settings_model_desc}</p>
            <div className="grid gap-2">
              {CHAT_MODELS.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md border px-4 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{m.label}</span>
                    <code className="ml-2 text-xs text-muted-foreground">{m.modelId}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{m.provider}</Badge>
                    {m.reasoning && <Badge variant="secondary">{t.settings_reasoning}</Badge>}
                    {m.id === DEFAULT_MODEL_ID && <Badge>{t.settings_default}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
