import { createFileRoute } from '@tanstack/react-router';

import { llms } from 'fumadocs-core/source';

import { source } from '@/lib/source';
import { withBasePath } from '@/lib/shared';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET() {
        return new Response(
          llms(source).index().replaceAll('](/docs', `](${withBasePath('/docs')}`),
        );
      },
    },
  },
});
