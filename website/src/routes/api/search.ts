import { createFileRoute } from '@tanstack/react-router';

import { createFromSource } from 'fumadocs-core/search/server';

import { searchOptions } from '@/lib/search';
import { source } from '@/lib/source';

const server = createFromSource(source, {
  localeMap: { en: searchOptions('en'), zh: searchOptions('zh') },
});

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      // biome-ignore lint/style/useNamingConvention: HTTP method required by TanStack Start.
      GET: () => server.staticGET(),
    },
  },
});
