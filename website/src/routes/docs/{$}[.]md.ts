import { createFileRoute, notFound } from '@tanstack/react-router';

import { getLLMText, markdownPathToSlugs, source } from '@/lib/source';

export const Route = createFileRoute('/docs/{$}.md')({
  server: {
    handlers: {
      // biome-ignore lint/style/useNamingConvention: HTTP method required by TanStack Start.
      GET: async ({ params }) => {
        const slugs = markdownPathToSlugs(params._splat?.split('/') ?? []);
        const page = source.getPage(slugs);
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
