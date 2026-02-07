"use client";

import * as React from "react";
import {
  createTranslator,
  defaultLocale,
  type Locale,
  type MessageKey,
} from "./core";

export interface I18nContextValue {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue>({
  locale: defaultLocale,
  t: createTranslator(defaultLocale).t,
});

export interface I18nProviderProps {
  locale?: Locale;
  children: React.ReactNode;
}

export function I18nProvider({
  locale = defaultLocale,
  children,
}: I18nProviderProps) {
  const value = React.useMemo(() => createTranslator(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return React.useContext(I18nContext);
}
