import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { listCollectionsWithArticles } from "@/lib/kb";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KbSearch } from "@/components/kb/kb-search";
import { Settings2, FileText } from "lucide-react";

export default async function KnowledgeBasePage() {
  const user = await requireUser();
  const t = await getTranslations("kb");
  const tVis = await getTranslations("kbVisibility");
  const collections = await listCollectionsWithArticles({ role: user.role });
  const canManage = can(user.role, "kb:manage");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")}>
        <div className="flex items-center gap-2">
          <KbSearch />
          {canManage && (
            <ButtonLink href="/kb/admin" size="sm" variant="outline">
              <Settings2 className="size-4" /> {t("manage")}
            </ButtonLink>
          )}
        </div>
      </PageHeader>

      <div className="space-y-6 p-4 md:p-8">
        {collections.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("emptyReader")}</p>
        )}

        {collections.map((c) => (
          <Card key={c.id}>
            {/* Decorative cover — full-bleed as the card's first child (the Card
                primitive drops top padding + rounds it). alt="" to skip in SR. */}
            {c.image && (
              // eslint-disable-next-line @next/next/no-img-element -- decorative cover, often a data URL the Next optimizer can't process
              <img src={c.image} alt="" className="h-28 w-full object-cover" />
            )}
            <CardHeader>
              <CardTitle>
                <Link href={`/kb/${c.slug}`} className="hover:underline">
                  {c.name}
                </Link>
              </CardTitle>
              {c.description && (
                <p className="text-sm text-muted-foreground">{c.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {c.articles.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/kb/${c.slug}/${a.slug}`}
                      className="flex items-center gap-3 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                      {a.visibility !== "ALL_EMPLOYEES" && (
                        <Badge variant="secondary" className="text-[10px]">
                          {tVis(a.visibility)}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
