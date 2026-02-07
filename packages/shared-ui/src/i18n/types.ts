import type en from "./locales/en";

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export type MessageKey = keyof typeof en;
export type LocaleMessages = Record<MessageKey, string>;
export type LocaleDictionary = Record<Locale, LocaleMessages>;
