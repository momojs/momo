import { createFileRoute } from '@tanstack/react-router';

import { llms } from 'fumadocs-core/source';

import { resolveLocale } from '@/lib/i18n';
import { withBasePath } from '@/lib/shared';
import { source } from '@/lib/source';

export const Route = createFileRoute('/$lang/llms.txt')({
  server: {
    handlers: {
      // biome-ignore lint/style/useNamingConvention: HTTP method required by TanStack Start.
      GET({ params }) {
        return new Response(
          llms(source)
            .index(resolveLocale(params.lang))
            .replaceAll(
              `](/${resolveLocale(params.lang)}/`,
              `](${withBasePath(`/${resolveLocale(params.lang)}/`)}`,
            ),
        );
      },
    },
  },
});
