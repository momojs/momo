import { useEffect } from 'react';

import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useNavigate,
  useParams,
} from '@tanstack/react-router';

import { MotionUIThemeProvider } from '@momots/design/motion';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

import SearchDialog from '@/components/search';
import { detectLocale, localizeHref, resolveLocale } from '@/lib/i18n';
import { translations } from '@/lib/ui-translations';
import motionTheme from '@/motion.theme';
import appCss from '@/styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'momo',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { lang } = useParams({ strict: false });
  const locale = resolveLocale(lang);
  const location = useLocation();
  const navigate = useNavigate();

  // Static entry points render in English, then use the browser's language.
  // Explicit locale URLs always win and are stable during hydration.
  useEffect(() => {
    if (lang || !/^(?:\/|\/docs(?:\/.*)?)$/.test(location.pathname)) return;
    let preferred: string | null = null;
    try {
      preferred = localStorage.getItem('momo-locale');
    } catch {
      /* Storage may be unavailable. */
    }
    const target = preferred
      ? resolveLocale(preferred)
      : detectLocale(navigator.languages);
    void navigate({
      to: localizeHref(location.pathname, target),
      search: true,
      hash: true,
      replace: true,
    });
  }, [lang, location.pathname, navigate]);

  return (
    <html lang={locale} className='theme-neutral' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className='flex flex-col min-h-screen'>
        <MotionUIThemeProvider theme={motionTheme}>
          <RootProvider
            search={{ SearchDialog }}
            i18n={{
              ...i18nProvider(translations, locale),
              onLocaleChange: (next) => {
                const target = resolveLocale(next);
                try {
                  localStorage.setItem('momo-locale', target);
                } catch {
                  /* Storage may be unavailable. */
                }
                void navigate({
                  to: localizeHref(location.pathname, target),
                  search: true,
                  // Translated headings have different generated anchor IDs.
                  hash: target === locale ? true : '',
                });
              },
            }}
          >
            <Outlet />
          </RootProvider>
        </MotionUIThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
