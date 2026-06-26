import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type OrgSettingsValues = { currency: string; timezone: string };

// Supported choices for the Settings form. Currency codes are ISO-4217 (used by
// Intl.NumberFormat); timezones are IANA names (used by Intl.DateTimeFormat).
export const CURRENCIES = ["MAD", "EUR", "USD", "GBP", "AED", "SAR"] as const;
export const TIMEZONES = [
  "UTC",
  "Africa/Casablanca",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
] as const;

export const DEFAULT_ORG_SETTINGS: OrgSettingsValues = {
  currency: "MAD",
  timezone: "UTC",
};

const SINGLETON_ID = "singleton";

// Reads the single org-settings row, creating it with defaults on first access.
// `cache` dedupes the query within a single server request.
export const getOrgSettings = cache(async (): Promise<OrgSettingsValues> => {
  const row = await prisma.orgSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
    select: { currency: true, timezone: true },
  });
  return row;
});

export async function writeOrgSettings(values: OrgSettingsValues) {
  await prisma.orgSettings.upsert({
    where: { id: SINGLETON_ID },
    update: values,
    create: { id: SINGLETON_ID, ...values },
  });
}
