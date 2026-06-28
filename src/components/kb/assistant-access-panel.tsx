"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ChevronRight, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

type ServerAction = (formData: FormData) => void | Promise<void>;
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type Doc = { id: string; title: string; status: Status; override: boolean | null };
type Collection = { id: string; name: string; assistantEnabled: boolean; documents: Doc[] };

// Super-admin control for which KB content the assistant may draw on. Additive
// only — the server (lib/rag.ts) still applies status + visibility-tier RBAC, and
// the reader is unaffected. Per-collection switch + per-document override
// (inherit / available / hidden); the override wins over the collection default.
export function AssistantAccessPanel({
  collections: initial,
  setCollection,
  setDocument,
}: {
  collections: Collection[];
  setCollection: ServerAction;
  setDocument: ServerAction;
}) {
  const t = useTranslations("kb");
  const [collections, setCollections] = useState(initial);
  const [, start] = useTransition();

  function toggleCollection(id: string, enabled: boolean) {
    const prev = collections;
    setCollections((cs) => cs.map((c) => (c.id === id ? { ...c, assistantEnabled: enabled } : c)));
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("collectionId", id);
        fd.set("enabled", String(enabled));
        await setCollection(fd);
        toast.success(t("assistantSaved"));
      } catch {
        setCollections(prev);
        toast.error(t("assistantSaveFailed"));
      }
    });
  }

  function changeDoc(collectionId: string, docId: string, value: "inherit" | "on" | "off") {
    const override = value === "inherit" ? null : value === "on";
    const prev = collections;
    setCollections((cs) =>
      cs.map((c) =>
        c.id === collectionId
          ? { ...c, documents: c.documents.map((d) => (d.id === docId ? { ...d, override } : d)) }
          : c,
      ),
    );
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("documentId", docId);
        fd.set("override", value);
        await setDocument(fd);
        toast.success(t("assistantSaved"));
      } catch {
        setCollections(prev);
        toast.error(t("assistantSaveFailed"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          {t("assistantAccessTitle")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("assistantAccessDescription")}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {collections.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noCollections")}</p>
        )}

        {collections.map((c) => (
          <Collapsible key={c.id} className="rounded-lg border">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <CollapsibleTrigger
                className="group flex flex-1 items-center gap-2 text-left text-sm outline-none"
                aria-label={t("assistantToggleDocs", { name: c.name })}
              >
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-90" />
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t("articleCount", { count: c.documents.length })}
                </span>
              </CollapsibleTrigger>
              <Badge variant={c.assistantEnabled ? "secondary" : "outline"} className="text-[10px]">
                {c.assistantEnabled ? t("assistantBadgeOn") : t("assistantBadgeOff")}
              </Badge>
              <Switch
                checked={c.assistantEnabled}
                onCheckedChange={(v) => toggleCollection(c.id, v)}
                aria-label={t("assistantCollectionAria", { name: c.name })}
              />
            </div>

            <CollapsibleContent>
              <ul className="divide-y border-t">
                {c.documents.length === 0 && (
                  <li className="px-3 py-3 text-sm text-muted-foreground">{t("noDocuments")}</li>
                )}
                {c.documents.map((d) => {
                  const effective = d.override ?? c.assistantEnabled;
                  const value = d.override === null ? "inherit" : d.override ? "on" : "off";
                  return (
                    <li key={d.id} className="flex items-center gap-3 px-3 py-2.5 pl-9">
                      <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {effective ? t("assistantEffectiveOn") : t("assistantEffectiveOff")}
                      </span>
                      <select
                        value={value}
                        onChange={(e) =>
                          changeDoc(c.id, d.id, e.target.value as "inherit" | "on" | "off")
                        }
                        aria-label={t("assistantDocAria", { title: d.title })}
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                      >
                        <option value="inherit">{t("assistantOverrideInherit")}</option>
                        <option value="on">{t("assistantOverrideOn")}</option>
                        <option value="off">{t("assistantOverrideOff")}</option>
                      </select>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
