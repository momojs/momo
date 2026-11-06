import { i18n } from './i18n';

/**
 * Keep this function self-contained: it also runs in the document head before
 * the application bundle loads. The router uses it for client-side navigation.
 */
export function getLocaleEntryPath(
  pathname: string,
  basePath: string,
  config: { languages: readonly string[]; defaultLanguage: string },
) {
  const base = basePath.replace(/^\/+|\/+$/g, '');
  const prefix = base ? `/${base}` : '';
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return;
  const path = pathname.slice(prefix.length) || '/';
  if (!/^(?:\/|\/docs(?:\/.*)?)$/.test(path)) return;

  let preferred: string | null = null;
  try {
    preferred = localStorage.getItem('momo-locale');
  } catch {
    // Browser storage may be disabled; language detection still works.
  }
  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const candidates = preferred ? [preferred] : browserLanguages;
  let locale = config.defaultLanguage;
  for (const candidate of candidates) {
    const code = candidate?.trim().toLowerCase().split(/[-_]/)[0];
    if (code && config.languages.includes(code)) {
      locale = code;
      break;
    }
  }

  return `${prefix}/${locale}${path}`;
}

/** Blocking head script: never paint the fallback document during navigation. */
export function localeEntryScript(basePath: string) {
  const config = JSON.stringify({
    languages: i18n.languages,
    defaultLanguage: i18n.defaultLanguage,
  });
  const base = JSON.stringify(basePath).replaceAll('<', '\\u003c');
  return `;(() => {
    const target = (${getLocaleEntryPath.toString()})(location.pathname, ${base}, ${config});
    if (!target) return;
    const root = document.documentElement;
    const visibility = root.style.visibility;
    root.style.visibility = 'hidden';
    try {
      location.replace(target + location.search + location.hash);
    } catch {
      root.style.visibility = visibility;
    }
  })();`;
}
