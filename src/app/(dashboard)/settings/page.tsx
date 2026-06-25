import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import {
  can,
  PERMISSIONS,
  PERMISSION_LABELS,
  ROLES,
  ROLE_LABELS,
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

export default async function SettingsPage() {
  const user = await requireUser();
  if (!can(user.role, "admin:settings")) redirect("/"); // belt-and-suspenders

  return (
    <>
      <PageHeader
        title="Settings"
        description="The single RBAC matrix that gates the UI, server actions, and AI tools."
      />
      <div className="space-y-6 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Permission matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[14rem]">Permission</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center">
                        {ROLE_LABELS[r]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSIONS.map((p) => (
                    <TableRow key={p}>
                      <TableCell>
                        <span className="font-medium">{PERMISSION_LABELS[p]}</span>
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
                        {ROLE_LABELS[r]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOOL_CATALOGUE.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell>
                        <code className="text-xs font-medium">{t.name}</code>
                        <p className="text-xs text-muted-foreground">{t.summary}</p>
                      </TableCell>
                      {ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          {toolsForRole(r).includes(t.name) ? (
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
            <CardTitle>AI model registry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Chat defaults to OpenRouter free models; the Vercel AI Gateway is
              selectable per request. Configure keys via environment variables.
            </p>
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
                    {m.reasoning && <Badge variant="secondary">reasoning</Badge>}
                    {m.id === DEFAULT_MODEL_ID && <Badge>default</Badge>}
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
