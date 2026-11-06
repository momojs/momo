import {
  createRootRoute,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
  useLocation,
  useNavigate,
  useParams,
} from '@tanstack/react-router';

import { MotionUIThemeProvider } from '@momots/design/motion';
import { isSSR } from '@momots/host';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

import SearchDialog from '@/components/search';
import { i18n, localizeHref, resolveLocale } from '@/lib/i18n';
import { getLocaleEntryPath, localeEntryScript } from '@/lib/locale-entry';
import { translations } from '@/lib/ui-translations';
import motionTheme from '@/motion.theme';
import appCss from '@/styles/app.css?url';

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (isSSR()) return;
    const to = getLocaleEntryPath(location.pathname, '/', i18n);
    if (to) {
      throw redirect({ to, search: true, hash: true, replace: true });
    }
  },
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

  return (
    <html lang={locale} className='theme-neutral' suppressHydrationWarning>
      <head>
        <script
          id='momo-locale-entry'
          dangerouslySetInnerHTML={{
            __html: localeEntryScript(import.meta.env.BASE_URL),
          }}
        />
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
