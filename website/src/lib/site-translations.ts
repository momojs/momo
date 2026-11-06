import { useI18n } from 'fumadocs-ui/contexts/i18n';

import en from './locales/site.en.json';
import zh from './locales/site.zh.json';

export type SiteLocale = 'en' | 'zh';
export type SiteTranslator = (
  message: string,
  ...values: Array<string | number | null | undefined>
) => string;

const packs: Record<SiteLocale, Record<string, string>> = { en, zh };

function createTranslator(locale: SiteLocale): SiteTranslator {
  return (message, ...values) => {
    const translated = packs[locale][message] ?? packs.en[message] ?? message;
    return values.length
      ? translated.replace(/\{(\d+)\}/g, (placeholder, index: string) =>
          Number(index) < values.length
            ? String(values[Number(index)] ?? '')
            : placeholder,
        )
      : translated;
  };
}

const translators = { en: createTranslator('en'), zh: createTranslator('zh') };

export function useSiteLocale(): SiteLocale {
  return useI18n().locale === 'zh' ? 'zh' : 'en';
}

/** Stable per-language translator; absent packs fall back to English. */
export function useSiteTranslations(): SiteTranslator {
  return translators[useSiteLocale()];
}
