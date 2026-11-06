import { createFileRoute } from '@tanstack/react-router';

import { resolveLocale } from '@/lib/i18n';
import { getLLMText, source } from '@/lib/source';

export const Route = createFileRoute('/$lang/llms-full.txt')({
  server: {
    handlers: {
      // biome-ignore lint/style/useNamingConvention: HTTP method required by TanStack Start.
      GET: async ({ params }) => {
        const scan = source
          .getPages(resolveLocale(params.lang))
          .map(getLLMText);
        const scanned = await Promise.all(scan);
        return new Response(scanned.join('\n\n'));
      },
    },
  },
});
