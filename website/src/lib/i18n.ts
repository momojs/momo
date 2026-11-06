import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  languages: ['en', 'zh'],
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
});

export type Locale = (typeof i18n.languages)[number];

/** Normalize browser language tags and fall back to the English language pack. */
export function resolveLocale(language?: string | null): Locale {
  const code = language?.trim().toLowerCase().split(/[-_]/)[0];
  return code === 'zh' ? 'zh' : i18n.defaultLanguage;
}

export function detectLocale(languages: readonly string[] = []): Locale {
  for (const language of languages) {
    const code = language.toLowerCase().split(/[-_]/)[0];
    if (i18n.languages.some((locale) => locale === code)) {
      return resolveLocale(code);
    }
  }
  return i18n.defaultLanguage;
}

/** Localize site links without changing external URLs, query strings or hashes. */
export function localizeHref(href: string, language?: string): string {
  if (!/^\/(?:docs(?:[/?#]|$)|(?:en|zh)(?:[/?#]|$)|(?:[?#]|$))/.test(href)) {
    return href;
  }
  const path = href.replace(/^\/(?:en|zh)(?=[/?#]|$)/, '') || '/';
  return `/${resolveLocale(language)}${path.startsWith('/') ? path : `/${path}`}`;
}
