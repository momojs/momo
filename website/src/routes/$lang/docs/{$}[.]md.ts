import { createFileRoute, notFound } from '@tanstack/react-router';

import { resolveLocale } from '@/lib/i18n';
import { getLLMText, markdownPathToSlugs, source } from '@/lib/source';

export const Route = createFileRoute('/$lang/docs/{$}.md')({
  server: {
    handlers: {
      // biome-ignore lint/style/useNamingConvention: HTTP method required by TanStack Start.
      GET: async ({ params }) => {
        const slugs = markdownPathToSlugs(params._splat?.split('/') ?? []);
        const page = source.getPage(slugs, resolveLocale(params.lang));
        if (!page) throw notFound();

        return new Response(await getLLMText(page), {
          headers: {
            'Content-Type': 'text/markdown',
          },
        });
      },
    },
  },
});
