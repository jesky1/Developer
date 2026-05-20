"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

// === Types ===

export type Locale = "en" | "id";

interface TranslationValue {
  [key: string]: string | TranslationValue;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// === Context ===

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "goalzone_locale";
const COOKIE_KEY = "NEXT_LOCALE";
const DEFAULT_LOCALE: Locale = "id"; // Default to Indonesian since it's an Indonesian project

// === Translation Cache ===

let translationsCache: Record<Locale, TranslationValue> | null = null;

async function loadTranslations(): Promise<Record<Locale, TranslationValue>> {
  if (translationsCache) return translationsCache;

  const [enModule, idModule] = await Promise.all([
    import("./en.json"),
    import("./id.json"),
  ]);

  translationsCache = {
    en: enModule.default as TranslationValue,
    id: idModule.default as TranslationValue,
  };

  return translationsCache;
}

// === Helper: Get nested value from object using dot notation ===

function getNestedValue(obj: TranslationValue, path: string): string | undefined {
  const keys = path.split(".");
  let current: TranslationValue | string = obj;

  for (const key of keys) {
    if (typeof current === "string") return undefined;
    if (current[key] === undefined) return undefined;
    current = current[key] as TranslationValue | string;
  }

  return typeof current === "string" ? current : undefined;
}

// === Helper: Replace template parameters ===

function replaceParams(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    text
  );
}

// === Helper: Read locale from storage ===

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  // Check localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "id") return stored;
  } catch { }

  // Check cookie
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
    if (match) {
      const value = decodeURIComponent(match[1]);
      if (value === "en" || value === "id") return value;
    }
  } catch { }

  return DEFAULT_LOCALE;
}

// === Helper: Persist locale ===

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch { }

  try {
    document.cookie = `${COOKIE_KEY}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  } catch { }

  // Update html lang attribute
  try {
    document.documentElement.lang = locale;
  } catch { }
}

// === Provider Component ===

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Record<Locale, TranslationValue> | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load stored locale and translations on mount
  useEffect(() => {
    const storedLocale = getStoredLocale();

    loadTranslations().then((loaded) => {
      setTranslations(loaded);
      setLocaleState(storedLocale);
      setMounted(true);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  }, []);

  // Translation function with fallback
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!translations) return key;

      // Try current locale
      const value = getNestedValue(translations[locale], key);
      if (value !== undefined) return replaceParams(value, params);

      // Fallback to English
      if (locale !== "en") {
        const fallback = getNestedValue(translations.en, key);
        if (fallback !== undefined) return replaceParams(fallback, params);
      }

      // Return the key as last resort
      return key;
    },
    [locale, translations]
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  // Don't render children until translations are loaded
  // This prevents flash of untranslated content
  if (!mounted || !translations) {
    return null;
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

// === Hook ===

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

// === Utility: Get locale on server side (from cookies) ===

export function getLocaleFromHeaders(cookieHeader?: string): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  if (match) {
    const value = decodeURIComponent(match[1]);
    if (value === "en" || value === "id") return value;
  }
  return DEFAULT_LOCALE;
}
