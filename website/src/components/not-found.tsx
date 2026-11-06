import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';

import { baseOptions } from '@/lib/layout.shared';
import { useSiteLocale } from '@/lib/site-translations';

export function NotFound() {
  const locale = useSiteLocale();
  return (
    <HomeLayout {...baseOptions(locale)}>
      <DefaultNotFound />
    </HomeLayout>
  );
}
