import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DirectoryFilters } from "@/components/directory/filters";
import { Suspense } from "react";

type Props = {
  searchParams: Promise<{
    status?: string | string[];
    search?: string;
    dept?: string | string[];
    city?: string | string[];
  }>;
};

export default async function DirectoryPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = await searchParams;

  if (!user.employeeId && !can(user.role, "directory:read:all")) {
    return (
      <>
        <PageHeader title="Directory" description="Access Restricted" />
        <div className="p-4 md:p-8">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 max-w-2xl mx-auto space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <AlertCircle className="h-5 w-5" />
              <h3>Profil introuvable</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Votre compte utilisateur n&apos;est associé à aucun profil
              collaborateur actif dans la base de données. Veuillez contacter
              l&apos;équipe RH ou votre administrateur système pour régulariser
              votre fiche de poste.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Parse arrays from URL for multiple checkboxes
  const getArray = (val: string | string[] | undefined) => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  const statuses = getArray(params.status);
  const depts = getArray(params.dept);
  const cities = getArray(params.city);
  const searchFilter = typeof params.search === "string" ? params.search : "";

  const showSalary = can(user.role, "salary:read:all");

  // 1. Base query with Role-Aware Scoping Invariants
  const baseWhere: Record<string, any> = { AND: [] };

  if (!can(user.role, "directory:read:all")) {
    if (can(user.role, "directory:read:team")) {
      baseWhere.AND.push({
        OR: [
          { id: user.employeeId ?? "__none__" },
          { managerId: user.employeeId ?? "__none__" },
        ],
      });
    } else {
      baseWhere.AND.push({ id: user.employeeId ?? "__none__" });
    }
  }

  // 2. Apply Text Search
  if (searchFilter) {
    baseWhere.AND.push({
      OR: [
        { user: { name: { contains: searchFilter, mode: "insensitive" } } },
        { user: { email: { contains: searchFilter, mode: "insensitive" } } },
      ],
    });
  }

  // 3. Apply Multi-Select Facet Constraints (Defaults to ALL if none checked)
  if (statuses.length > 0) {
    baseWhere.AND.push({ status: { in: statuses } });
  }
  if (depts.length > 0) {
    baseWhere.AND.push({ department: { in: depts } });
  }
  if (cities.length > 0) {
    baseWhere.AND.push({ location: { in: cities } });
  }

  // 4. Dynamic Options Extraction from Database
  const allFacets = await prisma.employee.findMany({
    select: { department: true, location: true },
  });
  const dbDepartments = Array.from(
    new Set(allFacets.map((f) => f.department)),
  ).sort();
  const dbCities = Array.from(new Set(allFacets.map((f) => f.location))).sort();

  // 5. Fetch Matching Rows
  const rows = await prisma.employee.findMany({
    where: baseWhere,
    include: {
      user: { select: { name: true, email: true, role: true } },
      manager: { include: { user: { select: { name: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <>
      <PageHeader
        title="Directory"
        description={
          can(user.role, "directory:read:all")
            ? "Everyone in the company database."
            : "Your scoped team registry."
        }
      />

      <div className="p-4 md:p-8 space-y-6">
        {/* Interactive Client Filters */}
        <Suspense
          fallback={
            <div className="h-32 bg-muted/20 animate-pulse rounded-xl border"></div>
          }
        >
          <DirectoryFilters departments={dbDepartments} cities={dbCities} />
        </Suspense>

        {/* Directory Registry View Data Table */}
        <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Manager</TableHead>
                  {showSalary && (
                    <TableHead className="text-right">Salary</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {e.user.name}
                        {e.id === user.employeeId && (
                          <Badge variant="outline">You</Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          {ROLE_LABELS[e.user.role]}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {e.user.email}
                      </span>
                    </TableCell>
                    <TableCell>{e.title}</TableCell>
                    <TableCell>{e.department}</TableCell>
                    <TableCell>{e.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.status === "ACTIVE"
                            ? "default"
                            : e.status === "ON_LEAVE"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {e.status === "ACTIVE"
                          ? "Active"
                          : e.status === "ON_LEAVE"
                            ? "On Leave"
                            : "Terminated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.employmentType === "FULL_TIME"
                        ? "Full-time"
                        : e.employmentType === "PART_TIME"
                          ? "Part-time"
                          : "Contractor"}
                    </TableCell>
                    <TableCell>{e.manager?.user.name ?? "—"}</TableCell>
                    {showSalary && (
                      <TableCell className="text-right tabular-nums">
                        {e.salary?.toLocaleString()} MAD
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-16 text-muted-foreground"
                    >
                      No employees found matching the specified filter criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
