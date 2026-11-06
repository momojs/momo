import { createFileRoute } from '@tanstack/react-router';

import { DocsContent, loadDocs } from '@/components/docs-page';

export const Route = createFileRoute('/docs/$')({
  component: DocsContent,
  loader: ({ params }) => loadDocs(params),
});
