"use client";

import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

export type SiteLanguage = "en" | "es";

export const LANGUAGE_STORAGE_KEY = "yesbakery-language";
export const LANGUAGE_COOKIE_KEY = "yesbakery-language";

type LanguageContextValue = {
  language: SiteLanguage;
  setLanguage: (language: SiteLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistLanguage(language: SiteLanguage) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  if (typeof document !== "undefined") {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = language === "es" ? "es" : "en";
  }
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<SiteLanguage>("en");

  useEffect(() => {
    const storedLanguage =
      typeof window !== "undefined" ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;

    if (storedLanguage === "es" || storedLanguage === "en") {
      setLanguageState(storedLanguage);
      persistLanguage(storedLanguage);
      return;
    }

    persistLanguage("en");
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage);
        persistLanguage(nextLanguage);
      },
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
