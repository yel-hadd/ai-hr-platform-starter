import { requireUser } from "@/lib/session";
import { getDirectory } from "@/lib/hr";
import { can, ROLE_LABELS } from "@/lib/rbac";
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

  const scope = can(user.role, "directory:read:all")
    ? "Everyone in the company."
    : can(user.role, "directory:read:team")
      ? "You and your direct reports."
      : "Just your own profile — managers and HR see more.";

  return (
    <>
      <PageHeader title="Directory" description={scope} />
      <div className="p-4 md:p-8">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Manager</TableHead>
                {showSalary && <TableHead className="text-right">Salary</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {directory.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {e.name}
                      {e.isSelf && <Badge variant="outline">You</Badge>}
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABELS[e.role]}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{e.email}</span>
                  </TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{e.location}</TableCell>
                  <TableCell>{e.managerName ?? "—"}</TableCell>
                  {showSalary && (
                    <TableCell className="text-right tabular-nums">
                      ${e.salary?.toLocaleString()}
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
