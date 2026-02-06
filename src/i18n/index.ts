import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale, Translations } from "./types";
import { en } from "./en";
import { ptBR } from "./pt-BR";

const translations: Record<Locale, Translations> = {
  en,
  "pt-BR": ptBR,
};

interface I18nState {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      locale: "pt-BR",
      t: ptBR,
      setLocale: (locale: Locale) =>
        set({ locale, t: translations[locale] }),
    }),
    {
      name: "supersend-locale",
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.locale];
        }
      },
    }
  )
);

export type { Locale, Translations };
