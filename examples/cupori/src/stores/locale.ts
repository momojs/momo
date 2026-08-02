import { create } from 'zustand';

import type { Locale } from '@/paraglide/runtime.js';
import {
  getLocale,
  getTextDirection,
  setLocale as setParaglideLocale,
} from '@/paraglide/runtime.js';

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
}

export function applyDocumentLocale(locale = getLocale()) {
  document.documentElement.lang = locale;
  document.documentElement.dir = getTextDirection(locale);
}

export const useLocaleStore = create<LocaleStore>((set, get) => ({
  locale: getLocale(),
  setLocale: async (locale) => {
    if (locale === get().locale) return;

    await setParaglideLocale(locale, { reload: false });
    applyDocumentLocale(locale);
    set({ locale });
  },
}));
