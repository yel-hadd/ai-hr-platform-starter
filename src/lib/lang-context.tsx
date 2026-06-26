"use client";

import { createContext, useContext } from "react";
import type { Lang } from "./i18n";
import { T } from "./i18n";

export const LangContext = createContext<Lang>("fr");

export function useLang() {
  return useContext(LangContext);
}

export function useT() {
  const lang = useLang();
  return T[lang];
}

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: React.ReactNode;
}) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}
