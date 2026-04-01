"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "hi";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (value: Locale) => void;
};

const STORAGE_KEY = "physiocare_locale";

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {
    return;
  },
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "hi") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (value: Locale) => {
    setLocaleState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  };

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocaleContext() {
  return useContext(LocaleContext);
}
