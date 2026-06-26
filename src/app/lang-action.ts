"use server";

import { cookies } from "next/headers";
import type { Lang } from "@/lib/i18n";

export async function setLang(lang: Lang) {
  const store = await cookies();
  store.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
