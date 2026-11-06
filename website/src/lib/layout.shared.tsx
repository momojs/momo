import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { resolveLocale } from './i18n';
import { appName, gitConfig } from './shared';

export function baseOptions(language?: string): BaseLayoutProps {
  return {
    i18n: true,
    nav: {
      // JSX supported
      title: appName,
      url: `/${resolveLocale(language)}`,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
