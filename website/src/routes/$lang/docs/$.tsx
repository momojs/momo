import { createFileRoute } from '@tanstack/react-router';

import { DocsContent, loadDocs } from '@/components/docs-page';

export const Route = createFileRoute('/$lang/docs/$')({
  component: DocsContent,
  loader: ({ params }) => loadDocs(params),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? 'Documentation'} · momo` },
      { name: 'description', content: loaderData?.description },
    ],
  }),
});
