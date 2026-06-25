// Single source of truth for the supported locales. Shared by the request
// config, the locale cookie helpers, and the language switcher.
export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
