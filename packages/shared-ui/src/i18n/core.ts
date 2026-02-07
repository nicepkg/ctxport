import en from "./locales/en";
import zh from "./locales/zh";
import {
  defaultLocale,
  locales,
  type Locale,
  type LocaleDictionary,
  type LocaleMessages,
  type MessageKey,
} from "./types";

export { defaultLocale, locales };
export type { Locale, MessageKey, LocaleMessages, LocaleDictionary };

export const messages: LocaleDictionary = {
  en,
  zh,
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

export const localeOptions = locales.map((locale) => ({
  locale,
  name: localeLabels[locale],
}));

export function isLocale(value?: string): value is Locale {
  return value === "en" || value === "zh";
}

export function normalizeLocale(value?: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function getLocaleFromPath(pathname: string): Locale | null {
  const match = /^\/(en|zh)(?=\/|$)/.exec(pathname);
  return match ? (match[1] as Locale) : null;
}

export function stripLocaleFromPath(pathname: string): string {
  return pathname.replace(/^\/(en|zh)(?=\/|$)/, "") || "/";
}

export function getLocaleFromNavigator(
  languages?: readonly string[] | string,
): Locale {
  const isStringArray = (value: unknown): value is readonly string[] => {
    if (!Array.isArray(value)) return false;
    return (value as unknown[]).every((item) => typeof item === "string");
  };

  const list: string[] = isStringArray(languages)
    ? [...languages]
    : [typeof languages === "string" ? languages : ""];
  return list.some((lang) => lang.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

export function formatMessage(
  template: string,
  params?: Record<string, string | number>,
) {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? "" : String(value);
  });
}

export function getMessage(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
) {
  const selected = messages[locale] ?? messages[defaultLocale];
  return formatMessage(
    selected[key] ?? messages[defaultLocale][key] ?? key,
    params,
  );
}

export function createTranslator(locale?: string) {
  const resolved = normalizeLocale(locale);
  return {
    locale: resolved,
    t: (key: MessageKey, params?: Record<string, string | number>) =>
      getMessage(resolved, key, params),
  };
}
