import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { resolveLocale } from '@/lib/i18n';

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params, location }) => {
    const lang = resolveLocale(params.lang);
    if (params.lang !== lang) {
      throw redirect({
        to: location.pathname.replace(`/${params.lang}`, `/${lang}`),
        search: true,
        hash: true,
        replace: true,
      });
    }
  },
  component: Outlet,
});
