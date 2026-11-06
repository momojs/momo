import { createFileRoute } from '@tanstack/react-router';

import { llms } from 'fumadocs-core/source';

import { withBasePath } from '@/lib/shared';
import { source } from '@/lib/source';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      // biome-ignore lint/style/useNamingConvention: HTTP method required by TanStack Start.
      GET() {
        return new Response(
          llms(source)
            .index('en')
            .replaceAll('](/en/', `](${withBasePath('/en/')}`),
        );
      },
    },
  },
});
