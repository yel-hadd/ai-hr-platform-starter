import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/session";
import { getCollection } from "@/lib/kb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText } from "lucide-react";

type Props = { params: Promise<{ collection: string }> };

export default async function CollectionPage({ params }: Props) {
  const user = await requireUser();
  const { collection } = await params;

  // null if missing or nothing the caller may see — same not-found-on-restricted
  // posture as the article page.
  const col = await getCollection({ role: user.role }, collection);
  if (!col) notFound();

  const t = await getTranslations("kb");
  const tVis = await getTranslations("kbVisibility");

  return (
    <>
      <PageHeader title={col.name} description={col.description ?? undefined} />

      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <nav aria-label={t("breadcrumb")} className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/kb" className="hover:text-foreground hover:underline">
            {t("title")}
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{col.name}</span>
        </nav>

        <Card>
          <CardContent>
            <ul className="divide-y">
              {col.articles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/kb/${col.slug}/${a.slug}`}
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
      </div>
    </>
  );
}
