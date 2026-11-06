import { createFileRoute } from '@tanstack/react-router';

import { Home, homeHead } from '@/components/home-page';

export const Route = createFileRoute('/$lang/')({
  head: ({ params }) => homeHead(params.lang),
  component: Home,
});
